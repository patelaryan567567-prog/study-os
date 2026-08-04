# Changelog

All notable changes to this project are documented in this file.

## Unreleased - 2026-08-04

- Add Electron scaffolding: `electron/main.ts`, `electron/preload.ts`, auto-update placeholder and `electron-builder.yml`.
- Add Capacitor Android prep: `capacitor.config.ts`, `src/native/capacitorBridge.ts`, and `android/README.md`.
- Fix TypeScript build errors across modules (remove unused imports, duplicate exports, and type issues).
- Improve performance: lazy-load route pages with `React.lazy` and `Suspense` to reduce initial bundle size.
- Add `DOCUMENTATION.md` and update `PROJECT_STATUS.md` with Capacitor/Electron status.
- Misc: remove duplicate module placeholders and deduplicate code paths.
