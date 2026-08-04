import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageContainer } from "@/components/layout/PageContainer";
import { Settings as SettingsIcon, Sun, Moon, Monitor, Bell, Download, Upload, Keyboard, Palette } from "lucide-react";

type Theme = "light" | "dark" | "system";
type Shortcuts = Record<string, string>;

const STORAGE_KEY = "studyos_settings_v1";

const DARK_VARS: Record<string, string> = {
  "--color-bg-primary": "#07070f",
  "--color-bg-secondary": "#0d0d1a",
  "--color-bg-tertiary": "#111120",
  "--color-bg-card": "#13131f",
  "--color-bg-glass": "rgba(255,255,255,0.035)",
  "--color-border": "rgba(255,255,255,0.07)",
  "--color-border-hover": "rgba(255,255,255,0.14)",
  "--color-text-primary": "#eeeeff",
  "--color-text-secondary": "#7a7a9a",
  "--color-text-muted": "#4a4a65",
};

const LIGHT_VARS: Record<string, string> = {
  "--color-bg-primary": "#f4f4f8",
  "--color-bg-secondary": "#eaeaf2",
  "--color-bg-tertiary": "#e0e0ec",
  "--color-bg-card": "#ffffff",
  "--color-bg-glass": "rgba(0,0,0,0.03)",
  "--color-border": "rgba(0,0,0,0.1)",
  "--color-border-hover": "rgba(0,0,0,0.2)",
  "--color-text-primary": "#0f0f1a",
  "--color-text-secondary": "#4a4a6a",
  "--color-text-muted": "#8888aa",
};

function applyThemeVars(theme: Theme, accent: string) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const vars = theme === "light" ? LIGHT_VARS : theme === "dark" ? DARK_VARS : prefersDark ? DARK_VARS : LIGHT_VARS;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty("--color-accent", accent);
  // derive glow from accent
  root.style.setProperty("--color-accent-hover", accent);
}

function readJSON(key: string) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

const defaultSettings = {
  theme: "dark" as Theme,
  accent: "#7c6af7",
  language: "en",
  notifications: { desktop: true, inApp: true },
  shortcuts: { startPomodoro: "Ctrl+P", newNote: "Ctrl+N", quickReminder: "Ctrl+R" } as Shortcuts,
};

export function Settings() {
  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...(readJSON(STORAGE_KEY) || {}) }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyThemeVars(settings.theme, settings.accent);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [settings]);

  function set<K extends keyof typeof settings>(k: K, v: any) {
    setSettings(s => ({ ...s, [k]: v }));
  }

  function exportBackup() {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith("studyos_")) out[key] = localStorage.getItem(key) as string;
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studyos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(file: File | null) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        Object.entries(parsed).forEach(([k, v]) => localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)));
        alert("Restore completed. Reload the app to apply changes.");
      } catch { alert("Invalid backup file"); }
    };
    r.readAsText(file);
  }

  function requestNotifPermission() {
    if ("Notification" in window)
      Notification.requestPermission().then(p => set("notifications", { ...settings.notifications, desktop: p === "granted" }));
  }

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "dark", label: "Dark", icon: <Moon size={15} /> },
    { value: "light", label: "Light", icon: <Sun size={15} /> },
    { value: "system", label: "System", icon: <Monitor size={15} /> },
  ];

  const sectionHead = (icon: React.ReactNode, label: string) => (
    <div className="flex items-center gap-2 mb-4">
      <div style={{ color: 'var(--color-accent)' }}>{icon}</div>
      <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</h4>
    </div>
  );

  return (
    <PageContainer className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(124,106,247,0.2),rgba(124,106,247,0.08))', border: '1px solid rgba(124,106,247,0.2)' }}>
            <SettingsIcon size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Theme, accent, notifications, backup & shortcuts</p>
          </div>
        </div>
        {saved && (
          <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.2)', color: 'var(--color-success)' }}>
            ✓ Saved
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-5">

        {/* ── Appearance ── */}
        <Card padding="lg">
          {sectionHead(<Palette size={16} />, "Appearance")}

          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Theme</p>
          <div className="flex gap-2 mb-5">
            {themeOptions.map(opt => (
              <button key={opt.value} onClick={() => set("theme", opt.value)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all duration-150"
                style={{
                  background: settings.theme === opt.value ? 'rgba(124,106,247,0.15)' : 'rgba(255,255,255,0.04)',
                  border: settings.theme === opt.value ? '1px solid rgba(124,106,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: settings.theme === opt.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  boxShadow: settings.theme === opt.value ? '0 0 12px rgba(124,106,247,0.2)' : 'none',
                  cursor: 'pointer',
                }}>
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Accent color</p>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.accent}
              onChange={e => set("accent", e.target.value)}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'none', padding: 2 }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{settings.accent}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click to change</p>
            </div>
          </div>

          {/* Accent presets */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {['#7c6af7','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899'].map(c => (
              <button key={c} onClick={() => set("accent", c)}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: settings.accent === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </Card>

        {/* ── Language ── */}
        <Card padding="lg">
          {sectionHead(<Monitor size={16} />, "Language & Region")}
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Display language</p>
          <select value={settings.language} onChange={e => set("language", e.target.value)} style={{ width: '100%' }}>
            <option value="en">🇬🇧 English</option>
            <option value="es">🇪🇸 Español</option>
            <option value="hi">🇮🇳 हिन्दी</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="de">🇩🇪 Deutsch</option>
          </select>
          <p className="text-xs mt-4 mb-2" style={{ color: 'var(--color-text-muted)' }}>Date format</p>
          <select style={{ width: '100%' }}>
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </Card>

        {/* ── Notifications ── */}
        <Card padding="lg">
          {sectionHead(<Bell size={16} />, "Notifications")}
          <div className="space-y-3">
            {[
              { key: 'desktop', label: 'Desktop notifications', desc: 'Browser push alerts' },
              { key: 'inApp', label: 'In-app notifications', desc: 'Toast messages inside app' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
                <button onClick={() => set("notifications", { ...settings.notifications, [key]: !settings.notifications[key as keyof typeof settings.notifications] })}
                  style={{
                    width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', border: 'none',
                    background: settings.notifications[key as keyof typeof settings.notifications] ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.2s',
                    boxShadow: settings.notifications[key as keyof typeof settings.notifications] ? '0 0 10px rgba(124,106,247,0.4)' : 'none',
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s',
                    left: settings.notifications[key as keyof typeof settings.notifications] ? 23 : 3,
                  }} />
                </button>
              </div>
            ))}
            <Button variant="secondary" onClick={requestNotifPermission} className="w-full justify-center mt-2">
              Request Browser Permission
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* ── Backup ── */}
        <Card padding="lg">
          {sectionHead(<Download size={16} />, "Backup & Restore")}
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Export all your local StudyOS data as a JSON file, or restore from a previous backup.
          </p>
          <div className="flex gap-3">
            <Button variant="primary" onClick={exportBackup}>
              <Download size={14} /> Export Backup
            </Button>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--color-text-primary)',
            }}>
              <Upload size={14} /> Restore
              <input type="file" accept="application/json"
                onChange={e => restoreBackup(e.target.files?.[0] || null)}
                style={{ display: "none" }} />
            </label>
          </div>
        </Card>

        {/* ── Shortcuts ── */}
        <Card padding="lg">
          {sectionHead(<Keyboard size={16} />, "Keyboard Shortcuts")}
          <div className="space-y-3">
            {Object.entries(settings.shortcuts as Shortcuts).map(([action, key]) => (
              <div key={action} className="flex items-center justify-between gap-4">
                <p className="text-sm capitalize" style={{ color: 'var(--color-text-secondary)', minWidth: 120 }}>
                  {action.replace(/([A-Z])/g, " $1")}
                </p>
                <Input
                  value={key}
                  onChange={e => set("shortcuts", { ...settings.shortcuts, [action]: e.target.value })}
                  className="text-center font-mono text-xs"
                  style={{ maxWidth: 120 }}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default Settings;
