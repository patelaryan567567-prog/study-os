# StudyOS — Android Build & Setup

StudyOS ships as a Capacitor web app wrapped in a native Android shell. This folder
(`android/`) contains the Android project. The bundled assets are copied from the
web build (`dist/`) by `npx cap sync android`.

## What was added for the APK to actually work on Android

- **Native App/Website Blocker** (`com/studyos/app/blocker/`): a Capacitor plugin
  (`AppBlocker`) plus a foreground service that reads real usage time, a full-screen
  block overlay, a DNS-filter VPN for website blocking, and a boot receiver.
- **Native Google Sign-In** via `@capacitor-firebase/authentication`. The old
  `signInWithPopup` used by the web build cannot return to the Capacitor WebView
  (that is why you saw a **white page after picking an account**); the native build
  signs in with Google Play services and bridges the credential into the web SDK.
- **Safe-area + performance fixes** for edge-to-edge screens and the lower-end
  WebView (backdrop blur / heavy animations disabled in the native build so it
  stops lagging and content stays inside the screen).

## One-time Firebase setup (required for Google Sign-In)

The web config is already bundled (`src/main/assets/firebase-config.json`). But the
**native** Google sign-in SDK needs the Firebase **Android** app registered too.

1.  Open your Firebase project (`study-os-f9bba`) in the [Firebase console][fb].
2.  **Add app → Android** with package name **`com.studyos.app`**.
    - App nickname, e.g. `StudyOS Android`.
    - **Register app.**
3.  Firebase shows **Download `google-services.json`** — download it and save it here:
    `android/app/google-services.json`
    (`android/app/build.gradle` auto-applies the Google services plugin when the
    file is present — no manual Gradle edit needed.)
4.  Get the app's **SHA-1** fingerprint (from Android Studio → Gradle → `signingReport`,
    or your keystore) and paste it on the project **Settings → Your apps / General** page.
    Google Play services uses the SHA-1 to build the OAuth client it needs for sign-in.
5.  Still in the console: **Authentication → Sign-in method → enable Google** (and
    Email/Password if you use it).

> Without `google-services.json`, Google sign-in shows the message: *“Google sign-in
> needs the Android app registered in Firebase…”* — that is expected until step 2–4
> are done.

## Build the APK

Prerequisites: Android Studio (or a JDK 21 + Android SDK), and `npm`.

```bash
# 1. Install JS deps and build the web app (already done in the repo, but re-run after code changes)
npm install
npm run build

# 2. Sync the new web build + native plugins into the Android project
npx cap sync android

# 3. Open the Android project and build
npx cap open android
# or build from the CLI:
cd android && ./gradlew assembleDebug
```

The debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.
For a signed release APK/AAB use Android Studio → **Build → Generate Signed
Bundle/APK**.

## Using the blocker on a phone (grant toggles)

After starting the App Blocker page, tap **Grant Permission** and allow:

1. **Usage access** (Settings → Apps → StudyOS → Usage access) — needed to read
   real per-app usage.
2. **Display over other apps** — needed to show the full-screen “Blocked” overlay.
3. **Notifications** (Android 13+) — for the ongoing blocker notification.

Website blocking additionally asks for a **VPN** consent dialog ("StudyOS wants to set
up a VPN connection"). Accept it to filter blocked domains through a local DNS tunnel.

Notes / limitations:
- The VPN filters **DNS**, so it applies to apps that use the system resolver
  (Chrome, most apps). A browser configured to use its own **secure/DNS-over-HTTPS**
  may bypass it — turn off “Private DNS” / secure DNS if a site slips through.
- Real *app force-close* needs device-owner/root; StudyOS instead overlays a block
  screen on the offending app every ~20 s, which is how normal self-control apps work.

[fb]: https://console.firebase.google.com/
