# Tactical Aim Lab — Mobile

A complete **offline Android tactical-shooter sandbox** demonstrating target locking, ESP overlays, projectile wall penetration, and configurable aim smoothing. It also runs in a modern mobile/desktop browser from `web/index.html`.

**Not a Standoff 2 cheat.** This project does not attach to, modify, bypass anti-cheat for, read memory from, or inject code into Standoff 2. All mechanics affect only the local practice arena.

## Features
- **Aimbot:** interpolated target locking with line-of-sight selection. Automatically considers covered targets when wall penetration is enabled.
- **ESP:** bounding boxes, names, and visibility status, including behind cover.
- **Shoot through walls:** ray-based collision geometry with an opt-in penetration switch.
- **Smooth aim:** adjustable 0–100 aim turn speed.
- **Mobile:** left drag to move, right drag to aim, hold FIRE to shoot. Supports multi-touch.
- **Desktop:** WASD or arrows to move, mouse to aim, click or space to fire.
- **Stats:** kills, shots, accuracy; reset match and restore defaults.
- **Privacy:** offline WebView wrapper; no internet permission or user data collection.

## Build an APK
1. Go to **Actions → Build Android APK → Run workflow** (or push to main).
2. Open the completed workflow run and download `TacticalAimLab-debug-apk`.
3. Extract the ZIP and install `app-debug.apk` on Android 6.0 or later.

Or use Gradle 8.9, JDK 17 and Android SDK 35:

```sh
node --test tests/*.test.cjs
gradle :app:assembleDebug
```

The APK is a debug build for private testing, not a Play Store release.

## Architecture
- `web/engine.js` — pure geometry and aiming core (testable using Node.js).
- `web/app.js` — frame loop, bot behavior, rendering, input, settings.
- `web/index.html` — responsive standalone UI.
- `app/src/main/java/com/ollfx/aimlab/MainActivity.kt` — offline Android WebView host.
- `tests/engine.test.cjs` — collision and aim tests.
- `.github/workflows/build-apk.yml` — continuous test and Android APK build.

No root, accessibility service, overlay permission, package injection or networking required.
