<div align="center">

# ✦ VOIDRUN

### THE VOID IS HUNGRY. HOW LONG CAN YOU SURVIVE?

A neon-soaked arcade survival game. Pilot through the darkness, dodge incoming hazards, and push your high score further with every run.

[**▶ PLAY VOIDRUN**](https://s-hasil.github.io/rage-game/)

<br/>

![GitHub Pages](https://img.shields.io/badge/PLAY-ON%20GITHUB%20PAGES-63E6F2?style=for-the-badge&logo=github&logoColor=07111F)
![HTML5](https://img.shields.io/badge/BUILT%20WITH-HTML%20%2F%20CSS%20%2F%20JS-111D31?style=for-the-badge)
![STATUS](https://img.shields.io/badge/STATUS-ARCADE%20LIVE-8CF4EF?style=for-the-badge)

</div>

---

## 🚀 ENTER THE VOID

This is **VOIDRUN** — a fast-paced browser arcade game where every second counts. Take control of your ship, weave between dangerous space debris, and survive as the challenge ramps up.

No installs. No downloads. Just open the game and fly.

## ⚡ GAME FEATURES

| FEATURE | WHAT TO EXPECT |
|:--|:--|
| 🌌 **Atmospheric visuals** | A dark space environment, glowing effects, particles, and drifting stars |
| ☄️ **Survival gameplay** | Dodge hazards and stay alive as the pace gets faster |
| 🏆 **Personal best** | Chase your highest score across runs |
| 👤 **Pilot accounts** | Create an account or sign in to access the game |
| 🌍 **Global leaderboard** | Compare your best run with other pilots |
| 🔊 **Sound controls** | Toggle the game audio on or off |
| 📱 **Mobile controls** | Touch buttons for left and right movement |

## 🎮 HOW TO PLAY

1. Open [VOIDRUN](https://s-hasil.github.io/rage-game/).
2. Sign in, create a pilot account, or use Google sign-in.
3. Launch your mission.
4. Move left and right to avoid incoming hazards.
5. Survive, build your score, and aim for the leaderboard.

**Desktop:** use the on-screen controls or your keyboard's left/right arrow keys.

**Mobile:** use the touch controls displayed in the game.

## 🧑‍🚀 PILOT ACCOUNTS & LEADERBOARD

VOIDRUN uses **Supabase** for player authentication and online score storage.

- Email and password registration/sign-in
- Google sign-in (requires Google OAuth configuration in Supabase)
- Pilot profiles
- Global leaderboard showing each pilot's best recorded score

### Supabase setup

If you're running your own copy:

1. Create a project at [Supabase](https://supabase.com/).
2. Open the project's **SQL Editor**.
3. Run the SQL in [`supabase-setup.sql`](./supabase-setup.sql).
4. Configure the Supabase project URL and publishable key in `game.js`.
5. For Google sign-in, enable the Google provider in **Authentication → Sign In / Providers** and add your Google OAuth credentials.
6. Add your deployed site URL to Supabase's **Authentication → URL Configuration**. Add the Supabase callback URL to your Google OAuth client's authorized redirect URIs.

> **Security note:** The browser uses a Supabase publishable key, which is intended for client-side use. Never put a Supabase `service_role` key or other secret credentials in frontend code. Keep Row Level Security enabled.

## 🛠️ RUN IT LOCALLY

No build step is required.

```bash
git clone https://github.com/s-hasil/rage-game.git
cd rage-game
```

Open `index.html` in a local web server or use the VS Code Live Server extension. Configure your own Supabase project if you want authentication and online scores to work.

## 🌐 DEPLOYMENT

VOIDRUN is designed to run as a static site on GitHub Pages.

1. Fork or clone this repository.
2. Push your changes to GitHub.
3. In **Settings → Pages**, select the `main` branch as the deployment source.
4. Open your published Pages URL.

## 🧰 BUILT WITH

- **HTML5** — game structure and canvas
- **CSS3** — responsive layout and visual effects
- **JavaScript** — gameplay, animation, input, and scoring
- **Supabase** — authentication, player profiles, and leaderboard data

## 🛰️ PROJECT

**Repository:** [s-hasil/rage-game](https://github.com/s-hasil/rage-game)  
**Play:** [s-hasil.github.io/rage-game](https://s-hasil.github.io/rage-game/)

---

<div align="center">

### YOUR SHIP. YOUR RUN. YOUR RECORD.

**DON'T BLINK. THE VOID DOESN'T WAIT.**

Made with ☄️ by [s-hasil](https://github.com/s-hasil)

</div>
