Firebase Setup (StudyOS)

1. Create a Firebase project
   - Go to https://console.firebase.google.com and create a new project.
   - Enable Authentication -> Sign-in methods: Google and Email/Password.
   - Create a Web App in project settings and copy the config values.

2. Firestore
   - In Firestore -> Create database -> start in production mode.
   - Deploy the security rules in this repo before using the app: `firebase deploy --only firestore:rules`
   - Never use open/test-mode rules: every user document in `users/{uid}` (and its
     subcollections) is readable and writable by anyone if rules are open, because the
     app talks to Firestore directly from the browser.

3. Add config to the project
   - Copy .env.local.example to .env.local
   - Fill VITE*FIREBASE*\* keys with your project values

4. Running locally
   - npm install (or yarn)
   - npm run dev
   - Open http://localhost:5173

5. Optional: Emulators
   - Install Firebase CLI and run emulators for local development
   - Set FIREBASE_USE_EMULATOR and emulator host/port in your .env.local if desired

Notes

- This repository uses Vite. Environment variables exposed to the renderer must be prefixed with VITE\_.
- Keep real credentials out of source control. Use CI secrets for production builds.
- IndexedDB persistence is attempted for Firestore for offline support, but may fail in multi-tab or unsupported environments.
