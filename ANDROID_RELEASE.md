# ASTRIXAL Android release preparation

## What this project does
- Keeps the existing HTML canvas game and responsive layout.
- Packages the local web assets into an Android Capacitor app (no remote website dependency for the game screen).
- Keeps the existing Supabase project, profiles, leaderboard tables, and player records untouched.
- Uses application ID `com.shasil.astrixal`.

## Build
Requirements: Node.js 20+, Android Studio, Android SDK, Java 17.

```bash
npm install
npx cap add android
npm run android:sync
npx cap open android
```

For local builds:
```bash
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

The GitHub Actions workflow builds a debug APK for device testing and an **unsigned** release AAB. A signed AAB must be produced with a private upload keystore. Never commit the keystore or passwords to GitHub.

## Release blockers to resolve before Play production
1. Configure OAuth redirects for the Android app. The existing Google OAuth callback is the GitHub Pages URL; do not assume it works inside the packaged app. Implement and test a verified deep-link callback (custom scheme or HTTPS App Links) with Supabase and Google Cloud.
2. Test email login, Google login, password reset, profile/avatar upload, score submission and leaderboard on a physical Android device. Confirm RLS policies and storage access.
3. Review privacy policy, Data safety, ads declaration, target API, content rating, app access and account deletion requirements in Play Console.
4. Add a public privacy policy and support contact. Disclose Supabase processing and any future ad/analytics SDKs accurately.
5. Decide and implement monetization only after consent, privacy and ad placement testing. No ad SDK or purchase SDK is included yet.
6. Verify ASTRIXAL name/trademark and store listing availability before publishing.

## Player data
The wrapper does not change Supabase schema, credentials, tables or user IDs. Keep the same Supabase project to preserve current accounts and leaderboard data. Local high score storage remains on each device/browser installation and is not automatically migrated between browser and app storage.

## Important
The workflow's release AAB is unsigned and is not Play-Store upload ready. Sign it using a private keystore in a secure local environment or GitHub Actions secrets after the app is tested. Do not share secrets in chat.
