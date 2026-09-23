/**
 * Cloud sync for the localStorage-backed modules (backlog, notes, module
 * tracker, lectures, calendar, revision, planner, reminders, blocker rules,
 * focus clock, AI chats, …).
 *
 * Strategy — merge, never lose:
 *  - On every change: write to localStorage immediately, then push to
 *    Firestore (debounced) when a Firebase user is signed in.
 *  - On app load / sign-in / mount: the Firestore copy is pulled down and
 *    MERGED by item id with the local copy — so logging in on a new device
 *    restores data, and work done on either device is never wiped by the
 *    other.
 *  - When Firebase is not configured / demo mode: behaves as plain localStorage.
 */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseInstances } from "@/services/initFirebase";

const META_KEY = "studyos_sync_meta_v1"; // { [storeKey]: updatedAt }
const PUSH_DELAY_MS = 1200;

type Meta = Record<string, number>;

/**
 * Keys whose saved value has already been restored by `loadStore` in this page
 * session. Before hydration, a component's mount-time persist call with its
 * empty initial state must not be allowed to overwrite a previously saved
 * store (see `persistStore`).
 */
const hydratedKeys = new Set<string>();

/** "Empty" values are what components write on mount before `loadStore` has
 *  restored the real data (empty arrays / objects / null). */
function isEmptyValue(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data as object).length === 0;
  return false;
}

/** Whether the key already holds a meaningful saved value (so overwriting it
 *  with an empty one would be destructive). */
function hasSavedData(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const trimmed = raw.trim();
    return (
      trimmed.length > 0 &&
      trimmed !== "[]" &&
      trimmed !== "{}" &&
      trimmed !== "null"
    );
  } catch {
    return false;
  }
}

function readMeta(): Meta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMeta(key: string, ts: number) {
  try {
    const meta = readMeta();
    meta[key] = ts;
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}

function localUpdatedAt(key: string): number {
  return readMeta()[key] || 0;
}

function firebaseUid(): string | null {
  try {
    return getFirebaseInstances().auth.currentUser?.uid ?? null;
  } catch {
    return null; // firebase not configured (demo mode)
  }
}

function storeDocRef(uid: string, key: string) {
  const { db } = getFirebaseInstances();
  return doc(db, "users", uid, "appdata", key);
}

const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Write to localStorage + (debounced) Firestore. */
export function persistStore(key: string, data: unknown): void {
  // Hydration guard — this is what prevented restores on every app restart:
  // components start with empty state and only restore the saved value later
  // via `loadStore`. If the empty mount-time value was persisted we would
  //   (1) wipe the local copy,
  //   (2) bump the sync timestamp so the Firestore copy would never win again,
  //   (3) push the empty value to Firestore — permanently deleting the backup.
  // Until `loadStore` has hydrated this key in this session, drop writes that
  // would replace a real saved value with an empty one. Genuine user actions
  // (adding items, clearing everything after hydration) all pass through.
  if (!hydratedKeys.has(key) && isEmptyValue(data) && hasSavedData(key)) {
    return;
  }

  const ts = Date.now();
  const serialized = JSON.stringify(data);

  // If the stored value is identical, this is a component re-writing its own
  // just-hydrated state (common on mount) — not a user edit. Leave the sync
  // timestamp untouched and don't schedule a push, otherwise the local copy
  // would look "newer" than the cloud during login sync, which overwrites the
  // cloud copy (with this device's data only) instead of MERGING both.
  let previousRaw: string | null = null;
  try {
    previousRaw = localStorage.getItem(key);
  } catch {}
  const unchanged = previousRaw === serialized;

  try {
    localStorage.setItem(key, serialized);
  } catch {}

  // A write that happens BEFORE this key has been hydrated (via `loadStore` or
  // the login sync) with an empty/default value is a mount-time artifact, not a
  // user action. Writing it to localStorage is harmless — `loadStore`/account
  // sync restore the real data over it — but we must NOT bump the sync
  // timestamp or push it to the cloud, otherwise on a brand-new device the
  // empty/default snapshot could overwrite real cloud data (this is exactly the
  // "lectures from the other device wiped" bug). Once the key is hydrated,
  // empty writes are genuine "delete everything" actions and pass through.
  const preHydrationEmpty =
    !hydratedKeys.has(key) && isEmptyValue(data) && SYNCABLE_KEYS.includes(key);
  if (!preHydrationEmpty && !unchanged) writeMeta(key, ts);

  const uid = firebaseUid();
  if (!uid) return; // demo mode / signed out — local only
  if (preHydrationEmpty || unchanged) return; // nothing new to push

  clearTimeout(pushTimers[key]);
  pushTimers[key] = setTimeout(async () => {
    try {
      // Only push if this value is still the current local value. If a newer
      // write (or a cloud restore, e.g. loadStore pulling real lectures over an
      // empty mount snapshot) replaced it in the meantime, that newer version
      // scheduled its own push — pushing this stale snapshot now would
      // clobber cloud data on the other device.
      let currentRaw: string | null = null;
      try {
        currentRaw = localStorage.getItem(key);
      } catch {}
      if (currentRaw !== serialized) return;
      await setDoc(storeDocRef(uid, key), { updatedAt: ts, data }, { merge: false });
    } catch {
      /* offline etc — localStorage copy remains source of truth */
    }
  }, PUSH_DELAY_MS);
}

/**
 * Read a store: local copy first, then check Firestore once.
 * Never destroys data — if the cloud copy is newer (or different), the two
 * copies are MERGED by item id so work from either device survives, and the
 * merged result is stored locally AND pushed back to the cloud so both sides
 * converge. When the local side is empty (fresh device) the cloud copy is
 * restored verbatim.
 */
export async function loadStore<T>(key: string, fallback: T): Promise<T> {
  let local: T = fallback;
  let hasLocal = false;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      local = JSON.parse(raw);
      hasLocal = true;
    }
  } catch {}

  // The key has now been restored (or confirmed absent) — subsequent persists
  // are genuine user changes and must be allowed, even empty ones.
  hydratedKeys.add(key);

  const uid = firebaseUid();
  if (!uid) return local;

  try {
    const snap = await getDoc(storeDocRef(uid, key));
    if (!snap.exists()) {
      // No cloud copy yet — back the local value up so re-installs and other
      // devices can restore it (this is what previously lost all lectures that
      // were only ever written straight to localStorage).
      if (hasLocal && !isEmptyValue(local)) {
        const ts = localUpdatedAt(key) || Date.now();
        writeMeta(key, ts);
        await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: local });
      }
      return local;
    }

    const remote = snap.data() as { updatedAt?: number; data?: T };
    if (remote.data == null) return local;
    const remoteTs = remote.updatedAt || 0;
    const localEmpty = !hasLocal || isEmptyValue(local);

    if (localEmpty) {
      // Fresh device — restore the cloud copy verbatim.
      try {
        localStorage.setItem(key, JSON.stringify(remote.data));
      } catch {}
      writeMeta(key, remoteTs);
      return remote.data;
    }

    // Both sides have data — merge so nothing from either device is lost, then
    // converge both copies on the merged value (bumping the timestamp would
    // otherwise make one side always win and drop the other device's items).
    const merged = mergeValues(local, remote.data) as T;
    const mergedJson = JSON.stringify(merged);
    const localJson = JSON.stringify(local);
    const remoteJson = JSON.stringify(remote.data);

    if (mergedJson !== localJson) {
      const ts = Date.now();
      try {
        localStorage.setItem(key, mergedJson);
      } catch {}
      writeMeta(key, ts);
      await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: merged });
      return merged;
    }
    if (mergedJson !== remoteJson) {
      // Local already holds the merged value but the cloud copy is behind —
      // back it up so it is not lost on another device.
      const ts = localUpdatedAt(key) || Date.now();
      writeMeta(key, ts);
      await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: merged });
    }
    return local;
  } catch {
    /* offline — use local */
  }
  return local;
}

/** Force-push a store to the cloud (e.g. after login). */
export async function pushAllStores(keys: string[]): Promise<void> {
  const uid = firebaseUid();
  if (!uid) return;
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const ts = localUpdatedAt(key);
      if (!ts) continue;
      await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: JSON.parse(raw) });
    } catch {}
  }
}

/* ── Full-account sync on login ──────────────────────────────────────────
 * Only a few modules used persistStore/loadStore; the rest (lectures,
 * calendar, revision, gamification, planner, the zustand store…) wrote
 * straight to localStorage and never reached Firestore — so logging in on a
 * new device silently lost them. syncOnLogin() pulls/pushes EVERY user-data
 * key once per sign-in, merging by item id so work from both devices
 * survives. */

const SYNCABLE_KEYS = [
  "studyos-store", // zustand: tasks, sessions, notes, events, subjects, flashcards
  "studyos_tasks_v1",
  "studyos_backlog_v1",
  "studyos_notes_v1",
  "studyos_module_tracker_v1",
  "studyos_lecture_tracker_v1",
  "studyos_lecture_subjects_v1",
  "studyos_calendar_events_v1",
  "studyos_revision_flashcards_v1",
  "studyos_revision_mistakes_v1",
  "studyos_revision_formulas_v1",
  "studyos_gamification_v1",
  "studyos_planner_v1",
  "studyos_reminders_v1",
  "studyos_focus_clock_v2",
  "studyos_focus_v1",
  "studyos_blocker_rules_v1",
  "studyos_blocker_usage_v1",
  "studyos_ai_conversations_v1",
  "studyos_ai_recommendation_v1",
  "studyos_daily_goal_hours_v1",
];

// Modules share one localStorage origin on a computer. Keep a small local
// snapshot per account so switching users cannot expose or upload another
// account's data before cloud sync completes.
const ACTIVE_ACCOUNT_KEY = "studyos_active_account_v1";
const accountSnapshotKey = (uid: string) => `studyos_account_snapshot_v1:${uid}`;

type AccountSnapshot = {
  values: Record<string, string>;
  meta: Meta;
};

function saveAccountSnapshot(uid: string): void {
  try {
    const values: Record<string, string> = {};
    for (const key of SYNCABLE_KEYS) {
      const value = localStorage.getItem(key);
      if (value != null) values[key] = value;
    }
    const allMeta = readMeta();
    const meta: Meta = {};
    for (const key of SYNCABLE_KEYS) {
      if (allMeta[key]) meta[key] = allMeta[key];
    }
    localStorage.setItem(accountSnapshotKey(uid), JSON.stringify({ values, meta }));
  } catch {
    // Firestore remains the account backup when localStorage is unavailable.
  }
}

function clearActiveStoreValues(): void {
  try {
    const meta = readMeta();
    for (const key of SYNCABLE_KEYS) {
      localStorage.removeItem(key);
      delete meta[key];
    }
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}

function restoreAccountSnapshot(uid: string): boolean {
  try {
    const raw = localStorage.getItem(accountSnapshotKey(uid));
    if (!raw) return false;
    const snapshot = JSON.parse(raw) as Partial<AccountSnapshot>;
    if (!snapshot.values || typeof snapshot.values !== "object") return false;

    const meta = readMeta();
    for (const key of SYNCABLE_KEYS) {
      const value = snapshot.values[key];
      if (typeof value === "string") localStorage.setItem(key, value);
      if (snapshot.meta?.[key]) meta[key] = snapshot.meta[key];
    }
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

/** Activate this account's cache before any module or cloud-sync code runs. */
export function activateAccountStorage(uid: string): void {
  try {
    const previousUid = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (previousUid && previousUid !== uid) {
      saveAccountSnapshot(previousUid);
      clearActiveStoreValues();
      restoreAccountSnapshot(uid);
    }
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, uid);
    hydratedKeys.clear();
  } catch {}
}

/** Union two arrays of items by their `id` — local wins on conflicts,
 *  remote-only items are appended. Used to merge the same store coming from
 *  two devices instead of letting one side overwrite the other. */
function mergeArrays(local: any[], remote: any[]): any[] {
  const byId = new Map<string, any>();
  remote.forEach((item, index) => {
    byId.set(String(item?.id ?? `r${index}`), item);
  });
  local.forEach((item, index) => {
    byId.set(String(item?.id ?? `l${index}`), item);
  });
  return [...byId.values()];
}

/** Recursively merge two stored values (arrays by id, objects key-wise,
 *  scalars: local wins when defined). */
function mergeValues(local: unknown, remote: unknown): unknown {
  if (Array.isArray(local) && Array.isArray(remote)) return mergeArrays(local, remote);
  if (local && remote && typeof local === "object" && typeof remote === "object") {
    const merged: Record<string, unknown> = { ...(remote as Record<string, unknown>) };
    for (const key of Object.keys(local as Record<string, unknown>)) {
      merged[key] = mergeValues((local as Record<string, unknown>)[key], (remote as Record<string, unknown>)[key]);
    }
    return merged;
  }
  return local !== undefined && local !== null ? local : remote;
}

function parseLocal(key: string): { raw: string | null; value: unknown } {
  try {
    const raw = localStorage.getItem(key);
    return { raw, value: raw ? JSON.parse(raw) : null };
  } catch {
    return { raw: null, value: null };
  }
}

/**
 * Pull + push every user-data store for the signed-in account. Returns true
 * when any local key was changed by the pull (the caller can then reload so
 * already-mounted modules pick up the restored data).
 */
export async function syncOnLogin(): Promise<boolean> {
  const uid = firebaseUid();
  if (!uid) return false;

  // Deliver any debounced writes that are still in flight first, so the push
  // below does not race (or overwrite) them.
  await flushPendingPushes();

  let localChanged = false;

  for (const key of SYNCABLE_KEYS) {
    try {
      const { value: localValue } = parseLocal(key);
      const snap = await getDoc(storeDocRef(uid, key));
      const remote = snap.exists() ? (snap.data() as { updatedAt?: number; data?: unknown }) : null;
      const localEmpty = localValue == null || (Array.isArray(localValue) && localValue.length === 0) ||
        (typeof localValue === "object" && !Array.isArray(localValue) && Object.keys(localValue as object).length === 0);

      if (!remote || remote.data == null) {
        // Nothing in the cloud — push this device's data up (first sync for
        // keys whose modules never used persistStore, so there is no meta ts).
        if (!localEmpty) {
          const ts = localUpdatedAt(key) || Date.now();
          writeMeta(key, ts);
          await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: localValue });
        }
        continue;
      }

      const remoteTs = remote.updatedAt ?? 0;
      const localTs = localUpdatedAt(key);

      if (localEmpty) {
        // Fresh device — restore the cloud copy verbatim.
        localStorage.setItem(key, JSON.stringify(remote.data));
        writeMeta(key, remoteTs);
        hydratedKeys.add(key);
        localChanged = true;
        continue;
      }

      if (remoteTs > localTs) {
        // Both sides have data and the cloud is newer — merge so nothing from
        // either device is lost, then store the merged result everywhere.
        const merged = mergeValues(localValue, remote.data);
        localStorage.setItem(key, JSON.stringify(merged));
        const ts = Date.now();
        writeMeta(key, ts);
        hydratedKeys.add(key);
        await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: merged });
        localChanged = true;
        continue;
      }

      // Local is newer or equal — make sure the cloud copy is up to date.
      const ts = localTs || Date.now();
      writeMeta(key, ts);
      await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: localValue });
    } catch {
      /* offline or per-key failure — the local copy stays usable */
    }
  }

  if (localChanged) {
    window.dispatchEvent(new CustomEvent("studyos-data-changed", { detail: { source: "sync" } }));
  }
  return localChanged;
}

/** Immediately flush every debounced push that is still pending, e.g. right
 *  before the app is closed / the tab hides, so a change made a moment ago
 *  reaches the cloud even if the page is torn down before its 1.2s debounce
 *  timer fires. */
export async function flushPendingPushes(): Promise<void> {
  const uid = firebaseUid();
  if (!uid) return;

  const pending = Object.entries(pushTimers);
  for (const [key, timer] of pending) {
    clearTimeout(timer);
    delete pushTimers[key];
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const ts = localUpdatedAt(key);
      if (!ts) continue;
      await setDoc(storeDocRef(uid, key), { updatedAt: ts, data: JSON.parse(raw) });
    } catch {
      /* offline etc — the debounced push / periodic sync will retry later */
    }
  }
}

// Flush pending writes whenever the app is backgrounded or about to be closed
// (Electron window close, browser tab hidden, Android app backgrounded). This
// is what makes an edit made just before closing appear on the other device
// instead of being lost.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const flushPending = () => void flushPendingPushes();
  // Backgrounded / tab hidden: deliver any debounced writes. (The periodic
  // sync in AuthProvider already pushes every syncable key on hidden.)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPending();
  });
  // Page actually tearing down (close/reload in the browser AND the desktop
  // shell): flush debounced writes AND run one final full sync so stores that
  // write localStorage directly (e.g. the zustand `studyos-store`) reach the
  // cloud too.
  window.addEventListener("pagehide", () => {
    flushPending();
    void syncOnLogin().catch(() => {});
  });
}
