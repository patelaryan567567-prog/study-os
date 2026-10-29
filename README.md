# StudyOS

StudyOS is a React, TypeScript, and Vite productivity workspace for studying. It runs as a browser application and includes Electron and Capacitor Android wrappers. The codebase provides study planning, focus tools, task and revision management, progress analytics, optional Firebase sync/authentication, a Gemini assistant, and a native Android app-blocker path.

## Features

- Dashboard, planner, tasks, lectures, modules tracker, backlog, revision, notes, calendar, reminders, and profile views.
- Focus/Pomodoro timer, statistics, XP/gamification, charts, command palette, keyboard shortcuts, themes, and accessibility/reduced-motion preferences.
- Browser-local persistence with IndexedDB/local storage, with optional Firebase Authentication and Firestore profile/data sync.
- Gemini study assistant with image attachments, streaming replies, contextual study data, up to three user-provided keys, timeout/error handling, and rotation after quota/rate-limit failures.
- Browser notifications with Capacitor-native fallbacks.
- Electron desktop build, including an optional Windows signing workflow, and a Capacitor Android project with Google/Firebase authentication plumbing.
- Android-only app blocker support using the included native Android service code.

## Technology

- React 18, TypeScript, Vite 8, React Router, Tailwind CSS, Framer Motion, Zustand, Chart.js, and IndexedDB (`idb`).
- Firebase web SDK and Capacitor Firebase Authentication.
- Google Generative AI SDK for the optional client-side assistant.
- Electron/electron-builder for Windows; Capacitor/Gradle for Android.

## Prerequisites

- Node.js **22.12.0 or newer** (enforced in `package.json`) and npm.
- Firebase project values if you want login/cloud sync.
- A Gemini API key if you want the assistant.
- Android Studio/JDK and Android SDK only for Android work; Windows tooling only for Electron packaging/signing.

## Run locally

```bash
npm install
npm run dev
```

The `predev` hook prepares a runtime Firebase configuration before Vite starts. Without valid Firebase configuration, the app remains usable in its safe local/demo path; cloud sign-in and sync require configuration.

## Environment configuration

Copy `.env.local.example` to `.env.local` and fill in your Firebase web-app settings:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional emulator settings
VITE_FIREBASE_USE_EMULATOR=false
VITE_FIREBASE_EMULATOR_AUTH_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_EMULATOR_FIRESTORE_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_FIRESTORE_PORT=8080
```

At runtime, the app can also read a Firebase configuration from `public/firebase-config.json` and persist a usable configuration locally. Firebase web configuration values are not private credentials, but Firestore rules and API restrictions still need to be configured carefully.

Gemini keys are entered through the app and stored locally; when Firebase is configured and a user is signed in, the app can sync them to the user's profile. Treat them as sensitive, do not commit them, and review this design before using it in a shared or production environment.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Prepare Firebase runtime config and start Vite. |
| `npm run build` | Type-check and build the web app. |
| `npm run lint` | Run Oxlint. |
| `npm run preview` | Preview the production web build. |
| `npm run electron:dev` | Build the Electron main process and run Electron. |
| `npm run electron` | Build the web and Electron outputs, then run Electron. |
| `npm run electron:build` | Package a Windows installer with electron-builder. |
| `npm run app:build` | Build/package the Windows app using the same configuration. |
| `npm run sign` | Run the repository signing script for an existing release. |

## Desktop and Android builds

### Electron / Windows

Run `npm run electron:dev` during development. For a Windows installer, run `npm run electron:build` (or `npm run app:build`). The electron-builder configuration writes artifacts to `release/` and uses `build/` for icon resources. See `SIGNING_SETUP.md` before configuring signing; use deployment secrets or a certificate store for certificate material and passwords.

### Capacitor / Android

The Capacitor configuration uses `dist` as its web directory and identifies the app as `com.studyos.app`. Build the web assets first, then follow the Android project guidance in `android/README.md` to sync/open the Android project in Android Studio. Native Google sign-in is configured to hand the credential to the web Firebase SDK (`skipNativeAuth: true`).

## Project layout

```text
src/
  modules/       Study features and route-level modules
  components/    UI, layout, productivity, and focus components
  services/      Firebase, AI, notifications, persistence, and native bridges
  routes/        Routes and authentication guards
electron/        Desktop main process and packaging support
android/         Capacitor Android project and native blocker implementation
scripts/         Build, validation, configuration, and release helpers
```

## Limitations

- Firebase sync, Google sign-in, notifications, Gemini, Electron packaging, and Android-specific capabilities require their respective configuration and supported platform.
- The repository contains verification scripts but no conventional unit-test suite. Use `npm run build`, `npm run lint`, and the relevant platform build as available checks.
- Gemini responses, model availability, and rate limits are controlled by Google; the assistant is a study aid, not verified academic guidance.
- The Android app-blocker path depends on platform permissions and native Android behaviour; it is not available in a normal browser or Electron session.

