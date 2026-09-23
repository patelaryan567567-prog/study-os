/**
 * Unified App Blocker service.
 *
 * One API for three runtimes:
 *  - Desktop (Electron): real usage tracking + app kill + hosts-file site blocking.
 *  - Android (Capacitor): UsageStatsManager tracking + lock overlay service
 *    (see android/app/src/main/java/app/studyos/blocker/).
 *  - Web/dev fallback: manual usage logging only (rules still saved locally,
 *    synced to Firestore when logged in).
 */

export interface BlockRule {
  id: string;
  name: string;
  kind: "app" | "site";
  /** app process/package name or site domain */
  target: string;
  /** daily limit in minutes; 0 = block completely */
  dailyLimitMin: number;
  enabled: boolean;
  /** strict = terminate/lock the app when the limit is hit */
  strict: boolean;
}

export type UsageMap = Record<string, number>; // target -> seconds used today

export interface BlockerPlatformStatus {
  platform: "desktop" | "android" | "web";
  /** native blocking available on this device */
  nativeBlocking: boolean;
  /** permissions granted (usage access / admin) */
  permissionsGranted: boolean;
  tracking: boolean;
}

const RULES_KEY = "studyos_blocker_rules_v1";
const USAGE_KEY = "studyos_blocker_usage_v1";

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/* ------------------------------ persistence ------------------------------ */

export function loadRulesLocal(): BlockRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? (JSON.parse(raw) as BlockRule[]) : [];
  } catch {
    return [];
  }
}

export async function loadRulesWithSync(): Promise<BlockRule[]> {
  const { loadStore } = await import("@/services/appDataSync");
  return loadStore<BlockRule[]>(RULES_KEY, []);
}

export function saveRulesLocal(rules: BlockRule[]) {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {}
  // fire-and-forget cloud sync
  import("@/services/appDataSync").then(({ persistStore }) =>
    persistStore(RULES_KEY, rules),
  );
}

// web-fallback usage log (also caches native usage for offline display)
export function loadUsageLocal(): UsageMap {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toISOString().slice(0, 10)) return {};
    return parsed.usage || {};
  } catch {
    return {};
  }
}

export function saveUsageLocal(usage: UsageMap) {
  try {
    localStorage.setItem(
      USAGE_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), usage }),
    );
  } catch {}
}

/* ------------------------------ platform detection ------------------------------ */

type ElectronBlocker = {
  getStatus: () => Promise<any>;
  setRules: (rules: BlockRule[]) => Promise<any>;
  setFocusMode: (on: boolean) => Promise<any>;
  checkPermissions: () => Promise<any>;
  requestPermissions: () => Promise<any>;
  getDnsBlocker: () => Promise<any>;
  setDnsBlocker: (disabled: boolean) => Promise<any>;
  listApps: () => Promise<any>;
  onUsage: (cb: (d: { usage: UsageMap }) => void) => () => void;
  onBlocked: (
    cb: (d: { ruleId: string; name: string; reason: string }) => void,
  ) => () => void;
};

function electronBlocker(): ElectronBlocker | null {
  const api = (window as any).electronAPI;
  return api?.blocker ?? null;
}

type AndroidBlocker = {
  getStatus: () => Promise<any>;
  setRules: (rules: BlockRule[]) => Promise<any>;
  setFocusMode: (on: boolean) => Promise<any>;
  requestPermissions: () => Promise<any>;
  listApps: () => Promise<any>;
  onUsage: (cb: (d: { usage: UsageMap }) => void) => void;
  onBlocked: (
    cb: (d: { ruleId: string; name: string; reason: string }) => void,
  ) => void;
};

function androidBlocker(): AndroidBlocker | null {
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.() || cap?.isNative) {
    // Plugin registered natively (android/app/src/main/java/com/studyos/app/blocker)
    const reg = cap.Plugins?.AppBlocker;
    if (reg) {
      // Capacitor listeners use addListener instead of returning unsubscribe
      return {
        getStatus: () => reg.getStatus(),
        setRules: (r) => reg.setRules({ rules: r }),
        setFocusMode: (on) => reg.setFocusMode({ on }),
        requestPermissions: () => reg.requestPermissions(),
        listApps: () => reg.listApps(),
        onUsage: (cb) =>
          reg.addListener("blocker:usage", (d: any) =>
            cb({ usage: d.usage || {} }),
          ),
        onBlocked: (cb) => reg.addListener("blocker:blocked", (d: any) => cb(d)),
      };
    }
  }
  return null;
}

export function getBlockerBackend(): "desktop" | "android" | "web" {
  if (electronBlocker()) return "desktop";
  if (androidBlocker()) return "android";
  return "web";
}

/* ------------------------------ public API ------------------------------ */

export async function getBlockerStatus(): Promise<{
  status: BlockerPlatformStatus;
  usage: UsageMap;
}> {
  const eb = electronBlocker();
  if (eb) {
    try {
      const s = await eb.getStatus();
      const perm = await eb.checkPermissions().catch(() => ({}));
      return {
        status: {
          platform: "desktop",
          nativeBlocking: true,
          permissionsGranted: !!perm.admin || !!perm.hostsWritable,
          tracking: !!s.tracking,
        },
        usage: s.usage || {},
      };
    } catch {
      /* fall through */
    }
  }
  const ab = androidBlocker();
  if (ab) {
    try {
      const s = await ab.getStatus();
      return {
        status: {
          platform: "android",
          nativeBlocking: true,
          permissionsGranted: !!s.permissionsGranted,
          tracking: !!s.tracking,
        },
        usage: s.usage || {},
      };
    } catch {
      /* fall through */
    }
  }
  return {
    status: {
      platform: "web",
      nativeBlocking: false,
      permissionsGranted: false,
      tracking: false,
    },
    usage: loadUsageLocal(),
  };
}

/** Push rules to the native blocker on this device (desktop or android). */
export async function applyRules(
  rules: BlockRule[],
): Promise<{ ok: boolean; error?: string }> {
  saveRulesLocal(rules);
  const eb = electronBlocker();
  if (eb) {
    const result = await eb.setRules(rules);
    return result?.ok === false
      ? { ok: false, error: result.error || "Could not update the website blocker." }
      : { ok: true };
  }
  const ab = androidBlocker();
  if (ab) {
    await ab.setRules(rules);
    return { ok: true };
  }
  // web: nothing native to configure
  return { ok: true };
}

export async function setNativeFocusMode(on: boolean): Promise<void> {
  const eb = electronBlocker();
  if (eb) return void (await eb.setFocusMode(on));
  const ab = androidBlocker();
  if (ab) return void (await ab.setFocusMode(on));
}

export async function requestBlockerPermissions(): Promise<boolean> {
  const eb = electronBlocker();
  if (eb) return !!(await eb.requestPermissions());
  const ab = androidBlocker();
  if (ab) return !!(await ab.requestPermissions());
  return false;
}

/** Read the current Secure DNS (DNS-over-HTTPS) control state from the desktop engine. */
export async function getDnsBlockerState(): Promise<{
  desired: boolean;
  admin: boolean;
  applied: Record<string, { managed: boolean; off: boolean }>;
} | null> {
  const eb = electronBlocker();
  if (!eb) return null;
  return await eb.getDnsBlocker();
}

/** Turn "Disable Secure DNS" on/off in Chrome & Edge (requires admin on desktop). */
export async function setDnsBlocker(disabled: boolean): Promise<any> {
  const eb = electronBlocker();
  if (!eb) return null;
  return await eb.setDnsBlocker(disabled);
}

/**
 * List apps available on this PC (installed Start-Menu apps + currently running
 * GUI apps) so the user can pick one to block instead of typing a process name.
 */
export async function getInstalledApps(): Promise<
  { process: string; name: string }[]
> {
  const eb = electronBlocker();
  if (eb) {
    const res = await eb.listApps();
    return Array.isArray(res) ? res : [];
  }
  const ab = androidBlocker();
  if (ab) {
    const res = await ab.listApps();
    // Capacitor plugins return an object; the Android implementation exposes
    // its launcher-app list as { apps: [...] }.
    return Array.isArray(res) ? res : Array.isArray(res?.apps) ? res.apps : [];
  }
  return [];
}

/** Subscribe to live usage updates. Returns an unsubscribe function. */
export function subscribeUsage(cb: (usage: UsageMap) => void): () => void {
  const eb = electronBlocker();
  if (eb) return eb.onUsage((d) => cb(d.usage || {}));
  const ab = androidBlocker();
  if (ab) {
    ab.onUsage((d) => {
      cb(d.usage || {});
      saveUsageLocal(d.usage || {});
    });
    return () => {};
  }
  // web: poll localStorage cache so multiple tabs stay in sync
  const iv = setInterval(() => cb(loadUsageLocal()), 10000);
  return () => clearInterval(iv);
}

/** Subscribe to "an app was just blocked" events. Returns an unsubscribe function. */
export function subscribeBlocked(
  cb: (d: { ruleId: string; name: string; reason: string }) => void,
): () => void {
  const eb = electronBlocker();
  if (eb) return eb.onBlocked(cb);
  const ab = androidBlocker();
  if (ab) {
    ab.onBlocked(cb);
    return () => {};
  }
  return () => {};
}

export function ruleProgress(rule: BlockRule, usage: UsageMap) {
  const usedSec = usage[rule.target] || 0;
  const limitSec = rule.dailyLimitMin * 60;
  const pct = limitSec > 0 ? Math.min(100, Math.round((usedSec / limitSec) * 100)) : rule.enabled ? 100 : 0;
  return { usedSec, limitSec, pct, blocked: rule.enabled && (limitSec === 0 || usedSec >= limitSec) };
}

export function formatDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
