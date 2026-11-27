const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menuScreen = document.getElementById("menuScreen");
const gameSection = document.querySelector(".game-section");
const gameOverScreen = document.getElementById("gameOverScreen");
const playBtn = document.getElementById("playBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const soundToggle = document.getElementById("soundToggle");
const powerTipsToggle = document.getElementById("powerTipsToggle");
const powerTipsPanel = document.getElementById("powerTipsPanel");
const damageFlash = document.getElementById("damageFlash");

const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const comboValue = document.getElementById("comboValue");
const menuBest = document.getElementById("menuBest");
const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const pauseBtn = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn = document.getElementById("resumeBtn");
const splitTouchZone = document.getElementById("splitTouchZone");
const controlModeInputs = [...document.querySelectorAll('input[name="controlMode"]')];
const CONTROL_MODE_KEY = "astrixalControlMode";
let controlMode = ["buttons", "split", "tilt"].includes(localStorage.getItem(CONTROL_MODE_KEY)) ? localStorage.getItem(CONTROL_MODE_KEY) : "buttons";
let tiltPermissionGranted = false;
let tiltGamma = 0;

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
            detectSessionInUrl: true,
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
    state.paused = false;
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
function setAvatar(imageUrl, seed = currentPilotName()) {
    // Match the leaderboard's fallback: one stable DiceBear avatar for this pilot.
    const fallbackUrl = generatedPilotAvatar(seed);
    const resolvedUrl = imageUrl || fallbackUrl;
    [headerAvatar, profileAvatar].forEach(img => {
        img.onerror = () => {
            img.onerror = null;
            img.src = fallbackUrl;
        };
        img.src = resolvedUrl;
        img.hidden = false;
    });
    const initials = String(seed || "P").trim().charAt(0).toUpperCase() || "P";
    headerAvatarFallback.textContent = initials;
    profileAvatarFallback.textContent = initials;
    headerAvatarFallback.hidden = true;
    profileAvatarFallback.hidden = true;
}
async function refreshProfileUI() {
    if (!currentUser) return;
    const { data } = await supabaseClient.from("profiles").select("username,avatar_url,created_at").eq("id", currentUser.id).maybeSingle();
    const name = data?.username || currentPilotName();
    profileNameInput.value = name;
    profileDisplayName.textContent = name;
    profileJoined.textContent = data?.created_at ? "Joined " + new Date(data.created_at).toLocaleDateString() : "";
    setAvatar(data?.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "", name);
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

function generatedPilotAvatar(seed) {
    const safeSeed = String(seed || "astrixal-pilot").trim() || "astrixal-pilot";
    return "https://api.dicebear.com/9.x/adventurer/svg?seed=" + encodeURIComponent(safeSeed);
}

async function loadLeaderboard() {
    if (!supabaseClient) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">Leaderboard service could not load. Refresh the page.</li>';
        return;
    }
    leaderboardList.innerHTML = '<li class="leaderboard-empty">Loading top 10 pilots…</li>';
    const { data, error } = await supabaseClient.from("leaderboard")
        .select("user_id,username,high_score")
        .order("high_score", { ascending: false })
        .limit(10);
    if (error) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">Could not load rankings. Check that the Supabase SQL setup completed.</li>';
        return;
    }

    const pilots = data || [];
    const profileIds = pilots.map(pilot => pilot.user_id).filter(Boolean);
    let avatarById = {};
    if (profileIds.length) {
        const { data: profiles } = await supabaseClient.from("profiles")
            .select("id,avatar_url")
            .in("id", profileIds);
        (profiles || []).forEach(profile => { avatarById[profile.id] = profile.avatar_url || ""; });
    }

    // Use exactly the same resolved image for the signed-in pilot in both places.
    if (currentUser) {
        const ownMetadataAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || "";
        avatarById[currentUser.id] = avatarById[currentUser.id] || ownMetadataAvatar || generatedPilotAvatar(currentPilotName());
    }

    leaderboardList.innerHTML = "";
    if (!pilots.length) {
        leaderboardList.innerHTML = '<li class="leaderboard-empty">No scores yet. Be the first pilot on the board.</li>';
    } else {
        pilots.forEach((pilot, index) => {
            const item = document.createElement("li");
            item.className = "leaderboard-entry";

            const rank = document.createElement("span");
            rank.className = "leaderboard-rank";
            rank.textContent = String(index + 1);

            const avatar = document.createElement("span");
            avatar.className = "leaderboard-avatar";
            const pilotName = pilot.username || "Unknown Pilot";
            const avatarUrl = avatarById[pilot.user_id] || generatedPilotAvatar(pilotName);
            const image = document.createElement("img");
            image.src = avatarUrl;
            image.alt = "";
            image.loading = "lazy";
            image.onerror = () => {
                image.onerror = null;
                image.src = generatedPilotAvatar(pilotName + "-fallback");
            };
            avatar.append(image);

            const name = document.createElement("span");
            name.className = "leaderboard-player";
            name.textContent = pilot.username || "Unknown Pilot";

            const score = document.createElement("strong");
            score.textContent = Number(pilot.high_score || 0).toLocaleString();
            item.append(rank, avatar, name, score);
            leaderboardList.append(item);
        });
    }

    const profileName = document.getElementById("leaderboardProfileName");
    const profileAvatar = document.getElementById("leaderboardProfileAvatar");
    const profileFallback = document.getElementById("leaderboardProfileFallback");
    const profileRank = document.getElementById("leaderboardProfileRank");
    const profileScore = document.getElementById("leaderboardProfileScore");
    if (!currentUser) {
        profileName.textContent = "Sign in to view your card";
        profileAvatar.hidden = true;
        profileFallback.hidden = false;
        profileFallback.textContent = "P";
        profileRank.textContent = "—";
        profileScore.textContent = "—";
        return;
    }

    const { data: ownProfile } = await supabaseClient.from("profiles")
        .select("username,avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();
    const ownName = ownProfile?.username || currentPilotName();
    const ownAvatar = ownProfile?.avatar_url || avatarById[currentUser.id] || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || generatedPilotAvatar(ownName);
    // Keep the player card and their leaderboard row in sync, even when their profile is outside the top ten.
    avatarById[currentUser.id] = ownAvatar;
    profileName.textContent = ownName;
    profileFallback.textContent = ownName.trim().charAt(0).toUpperCase() || "P";
    profileAvatar.hidden = false;
    profileFallback.hidden = true;
    profileAvatar.onerror = () => {
        profileAvatar.onerror = null;
        profileAvatar.src = generatedPilotAvatar(ownName + "-fallback");
    };
    profileAvatar.src = ownAvatar;

    const ownRank = pilots.findIndex(pilot => pilot.user_id === currentUser.id);
    const ownLeaderboardRow = ownRank >= 0 ? pilots[ownRank] : null;
    profileRank.textContent = ownLeaderboardRow ? "#" + (ownRank + 1) : "—";
    profileScore.textContent = ownLeaderboardRow ? Number(ownLeaderboardRow.high_score || 0).toLocaleString() : "—";
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

    // Supabase handles the OAuth PKCE callback during client initialization.
    // Register the listener, then wait for the restored session before rendering
    // the account UI. Do not manually exchange the same authorization code.
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;
        renderAuthState();
        if (currentUser) window.setTimeout(() => loadLeaderboard(), 0);
    });

    const callbackUrl = new URL(window.location.href);
    const oauthError = callbackUrl.searchParams.get("error_description") || callbackUrl.searchParams.get("error");
    if (oauthError) {
        showAuthMessage("Google sign-in failed: " + oauthError, true);
        callbackUrl.searchParams.delete("error");
        callbackUrl.searchParams.delete("error_description");
        callbackUrl.searchParams.delete("error_code");
        callbackUrl.searchParams.delete("state");
        window.history.replaceState({}, document.title, callbackUrl.pathname + callbackUrl.search + callbackUrl.hash);
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
    paused: false,
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
    nextShieldPowerUpScore: 30,
    nextSpeedPowerUpScore: 45,
    pendingPowerUps: [],
    powerUpAlert: null,
    speedBoost: 0,
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
    if (pauseOverlay) pauseOverlay.hidden = true;
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
    state.paused = false;
    state.gameOver = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
    if (pauseBtn) { pauseBtn.textContent = "Ⅱ"; pauseBtn.setAttribute("aria-label", "Pause game"); }
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
    state.nextShieldPowerUpScore = 30;
    state.nextSpeedPowerUpScore = 45;
    state.pendingPowerUps = [];
    state.powerUpAlert = null;
    state.speedBoost = 0;
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
    state.paused = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
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

function spawnHazard() {
    const progress = Math.min(1, state.score / 120);
    const type = hazardTypes[(Math.random() * hazardTypes.length) | 0];
    const size = 26 + Math.random() * 24;
    const speedY = 210 + Math.random() * 110 + progress * 160;
    const minX = size + 8;
    const maxX = canvas.width - size - 8;
    // Spawn across the entire playable width; avoid repeatedly favouring the centre.
    const x = minX + Math.random() * Math.max(1, maxX - minX);

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
    if (controlMode === "tilt") {
        dir = Math.abs(tiltGamma) < 3 ? 0 : Math.max(-1, Math.min(1, tiltGamma / 18));
    } else {
        if (input.left) dir -= 1;
        if (input.right) dir += 1;
    }

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


function spawnPowerUp(type) {
    if (state.powerUps.length || !type) return;
    state.powerUps.push({
        type,
        x: 34 + Math.random() * (canvas.width - 68),
        y: -35,
        size: 22,
        speedY: 145 + Math.min(70, state.elapsed * 0.7),
        pulse: Math.random() * Math.PI * 2
    });
    state.powerUpAlert = {
        text: type === "speed" ? "SPEED BOOST INCOMING — COLLECT IT!" : "SHIELD INCOMING — COLLECT IT!",
        time: 2.6,
        type
    };
}
function updatePowerUps(dt) {
    // Shield stays on its original 30-point schedule. Speed has its own schedule.
    // Queue drops in score order so none are lost if the score clock jumps past them.
    while (state.score >= Math.min(state.nextShieldPowerUpScore, state.nextSpeedPowerUpScore)) {
        if (state.nextSpeedPowerUpScore < state.nextShieldPowerUpScore) {
            state.pendingPowerUps.push("speed");
            state.nextSpeedPowerUpScore += 60;
        } else {
            state.pendingPowerUps.push("shield");
            state.nextShieldPowerUpScore += 30;
        }
    }
    if (state.powerUps.length === 0 && state.pendingPowerUps.length) {
        spawnPowerUp(state.pendingPowerUps.shift());
    }
    if (state.speedBoost > 0) state.speedBoost = Math.max(0, state.speedBoost - dt);
    if (state.powerUpAlert) {
        state.powerUpAlert.time -= dt;
        if (state.powerUpAlert.time <= 0) state.powerUpAlert = null;
    }
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const item = state.powerUps[i];
        item.y += item.speedY * dt;
        item.pulse += dt * 4;
        if (Math.hypot(item.x - player.x, item.y - (player.y - 20)) < item.size + player.w * 0.38) {
            if (item.type === "speed") {
                state.speedBoost = 7;
                addParticles(item.x, item.y, "#ffd36a", 36, 1.35);
                state.powerUpAlert = { text: "SPEED BOOST ACTIVE — 2.5X SCORE!", time: 2.2, type: "speed" };
            } else {
                state.invulnerable = 5;
                state.shieldFade = 0;
                state.shieldWarningPlayed = false;
                addParticles(item.x, item.y, "#76fff2", 30, 1.25);
                state.powerUpAlert = { text: "SHIELD ACTIVE — 5 SECONDS!", time: 2.2, type: "shield" };
            }
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
        const speedType = item.type === "speed";
        const accent = speedType ? "#ffd36a" : "#62fff0";
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.scale(pulse, pulse);
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = accent;
        ctx.shadowBlur = 25;
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, item.size * 1.5);
        glow.addColorStop(0, "rgba(255,255,255,.98)");
        glow.addColorStop(.28, speedType ? "rgba(255,211,106,.9)" : "rgba(100,255,240,.9)");
        glow.addColorStop(1, "rgba(30,180,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, item.size * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, item.size * .72, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        if (speedType) {
            ctx.moveTo(3, -item.size * .52);
            ctx.lineTo(-item.size * .12, -item.size * .06);
            ctx.lineTo(item.size * .2, -item.size * .06);
            ctx.lineTo(-3, item.size * .52);
            ctx.lineTo(item.size * .12, item.size * .06);
            ctx.lineTo(-item.size * .2, item.size * .06);
        } else {
            ctx.moveTo(0, -item.size * .5);
            ctx.lineTo(item.size * .38, -item.size * .28);
            ctx.lineTo(item.size * .32, item.size * .18);
            ctx.lineTo(0, item.size * .5);
            ctx.lineTo(-item.size * .32, item.size * .18);
            ctx.lineTo(-item.size * .38, -item.size * .28);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    if (state.powerUpAlert) {
        const alert = state.powerUpAlert;
        const speedType = alert.type === "speed";
        ctx.save();
        ctx.globalAlpha = Math.min(1, alert.time * 1.5);
        ctx.textAlign = "center";
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = speedType ? "#ffd36a" : "#9bfff5";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillText(alert.text, canvas.width / 2, 68);
        ctx.restore();
    }
}

function updateDifficulty(dt) {
    // Speed boost advances the score clock 2.5x while real-time hazards stay fair.
    state.elapsed += dt * (state.speedBoost > 0 ? 2.5 : 1);
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
    const w = canvas.width, h = canvas.height, cx = w / 2;
    const sky = ctx.createLinearGradient(0, 0, w * .18, h);
    sky.addColorStop(0, "#172b49");
    sky.addColorStop(.28, "#0b1830");
    sky.addColorStop(.68, "#050d1e");
    sky.addColorStop(1, "#020611");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // Layered nebulae: soft colour clouds, not flat gradients.
    const clouds = [
        [72, 185, 230, "rgba(35,126,183,.22)"],
        [345, 360, 190, "rgba(86,64,153,.13)"],
        [205, 565, 245, "rgba(15,104,147,.12)"]
    ];
    for (const [x,y,radius,color] of clouds) {
        const cloud = ctx.createRadialGradient(x,y,2,x,y,radius);
        cloud.addColorStop(0,color); cloud.addColorStop(.42,color.replace(/\.\d+\)/, ".045)"));
        cloud.addColorStop(1,"rgba(10,25,55,0)");
        ctx.fillStyle=cloud; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
    }

    // Fine starfield with subtle parallax and occasional bright stars.
    for (const f of state.floaters) {
        const twinkle = .72 + Math.sin(state.elapsed * (1.4 + f.r) + f.x * .13) * .22;
        ctx.globalAlpha = Math.max(.12, Math.min(1, f.alpha * twinkle));
        ctx.fillStyle = f.r > 1.7 ? "#e4f8ff" : "#a6d7f4";
        if (f.r > 1.7) {
            ctx.shadowColor = "#8bdcff"; ctx.shadowBlur = 8;
            ctx.fillRect(f.x, f.y, f.r * 1.3, f.r * 1.3);
            ctx.shadowBlur = 0;
        } else {
            ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill();
        }
    }
    ctx.globalAlpha=1;

    // Large distant planet with limb glow, cloud bands, terminator and ring depth.
    ctx.save();
    ctx.translate(324, 222);
    ctx.rotate(-.2);
    ctx.strokeStyle="rgba(109,176,218,.12)"; ctx.lineWidth=13;
    ctx.beginPath(); ctx.ellipse(0,0,79,22,0,Math.PI,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(151,213,239,.42)"; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.ellipse(0,0,79,22,0,0,Math.PI); ctx.stroke();
    const limb=ctx.createRadialGradient(-10,-12,28,0,0,78);
    limb.addColorStop(0,"rgba(74,171,220,0)");
    limb.addColorStop(.72,"rgba(78,177,220,.04)");
    limb.addColorStop(1,"rgba(89,204,245,.36)");
    ctx.fillStyle=limb; ctx.beginPath(); ctx.arc(0,0,55,0,Math.PI*2); ctx.fill();
    const planet=ctx.createRadialGradient(-20,-24,3,8,4,60);
    planet.addColorStop(0,"#7299b0"); planet.addColorStop(.26,"#365c7a");
    planet.addColorStop(.68,"#1a3452"); planet.addColorStop(1,"#071226");
    ctx.fillStyle=planet; ctx.beginPath(); ctx.arc(0,0,53,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0,0,52,0,Math.PI*2); ctx.clip();
    for(let i=0;i<8;i++){
        const yy=-36+i*10;
        ctx.fillStyle=i%2?"rgba(149,198,218,.075)":"rgba(4,18,39,.12)";
        ctx.beginPath(); ctx.ellipse(-5+Math.sin(i)*8,yy,50-i*.8,3.2+(i%3),-.12,0,Math.PI*2); ctx.fill();
    }
    const night=ctx.createLinearGradient(-32,-8,56,15);
    night.addColorStop(0,"rgba(0,5,18,0)"); night.addColorStop(.48,"rgba(0,5,18,.18)"); night.addColorStop(1,"rgba(0,3,14,.88)");
    ctx.fillStyle=night; ctx.fillRect(-56,-56,112,112);
    ctx.restore();
    ctx.strokeStyle="rgba(142,203,228,.32)"; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.ellipse(0,0,79,22,0,Math.PI*1.03,Math.PI*1.97); ctx.stroke();
    ctx.restore();

    // Perspective flight corridor with animated floor-light bands.
    ctx.save();
    const horizon=355;
    const glow=ctx.createLinearGradient(0,horizon,0,h);
    glow.addColorStop(0,"rgba(45,172,221,.12)"); glow.addColorStop(1,"rgba(12,63,111,0)");
    ctx.fillStyle=glow; ctx.fillRect(0,horizon,w,h-horizon);
    for(let i=-6;i<=6;i++){
        ctx.strokeStyle=i===0?"rgba(79,202,245,.17)":"rgba(70,156,201,.085)";
        ctx.lineWidth=i===0?1.3:1;
        ctx.beginPath(); ctx.moveTo(cx+i*3,horizon); ctx.lineTo(cx+i*74,h); ctx.stroke();
    }
    const drift=(state.elapsed*70)%58;
    for(let y=horizon+drift;y<h+58;y+=58){
        const depth=(y-horizon)/(h-horizon);
        ctx.strokeStyle=`rgba(73,174,218,${.035+depth*.09})`;
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }
    ctx.restore();

    // Cinematic lens vignette and restrained bloom.
    const vignette=ctx.createRadialGradient(cx,h*.48,90,cx,h*.48,450);
    vignette.addColorStop(0,"rgba(0,0,0,0)"); vignette.addColorStop(.65,"rgba(0,2,12,.12)"); vignette.addColorStop(1,"rgba(0,2,12,.72)");
    ctx.fillStyle=vignette; ctx.fillRect(0,0,w,h);
}

function drawHero() {
    const moving=Math.min(1,Math.abs(player.vx)/player.maxSpeed);
    const bob=Math.sin(player.idleT*4.6)*1.5;
    const lean=Math.max(-.2,Math.min(.2,player.vx/player.maxSpeed*.2));
    ctx.save(); ctx.translate(player.x,player.y+bob-7); ctx.rotate(lean);

    // Volumetric engine light and layered exhaust.
    const aura=ctx.createRadialGradient(0,36,2,0,36,58);
    aura.addColorStop(0,"rgba(79,218,255,.3)"); aura.addColorStop(.45,"rgba(35,145,255,.12)"); aura.addColorStop(1,"rgba(35,145,255,0)");
    ctx.fillStyle=aura; ctx.fillRect(-60,-10,120,115);
    const flameLength=29+Math.sin(player.idleT*31)*5+moving*12;
    const outer=ctx.createLinearGradient(0,34,0,34+flameLength);
    outer.addColorStop(0,"rgba(232,255,255,.96)"); outer.addColorStop(.22,"#77eaff"); outer.addColorStop(.58,"#378cff"); outer.addColorStop(1,"rgba(52,90,255,0)");
    ctx.shadowColor="#40caff"; ctx.shadowBlur=20; ctx.fillStyle=outer;
    ctx.beginPath(); ctx.moveTo(-9,33); ctx.quadraticCurveTo(-14,51,0,34+flameLength); ctx.quadraticCurveTo(14,51,9,33); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    const core=ctx.createLinearGradient(0,34,0,59);
    core.addColorStop(0,"#ffffff"); core.addColorStop(.42,"#c5ffff"); core.addColorStop(1,"rgba(83,210,255,0)");
    ctx.fillStyle=core; ctx.beginPath(); ctx.moveTo(-3,34); ctx.quadraticCurveTo(-4,46,0,59); ctx.quadraticCurveTo(4,46,3,34); ctx.fill();

    // Cast shadow underneath the hull.
    ctx.fillStyle="rgba(0,0,0,.3)"; ctx.filter="blur(6px)";
    ctx.beginPath(); ctx.ellipse(2,30,25,44,0,0,Math.PI*2); ctx.fill(); ctx.filter="none";

    // Aerodynamic tail fins with separate upper/lower metal faces.
    const fin=ctx.createLinearGradient(-28,10,28,35);
    fin.addColorStop(0,"#713d43"); fin.addColorStop(.25,"#f6a16e"); fin.addColorStop(.62,"#d56b50"); fin.addColorStop(1,"#542c3c");
    ctx.fillStyle=fin;
    ctx.beginPath(); ctx.moveTo(-11,12); ctx.lineTo(-30,37); ctx.lineTo(-25,42); ctx.lineTo(-4,30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11,12); ctx.lineTo(30,37); ctx.lineTo(25,42); ctx.lineTo(4,30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(255,211,177,.58)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-13,17); ctx.lineTo(-27,36); ctx.moveTo(13,17); ctx.lineTo(27,36); ctx.stroke();

    // Main titanium hull with a bright left rim and shaded right side.
    const hull=ctx.createLinearGradient(-20,0,20,0);
    hull.addColorStop(0,"#354e68"); hull.addColorStop(.12,"#91b2c4"); hull.addColorStop(.3,"#e6f4f5");
    hull.addColorStop(.48,"#ffffff"); hull.addColorStop(.7,"#b6d2df"); hull.addColorStop(.88,"#5c7a94"); hull.addColorStop(1,"#263b54");
    ctx.shadowColor="rgba(67,205,255,.35)"; ctx.shadowBlur=13; ctx.fillStyle=hull;
    ctx.beginPath(); ctx.moveTo(0,-56); ctx.bezierCurveTo(12,-45,20,-20,18,8); ctx.lineTo(14,33);
    ctx.quadraticCurveTo(0,39,-14,33); ctx.lineTo(-18,8); ctx.bezierCurveTo(-20,-20,-12,-45,0,-56); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;

    // Longitudinal armor panels, seams, rivets and edge reflections.
    ctx.save(); ctx.beginPath(); ctx.moveTo(0,-51); ctx.bezierCurveTo(10,-38,14,-13,13,22); ctx.lineTo(9,31); ctx.lineTo(-9,31); ctx.lineTo(-13,22); ctx.bezierCurveTo(-14,-13,-10,-38,0,-51); ctx.clip();
    const panel=ctx.createLinearGradient(-18,-20,18,20);
    panel.addColorStop(0,"rgba(255,255,255,.42)"); panel.addColorStop(.36,"rgba(255,255,255,.04)"); panel.addColorStop(1,"rgba(4,18,35,.48)");
    ctx.fillStyle=panel; ctx.fillRect(-20,-58,40,100);
    ctx.fillStyle="rgba(36,70,96,.18)"; ctx.fillRect(8,-12,10,44);
    ctx.strokeStyle="rgba(35,67,91,.36)"; ctx.lineWidth=.8;
    ctx.beginPath(); ctx.moveTo(-9,-5); ctx.lineTo(-8,25); ctx.moveTo(9,-5); ctx.lineTo(8,25); ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,.32)"; ctx.beginPath(); ctx.moveTo(-2,-44); ctx.quadraticCurveTo(-12,-10,-10,22); ctx.stroke();
    for(const side of [-1,1]) for(let y=-2;y<=20;y+=11){ctx.fillStyle="rgba(29,54,76,.65)";ctx.beginPath();ctx.arc(side*11,y,1,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    ctx.strokeStyle="rgba(238,252,255,.6)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,-50); ctx.bezierCurveTo(-12,-35,-15,-4,-13,22); ctx.stroke();

    // Nose cone seam and heat-resistant orange service band.
    ctx.strokeStyle="rgba(255,255,255,.56)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-5,-43); ctx.quadraticCurveTo(0,-52,5,-43); ctx.stroke();
    const stripe=ctx.createLinearGradient(-17,0,17,0);
    stripe.addColorStop(0,"#a64f42"); stripe.addColorStop(.25,"#ffb27a"); stripe.addColorStop(.72,"#f17b55"); stripe.addColorStop(1,"#783d43");
    ctx.fillStyle=stripe; ctx.fillRect(-17,12,34,6);
    ctx.strokeStyle="rgba(255,224,196,.48)"; ctx.strokeRect(-17,12,34,6);

    // Multi-layer cockpit glass with reflective glint.
    ctx.fillStyle="rgba(3,28,51,.7)"; ctx.beginPath(); ctx.ellipse(0,-21,11,14,0,0,Math.PI*2); ctx.fill();
    const glass=ctx.createRadialGradient(-4,-27,1,1,-19,15);
    glass.addColorStop(0,"#f0ffff"); glass.addColorStop(.18,"#a2f7ff"); glass.addColorStop(.48,"#42bfe1"); glass.addColorStop(.82,"#17618c"); glass.addColorStop(1,"#09243e");
    ctx.fillStyle=glass; ctx.beginPath(); ctx.ellipse(0,-21,8.5,11,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(229,255,255,.85)"; ctx.lineWidth=1.1; ctx.beginPath(); ctx.ellipse(0,-21,9.5,12.5,0,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,.78)"; ctx.beginPath(); ctx.ellipse(-3,-26,2.2,3.6,-.5,0,Math.PI*2); ctx.fill();

    // Engine nozzle, inner ceramic ring and navigation lamps.
    const nozzle=ctx.createLinearGradient(-9,0,9,0);
    nozzle.addColorStop(0,"#182b40"); nozzle.addColorStop(.5,"#91b5c8"); nozzle.addColorStop(1,"#1b2e44");
    ctx.fillStyle=nozzle; roundRect(-9,29,18,11,3); ctx.fill();
    ctx.strokeStyle="rgba(218,244,255,.78)"; ctx.lineWidth=1.2; ctx.stroke();
    ctx.fillStyle="#243c55"; ctx.fillRect(-5,32,10,4);
    for(const side of [-1,1]){
        ctx.fillStyle="#ffb87c"; ctx.shadowColor="#ff8e61"; ctx.shadowBlur=9;
        ctx.beginPath(); ctx.arc(side*22,34,2.1,0,Math.PI*2); ctx.fill();
    }
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
    ctx.save(); ctx.scale(size/38,size/38);
    // Dark contact shadow and torn metallic fuselage.
    ctx.fillStyle="rgba(0,3,12,.52)"; ctx.filter="blur(4px)";
    ctx.beginPath(); ctx.ellipse(2,10,29,19,-.2,0,Math.PI*2); ctx.fill(); ctx.filter="none";
    const hull=ctx.createLinearGradient(-19,-24,18,23);
    hull.addColorStop(0,"#e3f4fa"); hull.addColorStop(.16,"#91b8ce"); hull.addColorStop(.4,"#4b718f"); hull.addColorStop(.72,"#20364f"); hull.addColorStop(1,"#09172b");
    ctx.fillStyle=hull; ctx.strokeStyle="#bdeeff"; ctx.lineWidth=1.7;
    ctx.beginPath(); ctx.moveTo(-12,-24); ctx.lineTo(7,-20); ctx.lineTo(16,-7); ctx.lineTo(12,8); ctx.lineTo(4,23); ctx.lineTo(-13,16); ctx.lineTo(-19,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Exposed inner structure and snapped wing.
    ctx.fillStyle="#101d30"; ctx.beginPath(); ctx.moveTo(-5,-12); ctx.lineTo(9,-8); ctx.lineTo(12,6); ctx.lineTo(2,15); ctx.lineTo(-8,7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(221,248,255,.5)"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(-10,-19); ctx.lineTo(3,-14); ctx.lineTo(9,-5); ctx.stroke();
    const wing=ctx.createLinearGradient(-25,0,-4,20); wing.addColorStop(0,"#f7a06d"); wing.addColorStop(.4,"#a95c50"); wing.addColorStop(1,"#35455c");
    ctx.fillStyle=wing; ctx.beginPath(); ctx.moveTo(-11,8); ctx.lineTo(-31,24); ctx.lineTo(-7,18); ctx.lineTo(-2,11); ctx.fill();
    ctx.fillStyle="#c7dbe6"; ctx.beginPath(); ctx.moveTo(9,-8); ctx.lineTo(29,-23); ctx.lineTo(17,2); ctx.lineTo(12,5); ctx.fill();
    // Glowing damaged reactor, sparks and panel details.
    const reactor=ctx.createRadialGradient(-1,-8,1,0,-7,9);
    reactor.addColorStop(0,"#ffffff"); reactor.addColorStop(.25,"#8fffff"); reactor.addColorStop(1,"rgba(44,186,255,0)");
    ctx.fillStyle=reactor; ctx.shadowColor="#55eaff"; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(0,-7,9,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle="#ffb16d";
    for(const [x,y] of [[-18,15],[17,-13],[7,20]]){ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle="rgba(228,247,255,.42)"; ctx.lineWidth=.8; ctx.beginPath(); ctx.moveTo(-12,2); ctx.lineTo(-5,8); ctx.moveTo(5,-17); ctx.lineTo(11,-11); ctx.stroke();
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
    const shieldActive = state.invulnerable > 0 || state.shieldFade > 0;
    const speedActive = state.speedBoost > 0;
    if (!shieldActive && !speedActive) return;

    const warning = state.invulnerable > 0 && state.invulnerable <= 2;
    const remaining = Math.max(0, state.invulnerable);
    const label = speedActive
        ? `SPEED BOOST  2.5X  ${state.speedBoost.toFixed(1)}s`
        : state.shieldFade > 0 ? "SHIELD ENDING" : `SHIELD  ${remaining.toFixed(1)}s`;
    const color = speedActive ? "#ffd36a" : warning ? "#ffc66e" : "#9bfff5";
    const barWidth = 112;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 24;

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(label, canvas.width / 2, barY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.fillRect(barX, barY + 8, barWidth, 4);
    ctx.fillStyle = color;
    const progress = speedActive ? state.speedBoost / 7 : state.shieldFade > 0 ? state.shieldFade / 0.6 : remaining / 5;
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

    if (state.running && !state.paused) {
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

function setControlMode(mode) {
    if (!["buttons", "split", "tilt"].includes(mode)) return;
    controlMode = mode;
    localStorage.setItem(CONTROL_MODE_KEY, mode);
    controlModeInputs.forEach((radio) => { radio.checked = radio.value === mode; });
    input.left = false;
    input.right = false;
    document.body.dataset.controlMode = mode;
}

function pauseGame() {
    if (!state.running || state.gameOver) return;
    state.paused = !state.paused;
    input.left = false;
    input.right = false;
    if (pauseBtn) {
        pauseBtn.textContent = state.paused ? "▶" : "Ⅱ";
        pauseBtn.setAttribute("aria-label", state.paused ? "Resume game" : "Pause game");
    }
    if (!state.paused) state.lastTime = 0;
}

function resumeGame() {
    if (!state.running || !state.paused) return;
    state.paused = false;
    if (pauseBtn) {
        pauseBtn.textContent = "Ⅱ";
        pauseBtn.setAttribute("aria-label", "Pause game");
    }
    state.lastTime = 0;
}

async function enableTiltControl() {
    if (typeof DeviceOrientationEvent === "undefined") {
        showControlMessage("Tilt control is not supported on this device. Choose another mode.");
        setControlMode("buttons");
        return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== "granted") throw new Error("Motion permission was not granted.");
        } catch (error) {
            showControlMessage("Allow motion access to use tilt control, or choose another mode.");
            setControlMode("buttons");
            return;
        }
    }
    tiltPermissionGranted = true;
    showControlMessage("Tilt control enabled. Tilt gently to steer.");
}

function showControlMessage(message) {
    const el = document.getElementById("controlMessage");
    if (el) el.textContent = message;
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

if (pauseBtn) pauseBtn.addEventListener("click", pauseGame);
if (resumeBtn) resumeBtn.addEventListener("click", resumeGame);
controlModeInputs.forEach((radio) => radio.addEventListener("change", async () => {
    if (!radio.checked) return;
    setControlMode(radio.value);
    if (radio.value === "tilt") await enableTiltControl();
    else showControlMessage("Control mode saved for your next visit.");
}));
if (splitTouchZone) {
    const steerFromTouch = (event) => {
        if (!state.running || state.paused || controlMode !== "split") return;
        event.preventDefault();
        const rect = splitTouchZone.getBoundingClientRect();
        const x = event.clientX - rect.left;
        input.left = x < rect.width / 2;
        input.right = !input.left;
    };
    splitTouchZone.addEventListener("pointerdown", (event) => { splitTouchZone.setPointerCapture?.(event.pointerId); steerFromTouch(event); });
    splitTouchZone.addEventListener("pointermove", (event) => { if (event.buttons || event.pressure > 0) steerFromTouch(event); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => splitTouchZone.addEventListener(type, () => { input.left = false; input.right = false; }));
}
window.addEventListener("deviceorientation", (event) => {
    if (controlMode === "tilt" && tiltPermissionGranted && Number.isFinite(event.gamma)) tiltGamma = event.gamma;
});
setControlMode(controlMode);

playBtn.addEventListener("click", startGame);
if (powerTipsToggle && powerTipsPanel) {
    powerTipsToggle.addEventListener("click", () => {
        const opening = powerTipsPanel.hidden;
        powerTipsPanel.hidden = !opening;
        powerTipsToggle.setAttribute("aria-expanded", String(opening));
        powerTipsToggle.querySelector("span").textContent = opening ? "－" : "＋";
    });
}
restartBtn.addEventListener("click", startGame);
menuBtn.addEventListener("click", () => {
    state.running = false;
    state.paused = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
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

function resizeGameCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const logicalHeight = Math.max(500, Math.round(canvas.width * rect.height / rect.width));
    if (canvas.height !== logicalHeight) {
        canvas.height = logicalHeight;
        if (typeof player !== "undefined") {
            player.y = Math.min(canvas.height - 92, Math.max(90, player.y));
        }
    }
}

window.addEventListener("resize", resizeGameCanvas, { passive: true });
window.addEventListener("orientationchange", () => {
    requestAnimationFrame(resizeGameCanvas);
}, { passive: true });

// Initial UI setup
resizeGameCanvas();
updateScoreDisplays();
setScreen("menu");
state.floaters = createFloaters(34);
requestAnimationFrame(loop);
