import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui";
import {
  Plus,
  ShieldCheck,
  ShieldAlert,
  MonitorSmartphone,
  Ban,
  Globe,
  Trash,
  Edit,
  Power,
  Zap,
  AppWindow,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type BlockRule,
  type UsageMap,
  applyRules,
  formatDuration,
  getBlockerStatus,
  getDnsBlockerState,
  getInstalledApps,
  loadRulesLocal,
  loadRulesWithSync,
  requestBlockerPermissions,
  ruleProgress,
  setDnsBlocker,
  setNativeFocusMode,
  subscribeBlocked,
  subscribeUsage,
  uid,
} from "@/services/appBlockerService";
import { hasGuardianLock, setGuardianPin, verifyGuardianPin } from "@/services/guardianLock";

const PRESETS = [
  { name: "YouTube", kind: "site" as const, target: "youtube.com", dailyLimitMin: 30 },
  { name: "Instagram", kind: "site" as const, target: "instagram.com", dailyLimitMin: 30 },
  { name: "Reddit", kind: "site" as const, target: "reddit.com", dailyLimitMin: 20 },
  { name: "Twitter / X", kind: "site" as const, target: "x.com", dailyLimitMin: 15 },
  { name: "Chrome", kind: "app" as const, target: "chrome", dailyLimitMin: 0 },
  { name: "Discord", kind: "app" as const, target: "discord", dailyLimitMin: 30 },
];

export function AppBlocker() {
  const [rules, setRules] = useState<BlockRule[]>(loadRulesLocal);

  // pull cloud copy (login on a new device restores rules)
  useEffect(() => {
    loadRulesWithSync().then((r) => {
      if (r.length) setRules(r);
    });
  }, []);
  const [usage, setUsage] = useState<UsageMap>({});
  const [platform, setPlatform] = useState<"desktop" | "android" | "web">("web");
  const [permsGranted, setPermsGranted] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [blockedToast, setBlockedToast] = useState<string | null>(null);
  const [rulesApplying, setRulesApplying] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [applyAttempt, setApplyAttempt] = useState(0);

  // Secure DNS (DNS-over-HTTPS) control — disabling it makes hosts-file site
  // blocking actually work in Chrome/Edge. Requires admin (desktop).
  const [dnsBlocked, setDnsBlocked] = useState(false);
  const [dnsAdmin, setDnsAdmin] = useState(false);
  const [dnsBusy, setDnsBusy] = useState(false);
  const [dnsError, setDnsError] = useState<string | null>(null);

  // Installed-app picker state
  const [appsOpen, setAppsOpen] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsList, setAppsList] = useState<
    { process: string; name: string }[]
  >([]);
  const [appsQuery, setAppsQuery] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [guardianPin, setGuardianPinInput] = useState("");
  const [guardianAction, setGuardianAction] = useState<null | (() => void)>(null);
  const [guardianError, setGuardianError] = useState("");
  const [editRule, setEditRule] = useState<BlockRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    kind: "site" as BlockRule["kind"],
    target: "",
    dailyLimitMin: 30,
    strict: false,
  });

  const guarded = (action: () => void) => {
    setGuardianAction(() => action); setGuardianPinInput(""); setGuardianError(""); setGuardianOpen(true);
  };
  const confirmGuardian = async () => {
    try {
      if (!hasGuardianLock()) await setGuardianPin(guardianPin);
      else if (!(await verifyGuardianPin(guardianPin))) { setGuardianError("Incorrect guardian PIN."); return; }
      guardianAction?.(); setGuardianOpen(false); setGuardianAction(null);
    } catch (e: any) { setGuardianError(e.message || "Could not save guardian PIN."); }
  };

  useEffect(() => {
    getBlockerStatus().then(({ status, usage }) => {
      setPlatform(status.platform);
      setPermsGranted(status.permissionsGranted);
      setUsage(usage);
    });
    const unsubUsage = subscribeUsage((u) => setUsage(u));
    const unsubBlocked = subscribeBlocked((d) => {
      setBlockedToast(
        d.reason === "focus"
          ? `${d.name} blocked — focus mode is ON`
          : `${d.name} blocked — daily limit reached`,
      );
      setTimeout(() => setBlockedToast(null), 4000);
    });
    return () => {
      unsubUsage();
      unsubBlocked();
    };
  }, []);

  // load current Secure DNS control state (desktop only)
  useEffect(() => {
    getDnsBlockerState().then((st) => {
      if (!st) return; // web / android — feature not available
      setDnsBlocked(!!st.desired);
      setDnsAdmin(!!st.admin);
    });
  }, []);

  // Push every change to the native engine. In particular, disabling or
  // deleting a site rule rewrites the StudyOS section of the hosts file.
  // Surface permission failures: otherwise the UI says "off" while an old
  // hosts entry may still be active until StudyOS is run as administrator.
  useEffect(() => {
    let cancelled = false;
    setRulesApplying(true);
    setRulesError(null);
    applyRules(rules)
      .then((result) => {
        if (!cancelled && !result.ok) {
          setRulesError(
            result.error ||
              "The rule was saved, but Windows could not update the website blocker.",
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setRulesError(
            "The rule was saved, but Windows could not update the website blocker. Run StudyOS as administrator and retry.",
          );
      })
      .finally(() => {
        if (!cancelled) setRulesApplying(false);
      });
    return () => { cancelled = true; };
  }, [rules, applyAttempt]);

  const setFocusProtection = async (next: boolean) => {
    setFocusMode(next);
    await setNativeFocusMode(next);
  };
  const toggleFocus = () => {
    if (focusMode) guarded(() => { void setFocusProtection(false); });
    else void setFocusProtection(true);
  };

  const grantPerms = async () => {
    const ok = await requestBlockerPermissions();
    setPermsGranted(ok);
  };

  const applyDnsToggle = async () => {
    setDnsBusy(true);
    setDnsError(null);
    try {
      const res = await setDnsBlocker(!dnsBlocked);
      if (res?.ok) {
        setDnsBlocked(!dnsBlocked);
      } else {
        setDnsError(
          res?.error ||
            "Couldn't change the Secure DNS setting. Run StudyOS as administrator and try again.",
        );
      }
    } catch {
      setDnsError(
        "Couldn't change the Secure DNS setting. Run StudyOS as administrator and try again.",
      );
    } finally {
      setDnsBusy(false);
    }
  };
  const toggleDns = () => {
    if (dnsBlocked) guarded(() => { void applyDnsToggle(); });
    else void applyDnsToggle();
  };

  const openAppPicker = async () => {
    setAppsOpen(true);
    setAppsLoading(true);
    setAppsList([]);
    setAppsQuery("");
    try {
      const list = await getInstalledApps();
      setAppsList(list);
    } finally {
      setAppsLoading(false);
    }
  };

  const pickApp = (process: string, name: string) => {
    setForm((f) => ({ ...f, kind: "app", target: process, name: name || process }));
    setAppsOpen(false);
  };

  const filteredApps = useMemo(
    () =>
      appsList.filter((a) => {
        const q = appsQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          a.process.toLowerCase().includes(q)
        );
      }),
    [appsList, appsQuery],
  );

  const addOrUpdate = () => {
    if (!form.target.trim()) return;
    if (editRule) {
      setRules((s) =>
        s.map((r) =>
          r.id === editRule.id
            ? {
                ...r,
                name: form.name.trim() || form.target.trim(),
                kind: form.kind,
                target: form.target.trim().toLowerCase(),
                dailyLimitMin: Math.max(0, Number(form.dailyLimitMin) || 0),
                strict: form.strict,
              }
            : r,
        ),
      );
    } else {
      const rule: BlockRule = {
        id: uid("blk_"),
        name: form.name.trim() || form.target.trim(),
        kind: form.kind,
        target: form.target.trim().toLowerCase(),
        dailyLimitMin: Math.max(0, Number(form.dailyLimitMin) || 0),
        enabled: true,
        strict: form.strict,
      };
      setRules((s) => [...s, rule]);
    }
    setAddOpen(false);
    setEditRule(null);
    setForm({ name: "", kind: "site", target: "", dailyLimitMin: 30, strict: false });
  };

  const openEdit = (r: BlockRule) => {
    setEditRule(r);
    setForm({
      name: r.name,
      kind: r.kind,
      target: r.target,
      dailyLimitMin: r.dailyLimitMin,
      strict: r.strict,
    });
    setAddOpen(true);
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const blockedNow = useMemo(
    () => rules.filter((r) => r.enabled && ruleProgress(r, usage).blocked).length,
    [rules, usage],
  );

  const platformLabel =
    platform === "desktop"
      ? "Desktop (Electron) — live usage tracking active"
      : platform === "android"
        ? "Android — native usage access + lock screen"
        : "Web preview — connect the desktop app or Android build for real blocking";

  return (
    <div className="space-y-6">
      {/* Blocked toast */}
      <AnimatePresence>
        {blockedToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass glow-border-red rounded-xl p-4 flex items-center gap-3"
          >
            <Ban size={18} className="text-red-400" />
            <span className="text-sm font-medium text-red-300">{blockedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Card
        padding="lg"
        className="glow-border-blue flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h3 className="text-2xl font-bold gradient-title">App &amp; Site Blocker</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
            <MonitorSmartphone size={14} /> {platformLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={focusMode ? "primary" : "secondary"}
            onClick={toggleFocus}
          >
            <Zap size={14} /> {focusMode ? "Focus ON" : "Focus OFF"}
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Rule
          </Button>
        </div>
      </Card>

      {/* Permission banner */}
      {platform !== "web" && !permsGranted && (
        <Card padding="md" className="glow-border-amber">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} className="text-amber-400" />
              <div>
                <p className="font-semibold text-amber-300">
                  Permissions required
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {platform === "desktop"
                    ? "Run StudyOS as administrator to block websites via the hosts file."
                    : "Grant Usage Access, Display over other apps and Notifications so Android can track and lock apps/sites."}
                </p>
              </div>
            </div>
            <Button variant="primary" onClick={grantPerms}>
              Grant Permission
            </Button>
          </div>
        </Card>
      )}
      {platform !== "web" && permsGranted && (
        <Card padding="md" className="glow-border-green">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-400" />
            <p className="text-sm text-emerald-300">
              Permissions granted — blocking is active on this device.
            </p>
          </div>
        </Card>
      )}
      {rulesError && (
        <Card padding="md" className="glow-border-red">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-red-300">
              {rulesError} The old website block may still be active.
            </p>
            <Button
              size="sm"
              variant="danger"
              loading={rulesApplying}
              onClick={() => setApplyAttempt((n) => n + 1)}
            >
              Retry applying rules
            </Button>
          </div>
        </Card>
      )}
      {platform === "android" && (
        <Card padding="md" className="glow-border-cyan">
          <p className="text-sm text-[var(--color-text-muted)]">
            Website blocking uses a local DNS VPN. Set Android <strong>Private DNS</strong> to
            <strong> Automatic</strong> or <strong>Off</strong>; a custom Private DNS provider
            bypasses every local DNS blocker.
          </p>
        </Card>
      )}

      {/* Secure DNS (DNS-over-HTTPS) control — desktop only */}
      {platform === "desktop" && (
        <Card padding="md" className="glow-border-cyan">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <ShieldCheck
                size={20}
                className={`${dnsBlocked ? "text-emerald-400" : "text-cyan-400"} shrink-0 mt-0.5`}
              />
              <div className="min-w-0">
                <p className="font-semibold">
                  Disable Secure DNS (Chrome & Edge)
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Chrome/Edge use DNS-over-HTTPS, which bypasses the hosts file and
                  stops website blocking. Turning this ON lets website rules work.
                  Focus mode disables it automatically.
                </p>
                {dnsAdmin ? (
                  <p className="text-xs text-emerald-400 mt-1">
                    {dnsBlocked
                      ? "Secure DNS is disabled in Chrome & Edge — website blocking now works. Restart the browsers once to apply."
                      : "Secure DNS is enabled by the browser (website blocking may be bypassed)."}
                  </p>
                ) : (
                  <p className="text-xs text-amber-400 mt-1">
                    Requires administrator — run StudyOS as administrator to change this
                    setting.
                  </p>
                )}
                {dnsError && (
                  <p className="mt-1 text-xs text-red-400">{dnsError}</p>
                )}
              </div>
            </div>
            <Button
              variant={dnsBlocked ? "success" : "secondary"}
              loading={dnsBusy}
              onClick={toggleDns}
              className="shrink-0"
            >
              <Power size={14} />
              {dnsBlocked ? "Re-enable Secure DNS" : "Disable Secure DNS"}
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md" className="glow-border-blue accent-left flex flex-col gap-1" style={{ ["--accent-top" as string]: "#60a5fa", ["--accent-bottom" as string]: "#c084fc" }}>
          <h4 className="text-sm font-semibold text-blue-400">Active Rules</h4>
          <p className="text-3xl font-bold text-blue-300">{activeCount}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {rules.length} total
          </p>
        </Card>
        <Card padding="md" className="glow-border-red accent-left flex flex-col gap-1" style={{ ["--accent-top" as string]: "#f87171", ["--accent-bottom" as string]: "#fb923c" }}>
          <h4 className="text-sm font-semibold text-red-400">Blocked Now</h4>
          <p className="text-3xl font-bold text-red-300">{blockedNow}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            apps/sites past their limit
          </p>
        </Card>
        <Card padding="md" className="glow-border-purple accent-left flex flex-col gap-1" style={{ ["--accent-top" as string]: "#c084fc", ["--accent-bottom" as string]: "#f472b6" }}>
          <h4 className="text-sm font-semibold text-purple-400">Focus Mode</h4>
          <p className="text-3xl font-bold text-purple-300">{focusMode ? "ON" : "OFF"}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            all rules strictly enforced
          </p>
        </Card>
      </div>

      {/* Quick presets */}
      <Card padding="md" className="glow-border-cyan">
        <h4 className="font-semibold text-cyan-300 mb-3">Quick Add</h4>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const exists = rules.some(
              (r) => r.target === p.target && r.kind === p.kind,
            );
            return (
              <button
                key={p.target}
                disabled={exists}
                onClick={() =>
                  setRules((s) => [
                    ...s,
                    { ...p, id: uid("blk_"), enabled: true, strict: false },
                  ])
                }
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                  exists
                    ? "bg-white/5 text-[var(--color-text-muted)] cursor-not-allowed"
                    : "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 hover-glow"
                }`}
              >
                {p.kind === "site" ? <Globe size={11} className="inline mr-1" /> : null}
                {p.name} {exists ? "✓" : `+ ${p.dailyLimitMin}m`}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 && (
          <Card padding="md">
            <EmptyState
              title="No blocking rules yet"
              description="Add an app or website and set a daily time limit"
              primaryLabel="Add Rule"
              onPrimary={() => setAddOpen(true)}
            />
          </Card>
        )}
        <AnimatePresence>
          {rules.map((r) => {
            const prog = ruleProgress(r, usage);
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card
                  padding="md"
                  className={`accent-left hover-glow ${
                    prog.blocked && r.enabled
                      ? "glow-border-red"
                      : r.kind === "site"
                        ? "glow-border-purple"
                        : "glow-border-blue"
                  } ${r.enabled ? "" : "opacity-50"}`}
                  style={{
                    ["--accent-top" as string]: prog.blocked
                      ? "#f87171"
                      : r.kind === "site"
                        ? "#c084fc"
                        : "#60a5fa",
                    ["--accent-bottom" as string]: "#34d399",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-[220px] flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.kind === "site" ? (
                          <Globe size={14} className="text-purple-400" />
                        ) : (
                          <Ban size={14} className="text-blue-400" />
                        )}
                        <h5 className="font-semibold">{r.name}</h5>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                          {r.kind === "site" ? r.target : r.target}
                        </span>
                        {prog.blocked && r.enabled && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-400">
                            Blocked
                          </span>
                        )}
                        {r.strict && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                            Strict
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              prog.blocked
                                ? "bg-gradient-to-r from-red-500 to-orange-400"
                                : "bg-gradient-to-r from-blue-500 to-emerald-400"
                            }`}
                            style={{ width: `${prog.pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {r.dailyLimitMin === 0
                            ? "always blocked"
                            : `${formatDuration(prog.usedSec)} / ${r.dailyLimitMin}m`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant={r.enabled ? "success" : "ghost"}
                        title={r.enabled ? "Disable rule" : "Enable rule"}
                        onClick={() => guarded(() => setRules((s) =>
                            s.map((x) =>
                              x.id === r.id ? { ...x, enabled: !x.enabled } : x,
                            ),
                          ))}
                      >
                        <Power size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit"
                        onClick={() => guarded(() => openEdit(r))}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="danger"
                        title="Delete"
                        onClick={() => guarded(() => setRules((s) => s.filter((x) => x.id !== r.id)))}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditRule(null);
        }}
        title={editRule ? "Edit Rule" : "Add Blocking Rule"}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["site", "app"] as const).map((k) => (
              <button
                key={k}
                className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${
                  form.kind === k
                    ? "bg-[var(--color-accent)] text-white"
                    : "glass text-[var(--color-text-muted)]"
                }`}
                onClick={() => setForm((f) => ({ ...f, kind: k }))}
              >
                {k === "site" ? "Website" : "Application"}
              </button>
            ))}
          </div>
          <Input
            placeholder={form.kind === "site" ? "Domain (e.g. youtube.com)" : "Process name (e.g. chrome / chrome.exe)"}
            value={form.target}
            onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
          />
          {form.kind === "app" && platform !== "web" && (
            <Button
              variant="secondary"
              onClick={openAppPicker}
              className="w-full justify-center"
            >
              <AppWindow size={14} /> Pick an installed app…
            </Button>
          )}
          <Input
            placeholder="Display name (optional)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">
                Daily limit (minutes, 0 = block always)
              </label>
              <Input
                type="number"
                min={0}
                value={form.dailyLimitMin}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dailyLimitMin: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <button
                className={`w-full px-3 py-2.5 rounded-xl text-sm transition-all ${
                  form.strict
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
                    : "glass text-[var(--color-text-muted)]"
                }`}
                onClick={() => setForm((f) => ({ ...f, strict: !f.strict }))}
              >
                {form.strict ? "Strict: force-close app ON" : "Strict mode OFF"}
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {platform === "web"
              ? "Note: real blocking requires the desktop app or Android build. Rules are saved and will sync automatically."
              : form.kind === "site"
                ? "Websites are blocked at OS level (hosts file). Strict mode not needed."
                : "Strict mode force-closes the app when the limit is hit; otherwise StudyOS just comes to the front with a warning."}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAddOpen(false);
                setEditRule(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={addOrUpdate}>
              {editRule ? "Save Changes" : "Add Rule"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Installed-app picker modal */}
      <Modal
        open={appsOpen}
        onClose={() => setAppsOpen(false)}
        title="Pick an app to block"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <Input
              placeholder="Search apps…"
              value={appsQuery}
              onChange={(e) => setAppsQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          {appsLoading ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              Scanning installed apps…
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10">
              {filteredApps.length === 0 ? (
                <p className="py-8 px-4 text-center text-xs text-[var(--color-text-muted)]">
                  {appsList.length === 0
                    ? "No apps found — the picker is available in the Android app and the desktop app (Windows). You can still type a package/process name."
                    : "No apps match your search."}
                </p>
              ) : (
                filteredApps.map((a) => (
                  <button
                    key={a.process}
                    type="button"
                    onClick={() => pickApp(a.process, a.name)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/10"
                  >
                    <AppWindow size={14} className="text-blue-400 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {a.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--color-text-muted)]">
                        {a.process}
                      </span>
                    </span>
                    <span className="text-xs text-emerald-400">Select</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>
      <Modal open={guardianOpen} onClose={() => setGuardianOpen(false)} title={hasGuardianLock() ? "Guardian approval" : "Set guardian PIN"} size="sm">
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">{hasGuardianLock() ? "Enter the guardian PIN to change a blocking rule." : "Ask the guardian to create a 4–12 digit PIN. It will protect blocker changes."}</p>
        <Input type="password" inputMode="numeric" label="Guardian PIN" value={guardianPin} onChange={(e: any) => setGuardianPinInput(e.target.value)} />
        {guardianError && <p className="mt-2 text-xs text-red-400">{guardianError}</p>}
        <Button className="mt-4 w-full" variant="primary" onClick={confirmGuardian}>{hasGuardianLock() ? "Approve change" : "Save guardian PIN"}</Button>
      </Modal>
    </div>
  );
}

export default AppBlocker;
