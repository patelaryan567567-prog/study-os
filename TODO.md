# StudyOS TODO

Last updated: 2026-08-04

## Build and Firebase

- [x] Restore dependencies, commit a lockfile, and align Vite/React-plugin/TypeScript compatibility.
- [x] Add TypeScript `@/*` path mapping to match Vite.
- [x] Configure Firebase initialization, emulator settings, Authentication service, and Firestore service.
- [x] Resolve TypeScript diagnostics and verify `npm run build`.
- [x] Implement email/password authentication, Google sign-in, protected routes, persistent login, logout, and profile management.
- [ ] Enable Firebase Email/Password and Google providers, configure authorized domains, and define Firestore security rules in the Firebase console before release.

## First product slice

- [x] Dashboard UI: cards, charts, widgets, dark theme, and responsive layout with static display data.
- [x] Connect Dashboard to real-time Firestore user profile and study-session data for time totals, XP, coins, and streaks.
- [ ] Task Manager: create, edit, complete, filter, and persist tasks.
- [ ] Focus Mode: Pomodoro/custom timer, session recording, and XP reward.
- [x] Authentication UI: sign-in/sign-up/account actions with persistent Firebase sessions and profile controls.
- [ ] Connect user profile, tasks, and study sessions to the configured Firestore services.

## Planned modules

- [ ] Study Planner
- [ ] Lecture Tracker
- [ ] Module Tracker
- [ ] Backlog Manager
- [ ] Revision Manager
- [ ] Notes and Flashcards
- [ ] Analytics (Chart.js)
- [ ] Achievements and streaks
- [ ] Calendar
- [ ] Gemini-powered AI Assistant
- [ ] Settings

## Platform and quality

- [x] Establish page, route, layout, reusable component, and theme architecture boundaries.
- [ ] Add Electron main and preload processes plus a secure IPC boundary.
- [ ] Add Electron build/packaging configuration.
- [ ] Replace Vite-template README and browser title with StudyOS documentation and branding.
- [ ] Add automated checks for store, service, and core module behavior.
- [ ] Define Firestore security rules and production environment-variable workflow.
