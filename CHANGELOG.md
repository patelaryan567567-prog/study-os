# Changelog

All notable changes to this project are documented in this file.

## Unreleased - 2026-09-04

- Fix AI 404 spam: `gemini-1.5-flash` was retired by Google (it now 404s for every key) — removed it from the model chain, added the `gemini-flash-latest` alias (always the current stable Flash) and `gemini-2.5-flash-lite` as fallbacks; the resolved model is cached for 24h and the cache auto-invalidates when a model starts 404ing.
- Overloaded (503/500) replies now fall through to the next model in the chain instead of failing after 3 retries on the same model; retries use exponential backoff with jitter (2s/4s + jitter) and also cover 500/504.
- Smarter rate-limit handling: daily-quota (RPD) 429s put a key on a 10-minute cooldown (instead of retry-churn every 65s) with a clear "daily quota used up, resets at midnight Pacific" message; per-minute 429s keep the existing next-key rotation.


## Unreleased - 2026-08-16

- AI Assistant: multi-conversation chat history — sidebar with all chats (title, date, message count), New Chat, per-chat delete, auto-persistence in localStorage (last 30 chats) and one-time migration of the old flat history.
- AI Assistant: image-based doubt solving — attach one or more photos of questions/diagrams (paperclip button), Gemini reads them (OCR/handwriting) and answers step by step; attached images show as thumbnails in chat and in sent messages.
- AI Assistant UI polish: quick-action cards with colored icon chips, gradient AI avatar, chat tail bubbles, animated typing dots, smooth auto-scroll, image-attachment previews with remove buttons, collapsible conversations sidebar on mobile.
- Gemini service: `gemini-1.5-flash` as verified default model with auto-fallback chain and 503/overloaded retry with backoff (3 retries, 1.5s/3s/4.5s); model resolution auto-picks a working model from the API's model list.

- Add full Gemini-powered AI Assistant (`/ai`): chat UI with markdown replies and persisted history, quick actions (Plan my day / Recommendations / Analyze progress / Solve a doubt), live online/offline detection, and a key-onboarding screen.
- AI now sees all app data: `buildStudyContext()` summarizes backlog (pending/overdue by priority), module tracker progress per chapter, notes, focus streak/minutes and app-blocker rules into the system prompt for personalized answers.
- Bring-your-own Gemini API key: saved once to localStorage + synced to the user's Firestore profile (`settings.geminiApiKey`), auto-loaded on every login/app open so it is never re-entered; per-user keys. Key verified with a live test call before accepting; friendly error mapping (invalid key / rate limit / offline).
- Settings → "AI Assistant (Gemini)" section: view masked key, change key (Save & Test), or Remove.

- Add cross-platform App & Site Blocker (`/blocker`): per-app/per-site daily time limits (0 = always block), strict mode, focus-mode enforcement, live usage progress bars, quick-add presets (YouTube/Instagram/Reddit/X/Discord), permission banners, and a unified service layer (`src/services/appBlockerService.ts`) that drives Electron, Android (Capacitor plugin), and web fallback from one UI.
- Desktop blocking engine (`electron/appBlocker.ts`): foreground-app usage polling (Windows/macOS/Linux), per-day usage accounting persisted in userData, limit enforcement with notifications + window focus, strict-mode process termination, and OS-level website blocking via the hosts file with DNS flush; exposed to the renderer via new `blocker:*` IPC + preload API.
- Android blocking plugin (`android/app/src/main/java/app/studyos/blocker/`): `AppBlockerPlugin` (UsageStatsManager today-usage queries, usage-access permission flow), `BlockerMonitorService` (15s foreground-service watcher), and `LockActivity` (full-screen lock with back-button guard). Manifest entries documented in `android/README.md`.
- Electron app is now actually runnable: `scripts/build-electron.mjs` compiles electron/ TS to CommonJS `dist-electron/`, package.json `main` wired, autoUpdater made optional (no crash without electron-updater). `npm run electron:dev` builds+launches.

- Fix Card component padding: semantic `padding` prop values ("sm"/"md"/"lg") were passed as raw (invalid) classes, leaving cards with zero padding and causing cramped/overlapping layouts; they now map to p-3/p-5/p-6.
- Add colorful theming to Backlog/Notes/Module Tracker: gradient titles, per-card glow borders (red/green/blue/purple/amber/cyan), colored left accent bars on item cards, colored group headers with count chips, per-chapter cycling glow colors with gradient progress bars, and colored folder chips.

- Backlog Manager: add search, status/type filters, sort (priority/due/recent), due-date grouping (Overdue/Today/Tomorrow/Upcoming) with collapsible groups, overdue highlighting with red ring, friendly due-date labels ("Today", "3 days overdue"), full edit modal (title/chapter/type/due/priority/notes), un-complete button, and Enter-to-add.
- Notes: fix broken folder filtering (folders now actually filter the note list), add per-folder counts, sort (updated/created/title), bookmark filter, content snippet previews + timestamps in the note list, focused/distraction-free writing mode, proper markdown rendering via react-markdown + remark-gfm (tables, lists, code, blockquotes) with new `.prose-note` styles, per-note folder assignment, word count, and attachment deletion.
- Module Tracker: add search across chapters/items, item filter tabs (all/pending/completed/bookmarked), collapsible chapters, linear progress bars per chapter, colored type badges (Exercise/DPP/PYQ/Revision/Assignment), chapter delete, completed items get strikethrough + un-complete toggle, bookmark star fill state, Enter-to-add for chapters and items.

## Unreleased - 2026-08-04

- Add Electron scaffolding: `electron/main.ts`, `electron/preload.ts`, auto-update placeholder and `electron-builder.yml`.
- Add Capacitor Android prep: `capacitor.config.ts`, `src/native/capacitorBridge.ts`, and `android/README.md`.
- Fix TypeScript build errors across modules (remove unused imports, duplicate exports, and type issues).
- Improve performance: lazy-load route pages with `React.lazy` and `Suspense` to reduce initial bundle size.
- Add `DOCUMENTATION.md` and update `PROJECT_STATUS.md` with Capacitor/Electron status.
- Misc: remove duplicate module placeholders and deduplicate code paths.
