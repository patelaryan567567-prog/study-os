/**
 * StudyOS App Blocker — Electron main process engine (PC side).
 *
 * Responsibilities:
 *  - Track which app is in the foreground and accumulate per-day usage.
 *  - Enforce per-app daily time limits: warn, bring StudyOS to front,
 *    and (in strict mode) terminate the blocked process.
 *  - Block distracting websites via the OS hosts file (needs admin/elevated app).
 *  - Expose everything to the renderer over IPC ("blocker:*").
 *
 * Platform notes:
 *  - Windows: foreground process via PowerShell + GetForegroundWindow.
 *  - macOS: via osascript (frontmost application).
 *  - Linux: xdotool (best effort).
 */
import { app, BrowserWindow, ipcMain, Notification, shell } from "electron";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface BlockRule {
  id: string;
  name: string;
  kind: "app" | "site";
  /** app process name (e.g. "chrome.exe") or site domain (e.g. "youtube.com") */
  target: string;
  /** daily limit in minutes; 0 = block completely */
  dailyLimitMin: number;
  enabled: boolean;
  /** strict = kill the process when limit is hit; non-strict = notify + focus us */
  strict: boolean;
}

export type UsageMap = Record<string, number>; // target -> seconds today

interface BlockerState {
  rules: BlockRule[];
  focusMode: boolean;
}

const POLL_INTERVAL_MS = 5000;
const HOSTS_BEGIN = "# >>> StudyOS Blocker BEGIN >>>";
const HOSTS_END = "# <<< StudyOS Blocker END <<<";

let state: BlockerState = { rules: [], focusMode: false };
let usage: UsageMap = {};
let pollTimer: NodeJS.Timeout | null = null;
let warned = new Set<string>();

function stateFile() {
  return path.join(app.getPath("userData"), "blocker-state.json");
}

function loadPersisted() {
  try {
    const raw = fs.readFileSync(stateFile(), "utf-8");
    const parsed = JSON.parse(raw);
    // reset usage if the day changed
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) parsed.usage = {};
    usage = parsed.usage || {};
  } catch {
    usage = {};
  }
}

function persist() {
  try {
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), usage }),
      "utf-8",
    );
  } catch (e) {
    console.warn("blocker persist failed", e);
  }
}

function mainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows();
  return wins[0] ?? null;
}

function notify(title: string, body: string) {
  try {
    new Notification({ title, body }).show();
  } catch {
    /* ignore */
  }
}

/* ------------------------------ foreground tracking ------------------------------ */

// Absolute paths to system tools: no PATH lookups, no shell involvement.
const SYS = (exe: string) =>
  process.env.SystemRoot
    ? `${process.env.SystemRoot}\\System32\\${exe}`
    : `C:\\Windows\\System32\\${exe}`;

async function getForegroundProcess(): Promise<{ process: string } | null> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execFileAsync(
        SYS("WindowsPowerShell\\v1.0\\powershell.exe"),
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  }
"@
$h = [Win]::GetForegroundWindow(); $pid2 = 0; [Win]::GetWindowThreadProcessId($h, [ref]$pid2) | Out-Null; (Get-Process -Id $pid2).ProcessName`,
        ],
      );
      const name = stdout.trim();
      return name ? { process: name.toLowerCase() } : null;
    }
    if (process.platform === "darwin") {
      const { stdout } = await execFileAsync("osascript", [
        "-e",
        'tell application "System Events" to get name of first application process whose frontmost is true',
      ]);
      const name = stdout.trim();
      return name ? { process: name.toLowerCase() } : null;
    }
    const { stdout } = await execFileAsync("bash", [
      "-c",
      "xdotool getwindowfocus getwindowpid | xargs -I{} cat /proc/{}/comm",
    ]);
    const name = stdout.trim();
    return name ? { process: name.toLowerCase() } : null;
  } catch {
    return null;
  }
}

async function enforce() {
  const fg = await getForegroundProcess();
  if (!fg) return;
  const target = fg.process;
  const win = mainWindow();

  // ── APP rules: foreground minute metering + enforcement ──
  let appBlocked = false;
  const rule = state.rules.find(
    (r) => r.enabled && r.kind === "app" && target.includes(r.target.toLowerCase()),
  );
  if (rule) {
    usage[rule.target] = (usage[rule.target] || 0) + POLL_INTERVAL_MS / 1000;
    persist();

    const limitSec = rule.dailyLimitMin * 60;
    const overLimit = limitSec > 0 && usage[rule.target] >= limitSec;
    // focus mode or dailyLimitMin === 0 => always blocked
    const blockedNow = state.focusMode || rule.dailyLimitMin === 0 || overLimit;

    if (blockedNow) {
      appBlocked = true;
      const friendly = rule.name || rule.target;
      if (!warned.has(rule.id)) {
        warned.add(rule.id);
        notify(
          "StudyOS — Time limit reached",
          state.focusMode
            ? `${friendly} is blocked during focus mode. Stay focused!`
            : `You've used ${friendly} for ${rule.dailyLimitMin} min today. Blocked until tomorrow.`,
        );
      }
      if (win) {
        win.show();
        win.focus();
        win.webContents.send("blocker:blocked", {
          ruleId: rule.id,
          name: friendly,
          reason: state.focusMode ? "focus" : "limit",
        });
      }
      // strict mode: terminate the offending process (Windows needs .exe)
      if (rule.strict) {
        try {
          const exe =
            process.platform === "win32" && !rule.target.endsWith(".exe")
              ? `${rule.target}.exe`
              : rule.target;
          if (process.platform === "win32")
            await execFileAsync(SYS("taskkill.exe"), ["/IM", exe]);
          else if (process.platform === "darwin")
            await execFileAsync("osascript", [
              "-e",
              `tell application "${rule.target}" to quit`,
            ]);
          else await execFileAsync("bash", ["-c", `pkill -f ${rule.target}`]);
        } catch {
          /* process may have already closed */
        }
      }
    } else if (overLimit === false) {
      warned.delete(rule.id);
    }
  }

  // ── SITE rules: meter time while a browser is in the foreground ──
  // The OS can't see which tab/site is active, so foreground seconds are
  // credited to every enabled, still-allowed time-limited site; whichever
  // crosses its daily budget is then (re)added to the block list.
  if (!appBlocked && isBrowserProcess(target) && hasTrackedSiteRules()) {
    const limited = state.rules.filter(
      (r) => r.enabled && r.kind === "site" && r.dailyLimitMin > 0,
    );
    let crossed = false;
    for (const r of limited) {
      const used = (usage[r.target] || 0) + POLL_INTERVAL_MS / 1000;
      usage[r.target] = used;
      if (used >= r.dailyLimitMin * 60) {
        crossed = true;
        const friendly = r.name || r.target;
        if (!warned.has(r.id)) {
          warned.add(r.id);
          notify(
            "StudyOS — Daily limit reached",
            `You've used ${friendly} for ${r.dailyLimitMin} min today. Blocked until tomorrow.`,
          );
        }
        if (win)
          win.webContents.send("blocker:blocked", {
            ruleId: r.id,
            name: friendly,
            reason: "limit",
          });
      } else {
        warned.delete(r.id);
      }
    }
    persist();
    if (crossed) await applySiteRules();
  }

  // stream usage to renderer
  win?.webContents.send("blocker:usage", { usage });
}

function hasEnabledAppRules(): boolean {
  return state.rules.some((r) => r.enabled && r.kind === "app");
}

function hasTrackedSiteRules(): boolean {
  return state.rules.some(
    (r) => r.enabled && r.kind === "site" && r.dailyLimitMin > 0,
  );
}

/**
 * Foreground polling spawns a system helper (PowerShell on Windows), which
 * triggers Windows Security prompts while the app is unsigned. So polling
 * only runs while the user has enabled APP rules or time-limited SITE rules
 * (both need foreground time metering) — never at idle.
 */
function syncPolling() {
  const shouldRun = hasEnabledAppRules() || hasTrackedSiteRules();
  if (shouldRun && !pollTimer) {
    pollTimer = setInterval(enforce, POLL_INTERVAL_MS);
  } else if (!shouldRun && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/* ------------------------------ website blocking ------------------------------ */

function hostsFile() {
  return process.platform === "win32"
    ? "C:\\Windows\\System32\\drivers\\etc\\hosts"
    : "/etc/hosts";
}

function isAdmin(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      fs.accessSync(hostsFile(), fs.constants.W_OK);
      resolve(true);
    } catch {
      resolve(false);
    }
  });
}

async function writeHostsBlock(domains: string[]): Promise<{ ok: boolean; error?: string }> {
  const hostsPath = hostsFile();
  let content = "";
  try {
    content = fs.readFileSync(hostsPath, "utf-8");
  } catch (e: any) {
    return { ok: false, error: `Cannot read hosts file: ${e.message}` };
  }
  // remove old StudyOS section
  const beginIdx = content.indexOf(HOSTS_BEGIN);
  const endIdx = content.indexOf(HOSTS_END);
  if (beginIdx !== -1 && endIdx !== -1) {
    content =
      content.slice(0, beginIdx).replace(/\n+$/, "\n") +
      content.slice(endIdx + HOSTS_END.length).replace(/^\n+/, "\n");
  }
  if (domains.length > 0) {
    const lines = domains
      .filter((d) => d.trim())
      .map((d) => `0.0.0.0 ${d.trim()} # studyos-block`);
    content += `\n${HOSTS_BEGIN}\n${lines.join("\n")}\n${HOSTS_END}\n`;
  }
  try {
    fs.writeFileSync(hostsPath, content, "utf-8");
    return { ok: true };
  } catch (e: any) {
    return {
      ok: false,
      error:
        "Writing the hosts file requires admin rights. Run StudyOS as administrator (Windows) or add write access to /etc/hosts (macOS/Linux).",
    };
  }
}

// Browser process names whose foreground time is counted toward time-limited sites.
const SITE_BROWSERS = [
  "chrome",
  "msedge",
  "edge",
  "firefox",
  "brave",
  "opera",
  "vivaldi",
];

function isBrowserProcess(p: string): boolean {
  const lower = p.toLowerCase();
  return SITE_BROWSERS.some((b) => lower.includes(b));
}

/**
 * Domains that must currently be blocked: always-block sites (dailyLimitMin 0)
 * plus time-limited sites whose daily budget is exhausted. Sites with remaining
 * budget are LEFT OUT of the hosts block so they can actually be used.
 */
function normaliseDomain(value: string): string | null {
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[/?#]/, 1)[0]
    .replace(/^\.+|\.+$/g, "");
  return domain && !/[\s\\]/.test(domain) ? domain : null;
}

function buildSiteBlockList(): string[] {
  const domains = state.rules
    .filter((r) => r.enabled && r.kind === "site")
    .filter((r) => {
      if (state.focusMode || r.dailyLimitMin === 0) return true;
      return (usage[r.target] || 0) >= r.dailyLimitMin * 60;
    })
    .map((r) => normaliseDomain(r.target))
    .filter((domain): domain is string => !!domain);
  return [...new Set(domains.flatMap((domain) =>
    domain.startsWith("www.") ? [domain] : [domain, `www.${domain}`],
  ))];
}

async function applySiteRules(): Promise<{ ok: boolean; error?: string }> {
  const res = await writeHostsBlock(buildSiteBlockList());
  if (res.ok) await flushDns();
  return res;
}

async function flushDns() {
  try {
    if (process.platform === "win32")
      await execFileAsync(SYS("ipconfig.exe"), ["/flushdns"]);
    else if (process.platform === "darwin")
      await execFileAsync("bash", ["-c", "dscacheutil -flushcache; killall -HUP mDNSResponder"]);
  } catch {
    /* non-fatal */
  }
}

/* ------------------------- Secure DNS (DNS-over-HTTPS) control -------------------------
 * Chrome & Edge resolve DNS through their own "Secure DNS" (DNS-over-HTTPS), which fully
 * BYPASSES the OS hosts file — so hosts-file site blocking silently fails whenever it's on.
 * There is no per-user registry key we can flip reliably, so we disable DoH through the
 * machine-level Chromium policy both browsers read from the registry:
 *
 *   HKLM\SOFTWARE\Policies\Google\Chrome   DnsOverHttpsMode = "off"
 *   HKLM\SOFTWARE\Policies\Microsoft\Edge  DnsOverHttpsMode = "off"
 *
 * Writing/removing these keys requires an elevated (admin) process, which is why StudyOS
 * must be run as administrator. Setting "off" also locks the toggle inside Chrome/Edge
 * (the setting shows as "Managed by your organization"); deleting the key restores the
 * user's own control.
 */
const DNS_POLICY_ROOTS = [
  { friendly: "Chrome", key: "HKLM\\SOFTWARE\\Policies\\Google\\Chrome" },
  { friendly: "Edge", key: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" },
];
const DNS_VALUE = "DnsOverHttpsMode";
const DNS_ENFORCED_OFF = "off";
const STUDYOS_POLICY_KEY = "HKLM\\SOFTWARE\\StudyOS";
const STUDYOS_DNS_OWNER_VALUE = "OwnsSecureDnsPolicy";

// Desired state persisted between launches: disabled=true => StudyOS forces Secure DNS off.
interface DnsPref {
  disabled: boolean;
}
function dnsPrefFile() {
  return path.join(app.getPath("userData"), "secure-dns.json");
}
let dnsPref: DnsPref = { disabled: false };

function loadDnsPref() {
  try {
    const raw = JSON.parse(fs.readFileSync(dnsPrefFile(), "utf-8"));
    dnsPref = { disabled: !!raw.disabled };
  } catch {
    dnsPref = { disabled: false };
  }
}
function saveDnsPref() {
  try {
    fs.writeFileSync(dnsPrefFile(), JSON.stringify(dnsPref), "utf-8");
  } catch (e) {
    console.warn("secure-dns pref save failed", e);
  }
}

async function regSetValue(root: string, name: string, value: string) {
  await execFileAsync(SYS("reg.exe"), [
    "add",
    root,
    "/v",
    name,
    "/t",
    "REG_SZ",
    "/d",
    value,
    "/f",
  ]);
}
async function regDeleteValue(root: string, name: string) {
  try {
    await execFileAsync(SYS("reg.exe"), ["delete", root, "/v", name, "/f"]);
  } catch {
    /* value already absent — fine */
  }
}
async function regQueryValue(
  root: string,
  name: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(SYS("reg.exe"), [
      "query",
      root,
      "/v",
      name,
    ]);
    return stdout;
  } catch {
    return null;
  }
}

async function hasStudyOsDnsOwnership(): Promise<boolean> {
  const raw = await regQueryValue(STUDYOS_POLICY_KEY, STUDYOS_DNS_OWNER_VALUE);
  return raw !== null && /0x1|\b1\b/.test(raw);
}

async function setStudyOsDnsOwnership(owned: boolean) {
  if (owned) {
    await execFileAsync(SYS("reg.exe"), [
      "add", STUDYOS_POLICY_KEY, "/v", STUDYOS_DNS_OWNER_VALUE,
      "/t", "REG_DWORD", "/d", "1", "/f",
    ]);
  } else {
    await regDeleteValue(STUDYOS_POLICY_KEY, STUDYOS_DNS_OWNER_VALUE);
  }
}

/** True when the current process can edit machine policy keys (requires admin). */
async function dnsAdminReady(): Promise<boolean> {
  if (process.platform !== "win32") return false;
  return isAdmin();
}

async function applyDnsPolicy(
  disabled: boolean,
  persistPreference = true,
): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== "win32")
    return { ok: false, error: "Secure DNS control is only available on Windows." };
  if (!(await dnsAdminReady()))
    return {
      ok: false,
      error:
        "Run StudyOS as administrator to change the Secure DNS setting for Chrome & Edge.",
    };

  let firstError: string | undefined;
  let changedByStudyOs = false;
  const ownsPolicy = await hasStudyOsDnsOwnership();
  for (const { friendly, key } of DNS_POLICY_ROOTS) {
    try {
      if (disabled) {
        const existing = await regQueryValue(key, DNS_VALUE);
        // Never overwrite browser rules installed by a school, employer, or
        // another security tool. An existing "off" rule already works for us.
        if (existing && !/\boff\b/i.test(existing)) {
          if (!firstError)
            firstError = `${friendly} Secure DNS is managed by another policy; StudyOS will not overwrite it.`;
          continue;
        }
        if (!existing) {
          await regSetValue(key, DNS_VALUE, DNS_ENFORCED_OFF);
          changedByStudyOs = true;
        }
      } else if (ownsPolicy) {
        await regDeleteValue(key, DNS_VALUE);
      }
    } catch (e: any) {
      if (!firstError)
        firstError = `Could not update ${friendly} DNS policy: ${e.message}`;
    }
  }
  if (disabled && changedByStudyOs) await setStudyOsDnsOwnership(true);
  if (!disabled && ownsPolicy) await setStudyOsDnsOwnership(false);
  await flushDns();
  if (firstError) return { ok: false, error: firstError };
  if (persistPreference) {
    dnsPref.disabled = disabled;
    saveDnsPref();
  }
  return { ok: true };
}

async function readDnsStatus(): Promise<
  Record<string, { managed: boolean; off: boolean }>
> {
  const status: Record<string, { managed: boolean; off: boolean }> = {};
  for (const { friendly, key } of DNS_POLICY_ROOTS) {
    let managed = false;
    let off = false;
    const raw = await regQueryValue(key, DNS_VALUE);
    if (raw !== null) {
      managed = true;
      off = /off/i.test(raw);
    }
    status[friendly] = { managed, off };
  }
  return status;
}

/* ------------------------------ App picker ------------------------------
 * Enumerate apps the user can block: installed Start-Menu apps (resolved to a
 * real process name from each shortcut's target) plus currently running GUI
 * apps. Returns { process, name } rows so the renderer can present a readable
 * picker while the runtime matches/terminates by the process name.
 */
async function listApps(): Promise<{ process: string; name: string }[]> {
  if (process.platform !== "win32") return [];
  const ps = [
    "$sh = New-Object -ComObject WScript.Shell",
    '$dirs = @("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs", "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs")',
    "$out = @()",
    "Get-ChildItem -Path $dirs -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {",
    "  $disp = $_.BaseName",
    "  try {",
    "    $t = $sh.CreateShortcut($_.FullName).TargetPath",
    '    if ($t) { $p = [System.IO.Path]::GetFileNameWithoutExtension($t); if ($p) { $out += "$p`t$disp" } }',
    "  } catch {}",
    "}",
    'Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { $out += "$($_.ProcessName)`t$($_.ProcessName)" }',
    "$out | Sort-Object -Unique",
  ].join("\n");
  try {
    const { stdout } = await execFileAsync(
      SYS("WindowsPowerShell\\v1.0\\powershell.exe"),
      ["-NoProfile", "-NonInteractive", "-Command", ps],
    );
    const seen = new Set<string>();
    const apps: { process: string; name: string }[] = [];
    for (const line of stdout.split(/\r?\n/)) {
      const parts = line.split("\t");
      const process = (parts[0] || "").trim();
      const name = (parts[1] || process).trim();
      if (!process) continue;
      const key = process.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      apps.push({ process, name });
    }
    apps.sort((a, b) => a.name.localeCompare(b.name));
    return apps;
  } catch {
    return [];
  }
}

/* ------------------------------ IPC surface ------------------------------ */

export function initAppBlocker() {
  loadPersisted();
  loadDnsPref();

  ipcMain.handle("blocker:getStatus", () => ({
    platform: "desktop",
    os: process.platform,
    admin: null, // computed lazily below
    tracking: !!pollTimer,
    focusMode: state.focusMode,
    rules: state.rules,
    usage,
  }));

  ipcMain.handle("blocker:setRules", (_e, rules: BlockRule[]) => {
    state.rules = Array.isArray(rules) ? rules : [];
    syncPolling();
    // apply website rules to hosts file — time-limited sites stay unblocked
    // until they use up their daily minutes.
    return applySiteRules().then((res) => {
      if (!res.ok)
        notify(
          "StudyOS — Website blocking needs permission",
          res.error || "Could not update hosts file.",
        );
      return res;
    });
  });

  ipcMain.handle("blocker:setFocusMode", async (_e, on: boolean) => {
    state.focusMode = !!on;
    const win = mainWindow();
    win?.webContents.send("blocker:focus-changed", on);
    // Focus mode only temporarily forces Secure DNS off. It must not turn the
    // user's permanent setting into "off", otherwise Chrome/Edge remain
    // "managed by your organization" after focus mode has ended.
    const sites = await applySiteRules();
    if (state.focusMode) await applyDnsPolicy(true, false);
    else if (!dnsPref.disabled) await applyDnsPolicy(false, false);
    return { ok: sites.ok, error: sites.error, focusMode: state.focusMode };
  });

  ipcMain.handle("blocker:getDnsBlocker", async () => {
    const applied = await readDnsStatus();
    return {
      desired: dnsPref.disabled,
      admin: await dnsAdminReady(),
      applied,
    };
  });

  ipcMain.handle("blocker:setDnsBlocker", async (_e, disabled: boolean) => {
    const res = await applyDnsPolicy(!!disabled);
    const applied = await readDnsStatus();
    return { ...res, applied };
  });

  ipcMain.handle("blocker:listApps", () => listApps());

  ipcMain.handle("blocker:checkPermissions", async () => {
    const admin = await isAdmin();
    return { admin, hostsWritable: admin };
  });

  ipcMain.handle("blocker:requestPermissions", async () => {
    // open the hosts file folder / elevate hint — we cannot self-elevate safely,
    // so guide the user via notification + docs page.
    notify(
      "StudyOS — Permission needed",
      "Run StudyOS as administrator to enable website blocking.",
    );
    if (process.platform === "win32")
      shell.openPath("C:\\Windows\\System32\\drivers\\etc");
    return await isAdmin();
  });

  ipcMain.handle("blocker:testSiteBlock", async () => writeHostsBlock(["studyos-test.invalid"]));

  syncPolling();
}
