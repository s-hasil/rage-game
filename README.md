# ASTRIXAL

### SPACE SURVIVAL ARCADE

ASTRIXAL is the Android + web release identity for the existing space survival game.

- **Web:** https://s-hasil.github.io/rage-game/
- **Repository:** https://github.com/s-hasil/rage-game
- **Android application ID:** `com.shasil.astrixal`

## Existing player data
The current Supabase project, authentication users, profiles, score rows and leaderboard are intentionally retained. Do not create a replacement Supabase project or rerun destructive migrations for this rebrand.

## Android preparation
The game is being packaged with Capacitor. See [ANDROID_RELEASE.md](./ANDROID_RELEASE.md) for setup, build instructions and release blockers.

## Web build
```bash
npm install
npm run build:web
```

The Android package uses local copies of `index.html`, `style.css` and `game.js`. The GitHub Pages site remains available separately.
