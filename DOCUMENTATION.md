StudyOS - Documentation (auto-generated)

Overview

- StudyOS is a Vite + React + TypeScript web app with optional Electron and Capacitor mobile wrappers.
- Key modules: Dashboard, Focus (Pomodoro), Tasks, Lectures, Modules Tracker, Backlog, Notes, Analytics, Gamification, Calendar, Reminders, Settings.

Local development

- Install deps: `npm install`
- Run dev server: `npm run dev`
- Build production: `npm run build`

Electron

- Electron scaffolding exists in `electron/` (main.ts, preload.ts, autoUpdater.ts).
- To run locally: `npm run electron:dev` (may need native deps installed).
- Packaging requires `electron-builder` and platform configuration.

Android (Capacitor)

- Capacitor config: `capacitor.config.ts`.
- Bridge helpers: `src/native/capacitorBridge.ts` (uses runtime checks and web fallbacks).
- See `android/README.md` for instructions to add Android platform and build in Android Studio.

Notifications & Offline

- The app uses the Web Notification API for browsers and the Capacitor plugins when running natively.
- Offline-first: modules persist to `localStorage` keys prefixed with `studyos_`.

Performance

- Routes are lazy-loaded via `React.lazy` in `src/routes/AppRoutes.tsx` to reduce initial bundle size.

Testing

- No unit tests are included. Run `npm run build` to verify TypeScript and production bundling.

Contributing

- Follow project TypeScript and formatting rules. Run `npm run lint` before PRs.
