const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menuScreen = document.getElementById("menuScreen");
const gameSection = document.querySelector(".game-section");
const gameOverScreen = document.getElementById("gameOverScreen");
const playBtn = document.getElementById("playBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const soundToggle = document.getElementById("soundToggle");
const damageFlash = document.getElementById("damageFlash");

const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const comboValue = document.getElementById("comboValue");
const menuBest = document.getElementById("menuBest");
const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

const STORAGE_KEY = "heroRushHighScore";
let highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);

const state = {
    running: false,
    gameOver: false,
    score: 0,
    combo: 1,
    nearMissStreak: 0,
    spawnTimer: 0,
    spawnInterval: 0.95,
    elapsed: 0,
    slowMo: 0,
    shake: 0,
    particles: [],
    hazards: [],
    floaters: [],
    lastTime: 0
};

const input = {
    left: false,
    right: false,
    interacted: false,
    soundOn: true,
    nearMissCooldown: 0
};

const player = {
    x: canvas.width / 2,
    y: canvas.height - 92,
    w: 58,
    h: 78,
    vx: 0,
    accel: 2200,
    drag: 1800,
    maxSpeed: 490,
    idleT: 0
};

// Lightweight synth audio via WebAudio (no heavy assets, no autoplay before interaction)
const audio = {
    ctx: null,
    master: null,
    ambience: null,
    ambienceNodes: [],
    musicTimer: null,
    musicStep: 0,
    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        this.master = this.ctx.createGain();
        this.master.gain.value = input.soundOn ? 0.62 : 0;
        this.master.connect(this.ctx.destination);
    },
    resume() {
        this.init();
        if (!this.ctx) return Promise.resolve();
        return this.ctx.state === "suspended" ? this.ctx.resume() : Promise.resolve();
    },
    tone(freq, duration, volume, wave = "sine", when = 0, endFreq = null) {
        if (!this.ctx || !this.master || !input.soundOn) return;
        const t = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, t);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + duration);
        filter.type = "lowpass";
        filter.frequency.value = wave === "sawtooth" ? 850 : 2600;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.master);
        osc.start(t); osc.stop(t + duration + 0.04);
    },
    beep({ freq = 440, type = "sine", dur = 0.1, gain = 0.18, slide = 1, delay = 0 }) {
        this.tone(freq, dur, gain, type, delay, freq * slide);
    },
    startAmbience() {
        if (!input.soundOn || this.musicTimer) return;
        this.resume().then(() => {
            if (!this.ctx || !input.soundOn || this.musicTimer) return;
            // Audible original space-arcade soundtrack: warm bass pulse + repeating synth arpeggio.
            const bass = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            const bassFilter = this.ctx.createBiquadFilter();
            bass.type = "triangle";
            bass.frequency.value = 55;
            bassFilter.type = "lowpass";
            bassFilter.frequency.value = 180;
            bassGain.gain.value = 0.20;
            bass.connect(bassFilter); bassFilter.connect(bassGain); bassGain.connect(this.master);
            bass.start();
            this.ambienceNodes.push(bass, bassFilter, bassGain);
            const notes = [220, 261.63, 329.63, 392, 329.63, 293.66, 261.63, 196];
            this.musicStep = 0;
            const playStep = () => {
                if (!input.soundOn || !this.ctx || this.ctx.state !== "running") return;
                const n = notes[this.musicStep % notes.length];
                this.tone(n, 0.42, 0.105, "sine");
                if (this.musicStep % 4 === 0) this.tone(n / 2, 0.62, 0.15, "triangle");
                if (this.musicStep % 2 === 1) this.tone(n * 2, 0.18, 0.035, "triangle", 0.08);
                this.musicStep++;
            };
            playStep();
            this.musicTimer = window.setInterval(playStep, 460);
            this.ambience = true;
        }).catch(() => {});
    },
    stopAmbience() {
        if (this.musicTimer) window.clearInterval(this.musicTimer);
        this.musicTimer = null;
        this.ambience = null;
        const nodes = this.ambienceNodes.slice();
        this.ambienceNodes = [];
        nodes.forEach(node => {
            try { if (node.stop) node.stop(); node.disconnect(); } catch (_) {}
        });
    },
    setEnabled(enabled) {
        input.soundOn = enabled;
        this.resume().then(() => {
            if (!this.ctx || !this.master) return;
            this.master.gain.setTargetAtTime(enabled ? 0.62 : 0, this.ctx.currentTime, 0.04);
            if (enabled) this.startAmbience();
            if (!enabled) this.stopAmbience();
        }).catch(() => {});
    },
    hit() {
        this.beep({ freq: 210, type: "sawtooth", dur: 0.24, gain: 0.32, slide: 0.34 });
        this.beep({ freq: 92, type: "triangle", dur: 0.42, gain: 0.3, slide: 0.52, delay: 0.025 });
        this.beep({ freq: 720, type: "square", dur: 0.055, gain: 0.09, slide: 0.28, delay: 0.015 });
    },
    gameOver() {
        this.stopAmbience();
        this.beep({ freq: 440, type: "sawtooth", dur: 0.38, gain: 0.22, slide: 0.48 });
        this.beep({ freq: 220, type: "triangle", dur: 0.75, gain: 0.25, slide: 0.42, delay: 0.12 });
        this.beep({ freq: 110, type: "sine", dur: 0.95, gain: 0.2, slide: 0.62, delay: 0.22 });
    },
    ping() { this.beep({ freq: 880, type: "triangle", dur: 0.11, gain: 0.12, slide: 1.18 }); },
    swoosh() { this.beep({ freq: 620, type: "sine", dur: 0.12, gain: 0.12, slide: 1.65 }); }
};

const hazardTypes = ["meteor", "blade", "orb", "fireball", "drone"];

// Static skyline silhouettes are generated once to keep the render loop lightweight.
// Star positions are generated once so the space scene stays smooth and inexpensive.

function updateScoreDisplays() {
    scoreValue.textContent = String(Math.floor(state.score)).padStart(4, "0");
    bestValue.textContent = String(highScore).padStart(4, "0");
    comboValue.textContent = `x${state.combo.toFixed(1)}`;
    menuBest.textContent = highScore;
}

function setScreen(mode) {
    menuScreen.classList.toggle("active", mode === "menu");
    gameSection.classList.toggle("active", mode === "game" || mode === "gameOver");
    gameOverScreen.classList.toggle("active", mode === "gameOver");
    document.body.classList.toggle("playing", mode !== "menu");
    input.left = false;
    input.right = false;
}

function startGame() {
    input.interacted = true;
    audio.resume().then(() => {
        if (state.running && input.soundOn) audio.startAmbience();
    }).catch(() => {});

    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.combo = 1;
    state.nearMissStreak = 0;
    state.spawnTimer = 0;
    state.spawnInterval = 0.95;
    state.elapsed = 0;
    state.slowMo = 0;
    state.shake = 0;
    state.particles = [];
    state.hazards = [];
    state.floaters = createFloaters(34);

    player.x = canvas.width / 2;
    player.vx = 0;

    setScreen("game");
    updateScoreDisplays();
}

function endGame() {
    state.running = false;
    state.gameOver = true;
    audio.hit();
    audio.gameOver();
    damageFlash.classList.remove("show");
    void damageFlash.offsetWidth;
    damageFlash.classList.add("show");

    finalScore.textContent = Math.floor(state.score);
    if (state.score > highScore) {
        highScore = Math.floor(state.score);
        localStorage.setItem(STORAGE_KEY, String(highScore));
    }
    finalBest.textContent = highScore;
    updateScoreDisplays();
    setScreen("gameOver");
}

function createFloaters(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
        arr.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2.5 + 1,
            vy: Math.random() * 20 + 8,
            alpha: Math.random() * 0.35 + 0.08
        });
    }
    return arr;
}

function spawnHazard() {
    const progress = Math.min(1, state.elapsed / 90);
    const type = hazardTypes[(Math.random() * hazardTypes.length) | 0];
    const size = 26 + Math.random() * 24;
    state.hazards.push({
        type,
        x: 20 + Math.random() * (canvas.width - 40),
        y: -70,
        size,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() * 3 + 2) * (Math.random() > 0.5 ? 1 : -1),
        speedY: 210 + Math.random() * 110 + progress * 220,
        driftX: (Math.random() - 0.5) * (42 + progress * 32),
        trail: [],
        nearMissed: false
    });
}

function updatePlayer(dt) {
    player.idleT += dt;

    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;

    if (dir !== 0) {
        player.vx += dir * player.accel * dt;
    } else {
        const dragStep = player.drag * dt;
        if (Math.abs(player.vx) <= dragStep) player.vx = 0;
        else player.vx -= Math.sign(player.vx) * dragStep;
    }

    player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));
    player.x += player.vx * dt;
    const margin = player.w / 2 + 6;
    player.x = Math.max(margin, Math.min(canvas.width - margin, player.x));
}

function addParticles(x, y, color, count, spread = 1) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 180 + 70) * spread;
        state.particles.push({
            x,
            y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 0.5 + Math.random() * 0.45,
            t: 0,
            color,
            size: Math.random() * 3 + 2
        });
    }
}

function updateHazards(dt) {
    const hitRadius = player.w * 0.34;

    for (let i = state.hazards.length - 1; i >= 0; i--) {
        const h = state.hazards[i];
        h.y += h.speedY * dt;
        h.x += h.driftX * dt;
        h.rotation += h.spin * dt;

        if (h.x < 12 || h.x > canvas.width - 12) h.driftX *= -1;

        h.trail.push({ x: h.x, y: h.y, alpha: 0.45 });
        if (h.trail.length > 8) h.trail.shift();

        const dx = h.x - player.x;
        const dy = h.y - (player.y - 20);
        const dist = Math.hypot(dx, dy);

        const nearRange = hitRadius + h.size * 0.62 + 24;
        if (!h.nearMissed && dist < nearRange && dist > hitRadius + h.size * 0.58 && input.nearMissCooldown <= 0) {
            h.nearMissed = true;
            input.nearMissCooldown = 0.14;
            state.nearMissStreak++;
            state.combo = Math.min(5, 1 + state.nearMissStreak * 0.15);
            state.score += 3 * state.combo;
            audio.swoosh();
            addParticles(h.x, h.y, "#6ef9ff", 9, 0.65);
        }

        if (dist < hitRadius + h.size * 0.55) {
            state.slowMo = 0.3;
            state.shake = 13;
            addParticles(player.x, player.y - 14, "#ff625d", 42, 1.6);
            addParticles(player.x, player.y - 14, "#ffd775", 24, 1.2);
            endGame();
            return;
        }

        if (h.y - h.size > canvas.height + 20) {
            state.hazards.splice(i, 1);
            state.score += 1 * state.combo;
            if ((Math.floor(state.score) % 7) === 0) audio.ping();
        }
    }
}

function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy = p.vy * 0.98 + 34 * dt;
        if (p.t >= p.life) state.particles.splice(i, 1);
    }

    for (const f of state.floaters) {
        f.y += f.vy * dt;
        if (f.y > canvas.height + 5) {
            f.y = -5;
            f.x = Math.random() * canvas.width;
        }
    }
}

function updateDifficulty(dt) {
    state.elapsed += dt;
    state.spawnTimer += dt;
    const progress = Math.min(1, state.elapsed / 75);
    state.spawnInterval = 0.95 - progress * 0.58;
    if (state.spawnTimer > state.spawnInterval) {
        state.spawnTimer = 0;
        spawnHazard();
        if (Math.random() < progress * 0.28) spawnHazard();
    }

    state.combo = Math.max(1, state.combo - dt * 0.055);
    if (state.combo <= 1.02) state.nearMissStreak = 0;
    input.nearMissCooldown = Math.max(0, input.nearMissCooldown - dt);
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    sky.addColorStop(0, "#0c1a32");
    sky.addColorStop(.42, "#080f22");
    sky.addColorStop(1, "#030713");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Distant nebula clouds.
    const nebula = ctx.createRadialGradient(110, 180, 8, 110, 180, 245);
    nebula.addColorStop(0, "rgba(35,116,164,.19)");
    nebula.addColorStop(.55, "rgba(35,73,132,.08)");
    nebula.addColorStop(1, "rgba(35,73,132,0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // A far-off ringed planet gives the flight scene a sense of scale.
    ctx.save();
    ctx.translate(322, 225);
    ctx.rotate(-.24);
    ctx.strokeStyle = "rgba(112,190,218,.18)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 74, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    const planet = ctx.createRadialGradient(-19, -22, 2, 0, 0, 54);
    planet.addColorStop(0, "#527b96");
    planet.addColorStop(.5, "#203c5a");
    planet.addColorStop(1, "#0a1428");
    ctx.fillStyle = planet;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(135,206,228,.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 74, 22, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();

    // Stars drift down at different speeds to create parallax.
    for (const f of state.floaters) {
        ctx.globalAlpha = f.alpha + Math.sin(state.elapsed * 2 + f.x) * .07;
        ctx.fillStyle = "#b9efff";
        ctx.shadowColor = "#63d9ff";
        ctx.shadowBlur = f.r * 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Faint flight-lane perspective lines.
    ctx.save();
    ctx.strokeStyle = "rgba(83,177,215,.075)";
    ctx.lineWidth = 1;
    const centerX = canvas.width / 2;
    for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * 4, 355);
        ctx.lineTo(centerX + i * 73, canvas.height);
        ctx.stroke();
    }
    const drift = (state.elapsed * 72) % 54;
    for (let y = 365 + drift; y < canvas.height + 50; y += 54) {
        ctx.globalAlpha = .08 + (y - 365) / canvas.height * .1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Edge vignette focuses attention on the rocket and incoming hazards.
    const vignette = ctx.createRadialGradient(centerX, canvas.height * .48, 100, centerX, canvas.height * .48, 430);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,2,12,.68)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHero() {
    const moving = Math.min(1, Math.abs(player.vx) / player.maxSpeed);
    const bob = Math.sin(player.idleT * 5) * 1.8;
    const lean = Math.max(-.22, Math.min(.22, player.vx / player.maxSpeed * .22));
    const x = player.x;
    const y = player.y + bob;

    ctx.save();
    ctx.translate(x, y - 7);
    ctx.rotate(lean);

    // Blue engine aura and exhaust plume.
    const aura = ctx.createRadialGradient(0, 34, 2, 0, 34, 48);
    aura.addColorStop(0, "rgba(73,207,255,.22)");
    aura.addColorStop(1, "rgba(73,207,255,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(-50, -5, 100, 90);

    const flameLength = 30 + Math.sin(player.idleT * 34) * 7 + moving * 10;
    const flame = ctx.createLinearGradient(0, 35, 0, 35 + flameLength);
    flame.addColorStop(0, "#eaffff");
    flame.addColorStop(.25, "#75eaff");
    flame.addColorStop(.65, "#398dff");
    flame.addColorStop(1, "rgba(74,100,255,0)");
    ctx.shadowColor = "#42cfff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-10, 34);
    ctx.quadraticCurveTo(-13, 47, 0, 35 + flameLength);
    ctx.quadraticCurveTo(13, 47, 10, 34);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rocket fins.
    const finGrad = ctx.createLinearGradient(-26, 0, 26, 0);
    finGrad.addColorStop(0, "#c65d4e");
    finGrad.addColorStop(.5, "#ffb17a");
    finGrad.addColorStop(1, "#a84948");
    ctx.fillStyle = finGrad;
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.lineTo(-29, 39);
    ctx.lineTo(-25, 43);
    ctx.lineTo(-4, 32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 14);
    ctx.lineTo(29, 39);
    ctx.lineTo(25, 43);
    ctx.lineTo(4, 32);
    ctx.closePath();
    ctx.fill();

    // Main rocket fuselage, pointed nose at the top.
    const hull = ctx.createLinearGradient(-19, 0, 19, 0);
    hull.addColorStop(0, "#6e879d");
    hull.addColorStop(.22, "#d7e7ed");
    hull.addColorStop(.52, "#f8ffff");
    hull.addColorStop(.78, "#b7d0dc");
    hull.addColorStop(1, "#536f89");
    ctx.shadowColor = "#65dfff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.bezierCurveTo(10, -43, 19, -20, 18, 8);
    ctx.lineTo(14, 35);
    ctx.lineTo(-14, 35);
    ctx.lineTo(-18, 8);
    ctx.bezierCurveTo(-19, -20, -10, -43, 0, -54);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nose highlight and hull panels.
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, -45);
    ctx.quadraticCurveTo(-13, -16, -11, 18);
    ctx.stroke();
    ctx.fillStyle = "#f17d58";
    ctx.fillRect(-17, 12, 34, 7);
    ctx.fillStyle = "rgba(49,77,102,.45)";
    ctx.fillRect(12, -7, 3, 17);

    // Glowing cockpit window.
    const glass = ctx.createRadialGradient(-4, -22, 1, 0, -20, 15);
    glass.addColorStop(0, "#d8ffff");
    glass.addColorStop(.3, "#6be9ff");
    glass.addColorStop(1, "#174d77");
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(0, -21, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#52788e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -27);
    ctx.lineTo(-1, -31);
    ctx.stroke();

    // Engine nozzle.
    ctx.fillStyle = "#263b50";
    roundRect(-9, 30, 18, 10, 3);
    ctx.fill();
    ctx.strokeStyle = "#9eb9c8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tiny navigation lights.
    ctx.fillStyle = "#ffb078";
    ctx.shadowColor = "#ff8e61";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-22, 34, 2, 0, Math.PI * 2);
    ctx.arc(22, 34, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawHazard(h) {
    const glowColor = hazardGlowColor(h.type);
    // Fading motion trail.
    for (let i = 0; i < h.trail.length; i++) {
        const t = h.trail[i];
        const progress = (i + 1) / h.trail.length;
        ctx.globalAlpha = progress * .16;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(t.x, t.y, h.size * (.16 + progress * .2), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft halo behind each hazard.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = .24;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.size * .48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rotation);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;

    if (h.type === "drone") {
        drawDroneHazard(h.size);
    } else if (h.type === "meteor") {
        const rock = ctx.createRadialGradient(-h.size * .14, -h.size * .18, 2, 0, 0, h.size * .5);
        rock.addColorStop(0, "#fff0bd");
        rock.addColorStop(.32, "#ffad55");
        rock.addColorStop(1, "#bd3a37");
        ctx.fillStyle = rock;
        ctx.beginPath();
        ctx.arc(0, 0, h.size * .46, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,235,183,.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, h.size * .34, .3, 2.5);
        ctx.stroke();
        ctx.fillStyle = "#fff4cb";
        ctx.beginPath();
        ctx.arc(-h.size * .1, -h.size * .12, h.size * .09, 0, Math.PI * 2);
        ctx.fill();
        // Pitted impact craters and a hot fractured edge.
        ctx.fillStyle = "rgba(65,24,28,.42)";
        [[-.22,-.08,.09],[.17,.2,.12],[-.04,.28,.055]].forEach(([cx,cy,cr]) => {
            ctx.beginPath(); ctx.arc(h.size*cx,h.size*cy,h.size*cr,0,Math.PI*2); ctx.fill();
        });
        ctx.strokeStyle = "rgba(255,213,151,.42)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0,0,h.size*.43,-2.6,-.55); ctx.stroke();
    } else if (h.type === "blade") {
        const metal = ctx.createLinearGradient(-h.size * .5, -h.size * .5, h.size * .5, h.size * .5);
        metal.addColorStop(0, "#ffffff");
        metal.addColorStop(.45, "#9ddfff");
        metal.addColorStop(1, "#526bba");
        ctx.fillStyle = metal;
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -h.size * .08);
            ctx.quadraticCurveTo(h.size * .2, -h.size * .24, h.size * .58, -h.size * .08);
            ctx.lineTo(h.size * .19, h.size * .12);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = "#d9faff";
        ctx.beginPath();
        ctx.arc(0, 0, h.size * .16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3ba9ef";
        ctx.lineWidth = 2;
        ctx.stroke();
    } else if (h.type === "orb") {
        const orb = ctx.createRadialGradient(-h.size * .14, -h.size * .16, 1, 0, 0, h.size * .52);
        orb.addColorStop(0, "#ffffff");
        orb.addColorStop(.24, "#b9ffff");
        orb.addColorStop(.62, "#38cfff");
        orb.addColorStop(1, "#1450bd");
        ctx.fillStyle = orb;
        ctx.beginPath();
        ctx.arc(0, 0, h.size * .48, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(214,255,255,.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, h.size * .58, h.size * .22, .6, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        const fire = ctx.createRadialGradient(-h.size * .08, -h.size * .12, 1, 0, 0, h.size * .48);
        fire.addColorStop(0, "#fff6b2");
        fire.addColorStop(.28, "#ffb24d");
        fire.addColorStop(.7, "#ff4c45");
        fire.addColorStop(1, "#9c174a");
        ctx.fillStyle = fire;
        ctx.beginPath();
        ctx.arc(0, 0, h.size * .44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff0a0";
        ctx.beginPath();
        ctx.arc(-h.size * .08, -h.size * .08, h.size * .15, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}


function drawDroneHazard(size) {
    // Compact hostile interceptor: swept wings, armored fuselage and twin engine glow.
    ctx.save();
    ctx.scale(size / 38, size / 38);
    const wing = ctx.createLinearGradient(0, -18, 0, 18);
    wing.addColorStop(0, "#d8f2ff");
    wing.addColorStop(.42, "#6689a8");
    wing.addColorStop(1, "#263c59");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(35, 12);
    ctx.lineTo(31, 18);
    ctx.lineTo(7, 9);
    ctx.lineTo(0, 16);
    ctx.lineTo(-7, 9);
    ctx.lineTo(-31, 18);
    ctx.lineTo(-35, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(215,245,255,.65)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const body = ctx.createLinearGradient(-8, 0, 8, 0);
    body.addColorStop(0, "#334d6a");
    body.addColorStop(.48, "#e7f6ff");
    body.addColorStop(1, "#496987");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.quadraticCurveTo(9, -8, 7, 15);
    ctx.lineTo(0, 20);
    ctx.lineTo(-7, 15);
    ctx.quadraticCurveTo(-9, -8, 0, -25);
    ctx.fill();
    ctx.fillStyle = "#6beaff";
    ctx.shadowColor = "#45dfff";
    ctx.shadowBlur = 13;
    ctx.beginPath();
    ctx.ellipse(0, -5, 4.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (const side of [-1, 1]) {
        ctx.fillStyle = "#ff9b63";
        ctx.shadowColor = "#ff754c";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(side * 25, 13, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function hazardGlowColor(type) {
    if (type === "drone") return "#70eaff";
    if (type === "meteor") return "#ff9f59";
    if (type === "blade") return "#b7e1ff";
    if (type === "orb") return "#56f3ff";
    return "#ff4d66";
}

function drawParticles() {
    for (const p of state.particles) {
        const a = 1 - p.t / p.life;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function draw() {
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    for (const h of state.hazards) drawHazard(h);
    drawHero();
    drawParticles();

    ctx.restore();

    if (state.shake > 0) state.shake *= 0.88;
}

function loop(ts) {
    if (!state.lastTime) state.lastTime = ts;
    let dt = Math.min(0.033, (ts - state.lastTime) / 1000);
    state.lastTime = ts;

    if (state.slowMo > 0) {
        dt *= 0.42;
        state.slowMo -= dt;
    }

    if (state.running) {
        updatePlayer(dt);
        updateDifficulty(dt);
        updateHazards(dt);
        updateParticles(dt);
        updateScoreDisplays();
    } else {
        updateParticles(dt);
    }

    draw();
    requestAnimationFrame(loop);
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function setInput(active, direction) {
    if (direction === "left") input.left = active;
    if (direction === "right") input.right = active;
}

window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) setInput(true, "left");
    if (["ArrowRight", "d", "D"].includes(e.key)) setInput(true, "right");
    if (e.key === " " && !state.running) startGame();
});

window.addEventListener("keyup", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) setInput(false, "left");
    if (["ArrowRight", "d", "D"].includes(e.key)) setInput(false, "right");
});

function bindTouchButton(btn, direction) {
    const down = (ev) => {
        ev.preventDefault();
        input.interacted = true;
        audio.resume();
        setInput(true, direction);
    };
    const up = (ev) => {
        ev.preventDefault();
        setInput(false, direction);
    };
    btn.addEventListener("touchstart", down, { passive: false });
    btn.addEventListener("touchend", up, { passive: false });
    btn.addEventListener("touchcancel", up, { passive: false });
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
}

bindTouchButton(leftBtn, "left");
bindTouchButton(rightBtn, "right");

playBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
menuBtn.addEventListener("click", () => {
    state.running = false;
    state.gameOver = false;
    if (input.soundOn) audio.startAmbience();
    state.hazards = [];
    state.particles = [];
    setScreen("menu");
});

soundToggle.addEventListener("click", () => {
    input.interacted = true;
    audio.setEnabled(!input.soundOn);
    soundToggle.querySelector("span:last-child").textContent = input.soundOn ? "SOUND ON" : "SOUND OFF";
    soundToggle.setAttribute("aria-pressed", String(input.soundOn));
});

// Initial UI setup
updateScoreDisplays();
setScreen("menu");
state.floaters = createFloaters(34);
requestAnimationFrame(loop);
