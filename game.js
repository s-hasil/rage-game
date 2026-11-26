const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menuScreen = document.getElementById("menuScreen");
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
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.26;
        this.master.connect(this.ctx.destination);
    },
    beep({ freq = 440, type = "sine", dur = 0.1, gain = 0.18, slide = 1, delay = 0, q = 8 }) {
        if (!input.soundOn || !this.ctx) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = "lowpass";
        filter.frequency.value = 2200;
        filter.Q.value = q;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * slide), t + dur);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(filter);
        filter.connect(g);
        g.connect(this.master);

        osc.start(t);
        osc.stop(t + dur + 0.02);
    },
    hit() {
        this.beep({ freq: 180, type: "sawtooth", dur: 0.16, gain: 0.22, slide: 0.55 });
        this.beep({ freq: 110, type: "triangle", dur: 0.24, gain: 0.18, slide: 0.7, delay: 0.04 });
    },
    gameOver() {
        this.beep({ freq: 320, type: "square", dur: 0.18, gain: 0.16, slide: 0.7 });
        this.beep({ freq: 190, type: "sawtooth", dur: 0.28, gain: 0.16, slide: 0.45, delay: 0.09 });
    },
    ping() {
        this.beep({ freq: 860, type: "triangle", dur: 0.09, gain: 0.13, slide: 1.15 });
    },
    swoosh() {
        this.beep({ freq: 620, type: "sine", dur: 0.06, gain: 0.1, slide: 1.5 });
    }
};

const hazardTypes = ["meteor", "blade", "orb", "fireball"];

// Static skyline silhouettes are generated once to keep the render loop lightweight.
const cityBuildings = Array.from({ length: 24 }, (_, i) => {
    const height = 48 + Math.random() * 116;
    return {
        x: i * 19 - 5,
        w: 13 + Math.random() * 13,
        h: height,
        hue: Math.random() > 0.5 ? "cyan" : "violet",
        windows: Array.from({ length: Math.max(2, Math.floor((height - 14) / 12)) }, () => Math.random() > 0.42)
    };
});

function updateScoreDisplays() {
    scoreValue.textContent = Math.floor(state.score);
    bestValue.textContent = highScore;
    comboValue.textContent = `x${state.combo.toFixed(1)}`;
    menuBest.textContent = highScore;
}

function setScreen(mode) {
    menuScreen.classList.remove("active");
    gameOverScreen.classList.remove("active");
    if (mode === "menu") menuScreen.classList.add("active");
    if (mode === "gameOver") gameOverScreen.classList.add("active");
}

function startGame() {
    input.interacted = true;
    audio.init();
    if (audio.ctx.state === "suspended") audio.ctx.resume();

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

    setScreen("none");
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
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#101d43");
    sky.addColorStop(0.48, "#10142d");
    sky.addColorStop(1, "#050817");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Distant neon skyline.
    const horizon = 405;
    ctx.save();
    for (const b of cityBuildings) {
        const top = horizon - b.h;
        const body = ctx.createLinearGradient(b.x, top, b.x + b.w, horizon);
        body.addColorStop(0, "#111d3d");
        body.addColorStop(1, "#080e25");
        ctx.fillStyle = body;
        ctx.fillRect(b.x, top, b.w, b.h);
        ctx.fillStyle = b.hue === "cyan" ? "rgba(66,226,255,.48)" : "rgba(204,93,255,.42)";
        ctx.fillRect(b.x + 2, top + 8, 1.5, Math.max(8, b.h - 14));
        for (let row = 0; row < b.windows.length; row++) {
            if (b.windows[row]) {
                ctx.globalAlpha = 0.28 + Math.sin(state.elapsed * 2 + row + b.x) * 0.08;
                ctx.fillStyle = row % 2 ? "#60eaff" : "#ff9ee9";
                ctx.fillRect(b.x + 4, top + 10 + row * 12, 3, 5);
            }
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Atmospheric glow at the skyline.
    const horizonGlow = ctx.createRadialGradient(canvas.width / 2, horizon, 5, canvas.width / 2, horizon, 260);
    horizonGlow.addColorStop(0, "rgba(35,190,255,.16)");
    horizonGlow.addColorStop(1, "rgba(35,190,255,0)");
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 180, canvas.width, 360);

    // A perspective floor gives the scene a subtle 2.5D arcade feel.
    const floor = ctx.createLinearGradient(0, horizon, 0, canvas.height);
    floor.addColorStop(0, "rgba(14,28,58,.18)");
    floor.addColorStop(1, "rgba(3,7,20,.95)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.clip();
    ctx.strokeStyle = "rgba(60,205,255,.13)";
    ctx.lineWidth = 1;
    const centerX = canvas.width / 2;
    for (let i = -8; i <= 8; i++) {
        const bottomX = centerX + i * 58;
        ctx.beginPath();
        ctx.moveTo(centerX + i * 3, horizon);
        ctx.lineTo(bottomX, canvas.height + 10);
        ctx.stroke();
    }
    const offset = (state.elapsed * 95) % 42;
    for (let y = horizon + 12 + offset; y < canvas.height + 55; y += 42) {
        const depth = (y - horizon) / (canvas.height - horizon);
        const yy = horizon + (y - horizon) * (0.55 + depth * 0.45);
        ctx.globalAlpha = 0.08 + depth * 0.12;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(canvas.width, yy);
        ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Subtle illuminated side rails.
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#2bdfff";
    ctx.strokeStyle = "rgba(50,205,255,.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 430);
    ctx.lineTo(8, canvas.height);
    ctx.moveTo(canvas.width - 8, 430);
    ctx.lineTo(canvas.width - 8, canvas.height);
    ctx.stroke();
    ctx.restore();

    for (const f of state.floaters) {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = "#8beeff";
        ctx.shadowColor = "#4feaff";
        ctx.shadowBlur = f.r * 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Soft edge vignette adds contrast without an image asset.
    const vignette = ctx.createRadialGradient(centerX, canvas.height * .48, 120, centerX, canvas.height * .48, 460);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,12,.48)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHero() {
    const moving = Math.min(1, Math.abs(player.vx) / player.maxSpeed);
    const bob = Math.sin(player.idleT * (player.vx ? 10 : 5)) * (2 + moving * 2);
    const lean = Math.max(-0.16, Math.min(0.16, player.vx / player.maxSpeed * 0.16));
    const x = player.x;
    const y = player.y + bob;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);

    // Ground shadow and coloured contact glow.
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.beginPath();
    ctx.ellipse(0, 31, 26 + moving * 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const aura = ctx.createRadialGradient(0, 26, 2, 0, 26, 39);
    aura.addColorStop(0, "rgba(38,220,255,.22)");
    aura.addColorStop(1, "rgba(38,220,255,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(-42, -8, 84, 76);

    // Short cape / jacket tail.
    ctx.fillStyle = "#9b3d9f";
    ctx.beginPath();
    ctx.moveTo(-12, 1);
    ctx.quadraticCurveTo(-31, 15, -19, 34);
    ctx.quadraticCurveTo(-7, 28, 2, 8);
    ctx.fill();

    // Legs and shoes.
    const step = Math.sin(player.idleT * 13) * moving * 3;
    const legGrad = ctx.createLinearGradient(0, 24, 0, 48);
    legGrad.addColorStop(0, "#263b72");
    legGrad.addColorStop(1, "#0b1536");
    ctx.fillStyle = legGrad;
    roundRect(-13, 20 + step, 10, 22, 4);
    ctx.fill();
    roundRect(3, 20 - step, 10, 22, 4);
    ctx.fill();
    ctx.fillStyle = "#0a1027";
    roundRect(-15, 38 + step, 14, 7, 3);
    ctx.fill();
    roundRect(1, 38 - step, 14, 7, 3);
    ctx.fill();

    // Jacket body with shaded side panels.
    const jacket = ctx.createLinearGradient(-18, -12, 18, 28);
    jacket.addColorStop(0, "#8af7ff");
    jacket.addColorStop(.32, "#2fd8f4");
    jacket.addColorStop(1, "#0879b9");
    ctx.shadowColor = "#20dfff";
    ctx.shadowBlur = 17;
    ctx.fillStyle = jacket;
    roundRect(-18, -10, 36, 37, 11);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(5,54,104,.45)";
    roundRect(9, -5, 5, 27, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(225,255,255,.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 23);
    ctx.stroke();

    // Neck and face with dimensional skin shading.
    const skin = ctx.createLinearGradient(-15, -49, 14, -10);
    skin.addColorStop(0, "#ffe0be");
    skin.addColorStop(.65, "#f5bd94");
    skin.addColorStop(1, "#bd795f");
    ctx.fillStyle = skin;
    roundRect(-6, -25, 12, 13, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -31, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair silhouette.
    ctx.fillStyle = "#10101b";
    ctx.beginPath();
    ctx.moveTo(-16, -34);
    ctx.quadraticCurveTo(-18, -52, -3, -50);
    ctx.quadraticCurveTo(8, -56, 16, -43);
    ctx.lineTo(15, -34);
    ctx.quadraticCurveTo(5, -40, -2, -37);
    ctx.quadraticCurveTo(-10, -33, -16, -34);
    ctx.fill();
    ctx.fillStyle = "#383044";
    ctx.beginPath();
    ctx.ellipse(-5, -48, 6, 2, -.3, 0, Math.PI * 2);
    ctx.fill();

    // Brows, eyes and signature moustache.
    ctx.strokeStyle = "#38251f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -34); ctx.lineTo(-4, -35);
    ctx.moveTo(4, -35); ctx.lineTo(10, -34);
    ctx.stroke();
    ctx.fillStyle = "#171522";
    ctx.beginPath();
    ctx.arc(-6, -30, 1.5, 0, Math.PI * 2);
    ctx.arc(6, -30, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#201820";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, -23);
    ctx.quadraticCurveTo(-5, -18, 0, -22);
    ctx.quadraticCurveTo(5, -18, 10, -23);
    ctx.stroke();
    ctx.lineCap = "butt";

    // Hero shades with bright reflective lenses.
    ctx.fillStyle = "#090d1c";
    roundRect(-13, -37, 11, 7, 2);
    ctx.fill();
    roundRect(2, -37, 11, 7, 2);
    ctx.fill();
    ctx.strokeStyle = "#53efff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, -36); ctx.lineTo(-7, -36);
    ctx.moveTo(3, -36); ctx.lineTo(8, -36);
    ctx.stroke();
    ctx.strokeStyle = "#101827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-2, -34); ctx.lineTo(2, -34);
    ctx.stroke();

    // Rim light around the complete character.
    ctx.shadowColor = "#55efff";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(111,247,255,.72)";
    ctx.lineWidth = 1.5;
    roundRect(-20, -52, 40, 99, 15);
    ctx.stroke();
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

    if (h.type === "meteor") {
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

function hazardGlowColor(type) {
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
        audio.init();
        if (audio.ctx.state === "suspended") audio.ctx.resume();
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
    setScreen("menu");
});

soundToggle.addEventListener("click", () => {
    input.interacted = true;
    audio.init();
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    input.soundOn = !input.soundOn;
    soundToggle.textContent = input.soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF";
});

// Initial UI setup
updateScoreDisplays();
setScreen("menu");
state.floaters = createFloaters(34);
requestAnimationFrame(loop);
