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

// Supabase public project credentials. The publishable key is designed for browser use;
// database access is restricted by the Row Level Security policies in supabase-setup.sql.
const SUPABASE_URL = "https://blbuaokeevroddznwhnr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_RoSNIPpv1nG31lQidXn1Og_UTSUYOtf";
const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
            flowType: "pkce",
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true
        }
    })
    : null;
let currentUser = null;
let authMode = "login";

const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authUsername = document.getElementById("authUsername");
const usernameLabel = document.getElementById("usernameLabel");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const authModeToggle = document.getElementById("authModeToggle");
const logoutBtn = null;
const authMessage = document.getElementById("authMessage");
const playerStatus = document.getElementById("playerStatus");
const profileMenu = document.getElementById("profileMenu");
const profileMenuToggle = document.getElementById("profileMenuToggle");
const profileDropdown = document.getElementById("profileDropdown");
const headerAvatar = document.getElementById("headerAvatar");
const headerAvatarFallback = document.getElementById("headerAvatarFallback");
const profileScreen = document.getElementById("profileScreen");
const profileNameForm = document.getElementById("profileNameForm");
const profileNameInput = document.getElementById("profileNameInput");
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarFallback = document.getElementById("profileAvatarFallback");
const avatarUpload = document.getElementById("avatarUpload");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileJoined = document.getElementById("profileJoined");
const profileMessage = document.getElementById("profileMessage");
const profileSecurityNote = document.getElementById("profileSecurityNote");
const communityTitle = document.getElementById("communityTitle");
const communityIntro = document.getElementById("communityIntro");
const leaderboardList = document.getElementById("leaderboardList");

async function signOutPlayer() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) { showAuthMessage(error.message, true); showProfileMessage(error.message, true); return; }
    state.running = false;
    state.gameOver = false;
    profileScreen.hidden = true;
    profileDropdown.hidden = true;
    document.body.classList.remove("profile-open");
    setScreen("menu");
    showAuthMessage("You have signed out. Sign in again to continue.");
}
function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.classList.toggle("error", isError);
}
function setAuthMode(mode) {
    authMode = mode;
    const registering = mode === "register";
    authTitle.textContent = registering ? "CREATE PILOT ACCOUNT" : "PLAYER LOGIN";
    usernameLabel.hidden = !registering;
    authUsername.hidden = !registering;
    authUsername.required = registering;
    authSubmit.textContent = registering ? "CREATE ACCOUNT" : "SIGN IN";
    authModeToggle.textContent = registering ? "ALREADY REGISTERED? SIGN IN" : "NEW PILOT? CREATE ACCOUNT";
    showAuthMessage(registering ? "Choose a pilot name and create your account." : "Sign in or create an account to save your high scores.");
}
function renderAuthState() {
    const signedIn = Boolean(currentUser);
    document.body.classList.toggle("authenticated", signedIn);
    playerStatus.hidden = !signedIn;
    profileMenu.hidden = !signedIn;
    if (signedIn) refreshProfileUI();
    document.body.classList.toggle("player-authenticated", signedIn);
    playerStatus.textContent = signedIn ? (currentUser.user_metadata?.username || currentUser.email || "SIGNED IN").toUpperCase() : ""; 
    communityTitle.innerHTML = signedIn ? 'THE <span>LEADERBOARD.</span>' : 'PILOT <span>ACCESS.</span>';
    communityIntro.textContent = signedIn ? "Your pilot account is active. Track your best runs and compare scores with the global community." : "Sign in or create your pilot account to unlock VOIDRUN.";
    authForm.querySelectorAll("label, input, #authSubmit, #authModeToggle, #googleAuthBtn, .auth-divider").forEach(el => { el.hidden = signedIn; });

    if (signedIn) showAuthMessage("Signed in. Your finished runs will be saved to the global leaderboard.");
    else setAuthMode(authMode);
}

function showProfileMessage(message, isError = false) {
    profileMessage.textContent = message;
    profileMessage.classList.toggle("error", isError);
}
function currentPilotName() {
    return currentUser?.user_metadata?.username || currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name || currentUser?.email?.split("@")[0] || "Pilot";
}
function setAvatar(imageUrl) {
    [headerAvatar, profileAvatar].forEach(img => {
        if (imageUrl) { img.src = imageUrl; img.hidden = false; }
        else { img.removeAttribute("src"); img.hidden = true; }
    });
    const initials = currentPilotName().trim().charAt(0).toUpperCase() || "P";
    headerAvatarFallback.textContent = initials;
    profileAvatarFallback.textContent = initials;
    headerAvatarFallback.hidden = Boolean(imageUrl);
    profileAvatarFallback.hidden = Boolean(imageUrl);
}
async function refreshProfileUI() {
    if (!currentUser) return;
    const { data } = await supabaseClient.from("profiles").select("username,avatar_url,created_at").eq("id", currentUser.id).maybeSingle();
    const name = data?.username || currentPilotName();
    profileNameInput.value = name;
    profileDisplayName.textContent = name;
    profileJoined.textContent = data?.created_at ? "Joined " + new Date(data.created_at).toLocaleDateString() : "";
    setAvatar(data?.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "");
    const isGoogle = currentUser.app_metadata?.provider === "google" ||
        currentUser.identities?.some(identity => identity.provider === "google");
    profileSecurityNote.textContent = isGoogle
        ? "This account uses Google sign-in. Manage its password through your Google Account."
        : "A secure password reset link will be sent to your account email.";
    document.getElementById("profileResetBtn").disabled = isGoogle;
    document.getElementById("dropdownResetBtn").disabled = isGoogle;
}
function openProfile() {
    profileDropdown.hidden = true;
    profileMenuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.add("profile-open");
    profileScreen.hidden = false;
    refreshProfileUI();
    profileScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}
function closeProfile() {
    profileScreen.hidden = true;
    document.body.classList.remove("profile-open");
    document.getElementById("communityPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function sendPasswordReset() {
    if (!currentUser || !supabaseClient) return;
    if (currentUser.app_metadata?.provider === "google" || currentUser.identities?.some(i => i.provider === "google")) {
        showProfileMessage("This account uses Google sign-in. Change its password through Google.", true);
        return;
    }
    const email = currentUser.email;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: "https://s-hasil.github.io/rage-game/"
    });
    showProfileMessage(error ? error.message : "Password reset link sent to " + email + ".");
}

async function loadLeaderboard() {
    if (!supabaseClient) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">Leaderboard service could not load. Refresh the page.</li>';
        return;
    }
    leaderboardList.innerHTML = '<li class="leaderboard-empty">Loading pilot rankings…</li>';
    const { data, error } = await supabaseClient.from("leaderboard").select("username,high_score").order("high_score", { ascending: false }).limit(10);
    if (error) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">Could not load rankings. Check that the Supabase SQL setup completed.</li>';
        return;
    }
    if (!data?.length) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">No scores yet. Be the first pilot on the board.</li>';
        return;
    }
    leaderboardList.innerHTML = "";
    data.forEach((pilot, index) => {
        const item = document.createElement("li");
        item.className = "leaderboard-entry";
        const name = document.createElement("span");
        name.className = "leaderboard-name";
        name.textContent = String(index + 1).padStart(2, "0") + "  " + (pilot.username || "Unknown Pilot");
        const score = document.createElement("strong");
        score.textContent = Number(pilot.high_score || 0).toLocaleString();
        item.append(name, score);
        leaderboardList.append(item);
    });
}
async function saveRunScore(score) {
    if (!supabaseClient || !currentUser || score <= 0) return;
    const { error } = await supabaseClient.from("scores").insert({ user_id: currentUser.id, score: Math.floor(score) });
    if (error) {
        showAuthMessage("Your run ended, but the score could not be saved: " + error.message, true);
        return;
    }
    showAuthMessage("Score saved to the global leaderboard.");
    await loadLeaderboard();
}
async function initializeCommunity() {
    if (!supabaseClient) {
        showAuthMessage("Account service unavailable. Check your connection and refresh.", true);
        googleAuthBtn.disabled = true;
        authSubmit.disabled = true;
        return;
    }

    // Listen first, then explicitly exchange the Google OAuth PKCE code.
    // This avoids a silent return to the login screen if automatic URL detection
    // races the app's initial session read on static GitHub Pages hosting.
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;
        renderAuthState();
        if (currentUser) window.setTimeout(() => loadLeaderboard(), 0);
    });

    const callbackUrl = new URL(window.location.href);
    const oauthError = callbackUrl.searchParams.get("error_description") || callbackUrl.searchParams.get("error");
    const oauthCode = callbackUrl.searchParams.get("code");

    if (oauthError) {
        callbackUrl.searchParams.delete("error");
        callbackUrl.searchParams.delete("error_description");
        callbackUrl.searchParams.delete("error_code");
        window.history.replaceState({}, document.title, callbackUrl.pathname + callbackUrl.search + callbackUrl.hash);
        showAuthMessage("Google sign-in failed: " + oauthError, true);
    } else if (oauthCode) {
        const { data: exchanged, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(oauthCode);
        callbackUrl.searchParams.delete("code");
        callbackUrl.searchParams.delete("state");
        window.history.replaceState({}, document.title, callbackUrl.pathname + callbackUrl.search + callbackUrl.hash);
        if (exchangeError) {
            showAuthMessage("Google sign-in could not complete: " + exchangeError.message, true);
        } else {
            currentUser = exchanged.session?.user || exchanged.user || currentUser;
        }
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        showAuthMessage("Could not restore your sign-in session: " + error.message, true);
        return;
    }
    currentUser = data.session?.user || currentUser;
    renderAuthState();
    if (currentUser) await loadLeaderboard();
}


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
    powerUps: [],
    nextPowerUpScore: 30,
    invulnerable: 0,
    shieldFade: 0,
    shieldWarningPlayed: false,
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

const hazardTypes = ["meteor", "wreckage"];

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
    if (!currentUser) {
        showAuthMessage("Sign in or create an account before launching a mission.", true);
        document.getElementById("communityPanel")?.scrollIntoView({ behavior: "smooth" });
        return;
    }
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
    state.powerUps = [];
    state.nextPowerUpScore = 30;
    state.invulnerable = 0;
    state.shieldFade = 0;
    state.shieldWarningPlayed = false;
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
    saveRunScore(Math.floor(state.score));
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

function findSafeHazardSpawn(size, speedY) {
    const spawnY = -70;
    const targetY = player.y - 20;
    const arrivalTime = (targetY - spawnY) / speedY;
    const margin = Math.max(42, size + player.w * 0.55 + 22);
    const minX = 20 + size;
    const maxX = canvas.width - 20 - size;
    const candidates = [];
    const steps = 18;

    for (let i = 0; i <= steps; i++) {
        const x = minX + (maxX - minX) * (i / steps);
        if (Math.abs(x - player.x) > player.maxSpeed * arrivalTime + margin) continue;

        let safe = true;
        for (const hazard of state.hazards) {
            const timeToPlayer = (targetY - hazard.y) / Math.max(1, hazard.speedY);
            if (timeToPlayer < 0 || Math.abs(timeToPlayer - arrivalTime) > 0.48) continue;
            const predictedX = Math.max(12, Math.min(canvas.width - 12,
                hazard.x + hazard.driftX * Math.max(0, arrivalTime)));
            const requiredGap = margin + hazard.size * 0.72;
            if (Math.abs(x - predictedX) < requiredGap) {
                safe = false;
                break;
            }
        }
        if (safe) candidates.push(x);
    }

    if (!candidates.length) return null;
    return candidates[(Math.random() * candidates.length) | 0];
}

function spawnHazard() {
    const progress = Math.min(1, state.score / 120);
    const type = hazardTypes[(Math.random() * hazardTypes.length) | 0];
    const size = 26 + Math.random() * 24;
    const speedY = 210 + Math.random() * 110 + progress * 160;
    const x = findSafeHazardSpawn(size, speedY);
    if (x === null) return false;

    state.hazards.push({
        type,
        x,
        y: -70,
        size,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() * 3 + 2) * (Math.random() > 0.5 ? 1 : -1),
        speedY,
        driftX: (Math.random() - 0.5) * (42 + progress * 24),
        trail: [],
        nearMissed: false
    });
    return true;
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
    const previousShieldTime = state.invulnerable;
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.shieldFade = Math.max(0, state.shieldFade - dt);

    if (previousShieldTime > 2 && state.invulnerable <= 2 && state.invulnerable > 0 && !state.shieldWarningPlayed) {
        state.shieldWarningPlayed = true;
        audio.beep({ freq: 740, type: "triangle", dur: 0.16, gain: 0.14, slide: 0.78 });
    }
    if (previousShieldTime > 0 && state.invulnerable === 0) {
        state.shieldFade = 0.6;
        addParticles(player.x, player.y - 18, "#79fff3", 18, 0.55);
    }

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

        if (dist < hitRadius + h.size * 0.55 && state.invulnerable <= 0 && state.shieldFade <= 0) {
            state.slowMo = 0.3;
            state.shake = 13;
            addParticles(player.x, player.y - 14, "#ff625d", 42, 1.6);
            addParticles(player.x, player.y - 14, "#ffd775", 24, 1.2);
            endGame();
            return;
        }

        if (h.y - h.size > canvas.height + 20) {
            state.hazards.splice(i, 1);
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


function spawnPowerUp() {
    if (state.powerUps.length) return;
    state.powerUps.push({
        x: 34 + Math.random() * (canvas.width - 68),
        y: -35,
        size: 22,
        speedY: 145 + Math.min(70, state.elapsed * 0.7),
        pulse: Math.random() * Math.PI * 2
    });
}
function updatePowerUps(dt) {
    // Guaranteed spawn at 30, 60, 90... points. If one is already
    // on screen, hold the next threshold until that pickup is cleared.
    if (state.score >= state.nextPowerUpScore && state.powerUps.length === 0) {
        spawnPowerUp();
        state.nextPowerUpScore += 30;
    }
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const item = state.powerUps[i];
        item.y += item.speedY * dt;
        item.pulse += dt * 4;
        if (Math.hypot(item.x - player.x, item.y - (player.y - 20)) < item.size + player.w * 0.38) {
            state.invulnerable = 5;
            state.shieldFade = 0;
            state.shieldWarningPlayed = false;
            addParticles(item.x, item.y, "#76fff2", 30, 1.25);
            audio.ping();
            state.powerUps.splice(i, 1);
            continue;
        }
        if (item.y > canvas.height + 35) state.powerUps.splice(i, 1);
    }
}
function drawPowerUps() {
    for (const item of state.powerUps) {
        const pulse = 1 + Math.sin(item.pulse) * 0.12;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.scale(pulse, pulse);
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "#62fff0";
        ctx.shadowBlur = 25;
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, item.size * 1.5);
        glow.addColorStop(0, "rgba(255,255,255,.98)");
        glow.addColorStop(.28, "rgba(100,255,240,.9)");
        glow.addColorStop(1, "rgba(30,180,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, item.size * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#aafffa";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, item.size * .72, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, -item.size * .48);
        ctx.lineTo(item.size * .13, -item.size * .12);
        ctx.lineTo(item.size * .43, 0);
        ctx.lineTo(item.size * .13, item.size * .12);
        ctx.lineTo(0, item.size * .48);
        ctx.lineTo(-item.size * .13, item.size * .12);
        ctx.lineTo(-item.size * .43, 0);
        ctx.lineTo(-item.size * .13, -item.size * .12);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
}

function updateDifficulty(dt) {
    state.elapsed += dt;
    state.score = Math.floor(state.elapsed);
    state.spawnTimer += dt;

    // Difficulty rises with survival score, but spawn pressure has a fair lower limit.
    const progress = Math.min(1, state.score / 120);
    state.spawnInterval = 0.95 - progress * 0.40;

    if (state.spawnTimer >= state.spawnInterval) {
        // If no reachable safe lane exists, wait rather than creating an unavoidable pattern.
        if (spawnHazard()) state.spawnTimer = 0;
    }

    state.combo = 1;
    state.nearMissStreak = 0;
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
    // Atmospheric rim, surface bands and a soft terminator for spherical depth.
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 47, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "rgba(112,190,218,.12)";
    ctx.beginPath(); ctx.ellipse(-8, -13, 45, 9, -.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, 13, 43, 6, -.12, 0, Math.PI * 2); ctx.fill();
    const shade = ctx.createLinearGradient(-34, -8, 48, 10);
    shade.addColorStop(0, "rgba(0,4,18,.02)");
    shade.addColorStop(.58, "rgba(0,4,18,.12)");
    shade.addColorStop(1, "rgba(0,3,15,.82)");
    ctx.fillStyle = shade; ctx.fillRect(-50, -50, 100, 100);
    ctx.restore();
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

    // Soft cast shadow and under-hull bounce light create a raised 3D silhouette.
    ctx.save();
    ctx.globalAlpha = .42;
    ctx.fillStyle = "#000713";
    ctx.filter = "blur(7px)";
    ctx.beginPath(); ctx.ellipse(3, 24, 25, 47, 0, 0, Math.PI * 2); ctx.fill();
    ctx.filter = "none";
    const bounce = ctx.createRadialGradient(0, 25, 2, 0, 25, 36);
    bounce.addColorStop(0, "rgba(76,218,255,.22)");
    bounce.addColorStop(1, "rgba(76,218,255,0)");
    ctx.fillStyle = bounce; ctx.fillRect(-38, -5, 76, 72);
    ctx.restore();

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

    // Raised armor plates, bevel highlights and dark side bevels.
    const bevel = ctx.createLinearGradient(-18, -10, 18, 5);
    bevel.addColorStop(0, "rgba(255,255,255,.58)");
    bevel.addColorStop(.32, "rgba(255,255,255,.08)");
    bevel.addColorStop(.72, "rgba(28,55,78,.08)");
    bevel.addColorStop(1, "rgba(5,18,34,.62)");
    ctx.fillStyle = bevel;
    ctx.beginPath();
    ctx.moveTo(0, -49); ctx.bezierCurveTo(9, -35, 15, -14, 14, 18);
    ctx.lineTo(9, 31); ctx.lineTo(-9, 31); ctx.lineTo(-14, 18);
    ctx.bezierCurveTo(-15, -14, -9, -35, 0, -49);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.26)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(0, 27); ctx.stroke();
    ctx.fillStyle = "rgba(28,57,78,.42)";
    ctx.beginPath(); ctx.moveTo(14, -5); ctx.lineTo(17, 17); ctx.lineTo(12, 29); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();

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

    if (h.type === "wreckage") {
        drawBrokenRocket(h.size);
    } else if (h.type === "meteor") {
        const rock = ctx.createRadialGradient(-h.size * .14, -h.size * .18, 2, 0, 0, h.size * .5);
        rock.addColorStop(0, "#fff0bd");
        rock.addColorStop(.32, "#ffad55");
        rock.addColorStop(1, "#bd3a37");
        ctx.fillStyle = rock;
        // Irregular faceted silhouette with a dark lower bevel for a 3D asteroid.
        ctx.beginPath();
        const facets = 10;
        for (let i = 0; i < facets; i++) {
            const angle = (i / facets) * Math.PI * 2;
            const radius = h.size * (.39 + (i % 3) * .035);
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.save();
        ctx.clip();
        const underside = ctx.createLinearGradient(-h.size * .2, -h.size * .3, h.size * .25, h.size * .5);
        underside.addColorStop(0, "rgba(255,255,255,.28)");
        underside.addColorStop(.42, "rgba(255,255,255,0)");
        underside.addColorStop(1, "rgba(35,9,22,.68)");
        ctx.fillStyle = underside; ctx.fillRect(-h.size, -h.size, h.size * 2, h.size * 2);
        ctx.strokeStyle = "rgba(255,224,180,.22)";
        ctx.lineWidth = 1;
        for (let facet = 0; facet < 6; facet++) {
            const angle = facet * Math.PI / 3;
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * h.size * .48, Math.sin(angle) * h.size * .48); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(255,230,190,.52)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, h.size * .42, -2.7, -.55); ctx.stroke();
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



function drawBrokenRocket(size) {
    ctx.save();
    ctx.scale(size / 38, size / 38);
    // Floating contact shadow and metallic hull with layered bevels.
    ctx.fillStyle = "rgba(0,5,16,.45)";
    ctx.beginPath(); ctx.ellipse(3, 8, 25, 30, -.2, 0, Math.PI * 2); ctx.fill();
    const hull3d = ctx.createLinearGradient(-18, -22, 18, 16);
    hull3d.addColorStop(0, "#d2e8f4");
    hull3d.addColorStop(.18, "#557d9e");
    hull3d.addColorStop(.55, "#263c59");
    hull3d.addColorStop(1, "#101c32");
    ctx.fillStyle = hull3d;
    ctx.strokeStyle = "#b9eaff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -25); ctx.lineTo(9, -18); ctx.lineTo(14, 5);
    ctx.lineTo(5, 22); ctx.lineTo(-12, 14); ctx.lineTo(-17, -4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.38)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(5, -14); ctx.lineTo(9, 2); ctx.stroke();
    ctx.fillStyle = "rgba(5,15,29,.65)";
    ctx.beginPath(); ctx.moveTo(3, -13); ctx.lineTo(10, -8); ctx.lineTo(12, 5); ctx.lineTo(4, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f28b55";
    ctx.beginPath(); ctx.moveTo(-12, 10); ctx.lineTo(-27, 24); ctx.lineTo(-5, 19); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(27, -20); ctx.lineTo(15, 1); ctx.fill();
    ctx.fillStyle = "#6deaff";
    ctx.shadowColor = "#6deaff"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, -7, 5, 0, Math.PI * 2); ctx.fill();
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
    if (type === "wreckage") return "#ffad70";
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

function drawShieldStatus() {
    if (state.invulnerable <= 0 && state.shieldFade <= 0) return;

    const warning = state.invulnerable > 0 && state.invulnerable <= 2;
    const remaining = Math.max(0, state.invulnerable);
    const label = state.shieldFade > 0 ? "SHIELD ENDING" : `SHIELD  ${remaining.toFixed(1)}s`;
    const barWidth = 112;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 24;

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = warning ? "#ffc66e" : "#9bfff5";
    ctx.shadowColor = warning ? "#ffad55" : "#5cfff1";
    ctx.shadowBlur = 10;
    ctx.fillText(label, canvas.width / 2, barY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.fillRect(barX, barY + 8, barWidth, 4);
    ctx.fillStyle = warning ? "#ffbd69" : "#79fff3";
    const progress = state.shieldFade > 0 ? state.shieldFade / 0.6 : remaining / 5;
    ctx.fillRect(barX, barY + 8, barWidth * Math.max(0, Math.min(1, progress)), 4);
    ctx.restore();
}

function draw() {
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    for (const h of state.hazards) drawHazard(h);
    drawPowerUps();
    drawHero();
    if (state.invulnerable > 0 || state.shieldFade > 0) {
        const warning = state.invulnerable > 0 && state.invulnerable <= 2;
        const fadeProgress = state.shieldFade > 0 ? state.shieldFade / 0.6 : 1;
        const flicker = warning && Math.floor(state.elapsed * 10) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = (state.shieldFade > 0 ? fadeProgress : 0.62 + Math.sin(state.elapsed * (warning ? 22 : 12)) * (warning ? 0.28 : 0.14));
        ctx.strokeStyle = warning ? "#ffc66e" : "#79fff3";
        ctx.lineWidth = warning ? 4 : 3;
        ctx.shadowColor = warning ? "#ffad55" : "#5cfff1";
        ctx.shadowBlur = warning ? 30 : 24;
        ctx.beginPath(); ctx.ellipse(player.x, player.y - 18, 43, 55, 0, 0, Math.PI * 2); ctx.stroke();
        if (flicker) {
            ctx.globalAlpha *= 0.35;
            ctx.beginPath(); ctx.ellipse(player.x, player.y - 18, 48, 60, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }
    drawParticles();
    drawShieldStatus();

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
        updatePowerUps(dt);
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

document.addEventListener("pointerdown", () => {
    if (input.soundOn && !state.running) audio.startAmbience();
}, { once: true });

soundToggle.addEventListener("click", () => {
    input.interacted = true;
    audio.setEnabled(!input.soundOn);
    soundToggle.querySelector("span:last-child").textContent = input.soundOn ? "SOUND ON" : "SOUND OFF";
    soundToggle.setAttribute("aria-pressed", String(input.soundOn));
});


if (authForm) {
    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!supabaseClient) return showAuthMessage("Account service unavailable. Refresh the page.", true);
        authSubmit.disabled = true;
        showAuthMessage(authMode === "register" ? "Creating your pilot account…" : "Signing in…");
        try {
            if (authMode === "register") {
                const username = authUsername.value.trim();
                if (username.length < 3) throw new Error("Pilot name must be at least 3 characters.");
                const { data, error } = await supabaseClient.auth.signUp({
                    email: authEmail.value.trim(),
                    password: authPassword.value,
                    options: {
                        data: { username },
                        emailRedirectTo: "https://s-hasil.github.io/rage-game/"
                    }
                });
                if (error) throw error;
                if (data.session) showAuthMessage("Account created. You're signed in and ready to fly.");
                else showAuthMessage("Account created! Check your email for the confirmation link, then sign in.");
            } else {
                const { error } = await supabaseClient.auth.signInWithPassword({
                    email: authEmail.value.trim(),
                    password: authPassword.value
                });
                if (error) throw error;
            }
        } catch (error) {
            const message = error.message || "Authentication failed. Please try again.";
            showAuthMessage(/security purposes|after \d+ seconds|rate limit/i.test(message)
                ? "Email sign-up is temporarily rate-limited by Supabase. Wait for the timer to finish, or use Continue with Google once Google OAuth is enabled."
                : message, true);
        } finally {
            authSubmit.disabled = false;
        }
    });
    googleAuthBtn.addEventListener("click", async () => {
        if (!supabaseClient) return showAuthMessage("Account service unavailable. Check your connection and refresh.", true);
        googleAuthBtn.disabled = true;
        showAuthMessage("Connecting securely to Google…");
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: "https://s-hasil.github.io/rage-game/",
                    queryParams: { access_type: "offline", prompt: "select_account" }
                }
            });
            if (error) throw error;
        } catch (error) {
            googleAuthBtn.disabled = false;
            const message = error.message || "Google sign-in could not start.";
            showAuthMessage(/provider.*not enabled|unsupported provider/i.test(message)
                ? "Google sign-in is not enabled yet. Enable the Google provider and add its OAuth Client ID and Secret in Supabase Authentication settings."
                : message, true);
        }
    });
    authModeToggle.addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));
    profileMenuToggle.addEventListener("click", () => {
        const opening = profileDropdown.hidden;
        profileDropdown.hidden = !opening;
        profileMenuToggle.setAttribute("aria-expanded", String(opening));
    });
    document.getElementById("openProfileBtn").addEventListener("click", openProfile);
    document.getElementById("dropdownResetBtn").addEventListener("click", () => { profileScreen.hidden = false; openProfile(); sendPasswordReset(); });
    document.getElementById("profileResetBtn").addEventListener("click", sendPasswordReset);
    document.getElementById("profileBackBtn").addEventListener("click", closeProfile);
    document.getElementById("profileSignOutBtn").addEventListener("click", signOutPlayer);
    document.getElementById("dropdownSignOutBtn").addEventListener("click", signOutPlayer);
    profileNameForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!currentUser) return;
        const username = profileNameInput.value.trim();
        if (username.length < 3 || username.length > 18) return showProfileMessage("Player name must be 3–18 characters.", true);
        const { error } = await supabaseClient.from("profiles").update({ username }).eq("id", currentUser.id);
        if (error) return showProfileMessage(error.code === "23505" ? "That player name is already taken." : error.message, true);
        const { error: metadataError } = await supabaseClient.auth.updateUser({ data: { username } });
        if (metadataError) console.warn("Profile name saved, but auth metadata did not update:", metadataError.message);
        currentUser = { ...currentUser, user_metadata: { ...currentUser.user_metadata, username } };
        profileDisplayName.textContent = username;
        setAvatar(document.getElementById("profileAvatar").src || "");
        showProfileMessage("Player name updated.");
        await loadLeaderboard();
        renderAuthState();
    });
    avatarUpload.addEventListener("change", async () => {
        const file = avatarUpload.files?.[0];
        if (!file || !currentUser) return;
        if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
            showProfileMessage("Choose a JPG, PNG or WebP image under 2 MB.", true); avatarUpload.value = ""; return;
        }
        showProfileMessage("Uploading profile picture…");
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = currentUser.id + "/avatar." + extension;
        const { error: uploadError } = await supabaseClient.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) { showProfileMessage("Avatar upload failed: " + uploadError.message, true); return; }
        const { data: publicData } = supabaseClient.storage.from("avatars").getPublicUrl(path);
        const avatarUrl = publicData.publicUrl + "?v=" + Date.now();
        const { error: saveError } = await supabaseClient.from("profiles").update({ avatar_url: avatarUrl }).eq("id", currentUser.id);
        if (saveError) { showProfileMessage("Image uploaded, but profile update failed: " + saveError.message, true); return; }
        await supabaseClient.auth.updateUser({ data: { avatar_url: avatarUrl } });
        setAvatar(avatarUrl);
        showProfileMessage("Profile picture updated.");
        avatarUpload.value = "";
    });

    document.getElementById("refreshLeaderboard").addEventListener("click", loadLeaderboard);
    initializeCommunity();
}

// Initial UI setup
updateScoreDisplays();
setScreen("menu");
state.floaters = createFloaters(34);
requestAnimationFrame(loop);
