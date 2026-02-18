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
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "rgba(17, 32, 70, 0.85)");
    g.addColorStop(1, "rgba(8, 8, 22, 0.96)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const f of state.floaters) {
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = "#7af3ff";
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawHero() {
    const bob = Math.sin(player.idleT * 6) * 2.8;
    const x = player.x;
    const y = player.y + bob;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 28, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cape glow
    ctx.fillStyle = "rgba(255, 95, 180, 0.18)";
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 10);
    ctx.quadraticCurveTo(x - 36, y + 20, x - 14, y + 30);
    ctx.quadraticCurveTo(x + 14, y + 24, x + 8, y + 6);
    ctx.fill();

    // Body (jacket)
    ctx.fillStyle = "#2fd2ff";
    roundRect(x - 16, y - 6, 32, 34, 10);
    ctx.fill();

    // Head
    ctx.fillStyle = "#f5c9a8";
    ctx.beginPath();
    ctx.arc(x, y - 20, 16, 0, Math.PI * 2);
    ctx.fill();

    // Hair + heroic curl
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x, y - 25, 16, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 9, y - 24, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#221";
    ctx.beginPath();
    ctx.arc(x - 5, y - 20, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 20, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Big comedic moustache
    ctx.strokeStyle = "#1b1b1b";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 13);
    ctx.quadraticCurveTo(x - 1, y - 7, x + 2, y - 13);
    ctx.quadraticCurveTo(x + 10, y - 7, x + 11, y - 13);
    ctx.stroke();

    // Sunglasses
    ctx.fillStyle = "rgba(5,10,18,0.85)";
    roundRect(x - 10, y - 24, 9, 5, 2.3);
    roundRect(x + 1, y - 24, 9, 5, 2.3);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#14244f";
    roundRect(x - 12, y + 28, 8, 16, 3);
    roundRect(x + 4, y + 28, 8, 16, 3);
    ctx.fill();

    // Neon outline
    ctx.strokeStyle = "rgba(92,245,255,0.55)";
    ctx.lineWidth = 1.4;
    roundRect(x - 18, y - 40, 36, 86, 14);
    ctx.stroke();
}

function drawHazard(h) {
    for (let i = 0; i < h.trail.length; i++) {
        const t = h.trail[i];
        const alpha = (i + 1) / h.trail.length * 0.2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = hazardGlowColor(h.type);
        ctx.beginPath();
        ctx.arc(t.x, t.y, h.size * 0.36, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rotation);

    if (h.type === "meteor") {
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.arc(0, 0, h.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd29e";
        ctx.beginPath();
        ctx.arc(-h.size * 0.08, -h.size * 0.07, h.size * 0.14, 0, Math.PI * 2);
        ctx.fill();
    } else if (h.type === "blade") {
        ctx.fillStyle = "#d4e8ff";
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(h.size * 0.55, h.size * 0.1);
            ctx.lineTo(h.size * 0.2, h.size * 0.16);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = "#6ea8ff";
        ctx.beginPath();
        ctx.arc(0, 0, h.size * 0.17, 0, Math.PI * 2);
        ctx.fill();
    } else if (h.type === "orb") {
        const radial = ctx.createRadialGradient(0, 0, h.size * 0.1, 0, 0, h.size * 0.5);
        radial.addColorStop(0, "#c9f9ff");
        radial.addColorStop(1, "#00b8ff");
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(0, 0, h.size * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(165,245,255,0.95)";
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.arc(0, 0, h.size * 0.38, 0, Math.PI * 1.4);
        ctx.stroke();
    } else {
        ctx.fillStyle = "#ff4a39";
        ctx.beginPath();
        ctx.arc(0, 0, h.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd57c";
        ctx.beginPath();
        ctx.arc(0, 0, h.size * 0.18, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = hazardGlowColor(h.type);
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
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
