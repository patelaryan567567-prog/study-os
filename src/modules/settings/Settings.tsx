import { useState, useEffect, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
  Moon,
  Sun,
  Monitor,
  Bell,
  Keyboard,
  Download,
  Upload,
  BookOpen,
  Palette,
  Languages,
  Database,
  CheckCircle,
  Save,
  RotateCcw,
  EyeOff,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const BACKUP_KEY_PREFIX = "studyos_";
const MAX_BACKUP_VALUE_LENGTH = 5_000_000;

/**
 * Restores only StudyOS-owned string entries so a crafted backup file cannot
 * overwrite unrelated storage keys or inject non-string payloads.
 */
function restoreBackup(raw: string): number {
  const data: unknown = JSON.parse(raw);

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Backup file must contain a JSON object.");
  }

  let restored = 0;

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (!key.startsWith(BACKUP_KEY_PREFIX)) continue;
    if (typeof value !== "string") continue;
    if (value.length > MAX_BACKUP_VALUE_LENGTH) continue;

    localStorage.setItem(key, value);
    restored += 1;
  }

  if (restored === 0) throw new Error("Backup file contains no StudyOS data.");

  return restored;
}

export function Settings() {
  const { theme, setTheme } = useTheme();

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("studyos_language") || "en";
  });
  const [dateFormat, setDateFormat] = useState(() => {
    return localStorage.getItem("studyos_dateFormat") || "DD/MM/YYYY";
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("studyos_notifications");
    return saved
      ? JSON.parse(saved)
      : {
          desktop: true,
          browser: true,
          inApp: true,
          sound: true,
        };
  });
  const [shortcuts, setShortcuts] = useState(() => {
    const saved = localStorage.getItem("studyos_shortcuts");
    return saved
      ? JSON.parse(saved)
      : {
          pomodoro: "⌘ + P",
          note: "⌘ + N",
          reminder: "⌘ + R",
        };
  });
  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const [tempShortcuts, setTempShortcuts] = useState(shortcuts);
  const [notificationPermission, setNotificationPermission] = useState<
    "granted" | "denied" | "default"
  >("default");

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(
        Notification.permission as "granted" | "denied" | "default",
      );
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem("studyos_language", language);
    localStorage.setItem("studyos_dateFormat", dateFormat);
    localStorage.setItem(
      "studyos_notifications",
      JSON.stringify(notifications),
    );
    localStorage.setItem("studyos_shortcuts", JSON.stringify(shortcuts));
    alert("Settings saved successfully!");
  };

  const resetDefaults = () => {
    setLanguage("en");
    setDateFormat("DD/MM/YYYY");
    setNotifications({
      desktop: true,
      browser: true,
      inApp: true,
      sound: true,
    });
    const defaultShortcuts = {
      pomodoro: "⌘ + P",
      note: "⌘ + N",
      reminder: "⌘ + R",
    };
    setShortcuts(defaultShortcuts);
    setTempShortcuts(defaultShortcuts);
    setTheme("system");
    localStorage.removeItem("studyos_language");
    localStorage.removeItem("studyos_dateFormat");
    localStorage.removeItem("studyos_notifications");
    localStorage.removeItem("studyos_shortcuts");
    localStorage.removeItem("theme");
    alert("Settings reset to defaults!");
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission as "granted" | "denied" | "default");
      if (permission === "granted") {
        alert("Notification permission granted!");
      } else {
        alert(
          "Notification permission denied. Please enable in browser settings.",
        );
      }
    } else {
      alert("Notifications are not supported in this browser.");
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const saveShortcuts = () => {
    setShortcuts(tempShortcuts);
    setIsEditingShortcuts(false);
    localStorage.setItem("studyos_shortcuts", JSON.stringify(tempShortcuts));
  };

  const cancelShortcuts = () => {
    setTempShortcuts(shortcuts);
    setIsEditingShortcuts(false);
  };

  const handleShortcutKey = (
    key: keyof typeof shortcuts,
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    event.preventDefault();
    const keys: string[] = [];
    if (event.metaKey) keys.push("⌘");
    if (event.ctrlKey) keys.push("⌃");
    if (event.shiftKey) keys.push("⇧");
    if (event.altKey) keys.push("⌥");

    const keyMap: Record<string, string> = {
      p: "P",
      n: "N",
      r: "R",
      s: "S",
      q: "Q",
      e: "E",
      d: "D",
      f: "F",
      g: "G",
      h: "H",
      j: "J",
      k: "K",
      l: "L",
    };

    const keyName =
      event.key.length === 1
        ? keyMap[event.key.toLowerCase()] || event.key.toUpperCase()
        : event.key;
    if (keyName && !["Meta", "Control", "Shift", "Alt"].includes(keyName)) {
      keys.push(keyName);
      setTempShortcuts((prev) => ({
        ...prev,
        [key]: keys.join(" + "),
      }));
    }
  };

  const settingsSections = [
    {
      id: "appearance",
      icon: Palette,
      title: "Appearance",
      description: "Customize how StudyOS looks",
      color: "primary",
      glow: "rgba(139, 92, 246, 0.3)",
      children: (
        <div className="flex gap-3 mt-4">
          {[
            { value: "dark", icon: Moon, label: "Dark" },
            { value: "light", icon: Sun, label: "Light" },
            { value: "system", icon: Monitor, label: "System" },
          ].map((option) => {
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as any)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-300 relative group",
                  isActive
                    ? "bg-primary-500/20 border-2 border-primary-500 shadow-lg shadow-primary-500/20"
                    : "bg-gray-100 dark:bg-gray-800/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600",
                )}
              >
                {isActive && (
                  <div className="absolute -inset-0.5 rounded-xl bg-primary-500/20 blur-md -z-10" />
                )}
                <option.icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive
                      ? "text-primary-500"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive
                      ? "text-primary-500 dark:text-primary-400"
                      : "text-gray-600 dark:text-gray-300",
                  )}
                >
                  {option.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTheme"
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary-500"
                  />
                )}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      id: "language",
      icon: Languages,
      title: "Language & Region",
      description: "Set your preferred language and date format",
      color: "accent",
      glow: "rgba(245, 158, 11, 0.3)",
      children: (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi</option>
              <option value="es">🇪🇸 Spanish</option>
              <option value="fr">🇫🇷 French</option>
              <option value="de">🇩🇪 German</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Notifications",
      description: "Manage how you receive alerts",
      color: "pink",
      glow: "rgba(236, 72, 153, 0.3)",
      children: (
        <div className="space-y-3 mt-4">
          {(
            [
              {
                key: "desktop",
                label: "Desktop Notifications",
                desc: "Show system notifications",
              },
              {
                key: "browser",
                label: "Browser Push Alerts",
                desc: "Receive push notifications in browser",
              },
              {
                key: "inApp",
                label: "In-App Notifications",
                desc: "Show toast messages inside app",
              },
              {
                key: "sound",
                label: "Sound Alerts",
                desc: "Play sound for notifications",
              },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
              <button
                onClick={() => toggleNotification(item.key)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
                  notifications[item.key]
                    ? "bg-primary-500 shadow-lg shadow-primary-500/30"
                    : "bg-gray-300 dark:bg-gray-600",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300",
                    notifications[item.key] ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          ))}
          <AnimatedButton
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={requestNotificationPermission}
          >
            {notificationPermission === "granted" ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Notifications Enabled
              </>
            ) : notificationPermission === "denied" ? (
              <>
                <EyeOff className="h-4 w-4 text-rose-500" />
                Permission Denied
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Request Browser Permission
              </>
            )}
          </AnimatedButton>
          {notificationPermission === "granted" && (
            <div className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-center text-xs text-emerald-600 dark:text-emerald-400">
              ✅ Notifications are enabled in your browser
            </div>
          )}
          {notificationPermission === "denied" && (
            <div className="mt-2 rounded-lg bg-rose-500/10 p-2 text-center text-xs text-rose-600 dark:text-rose-400">
              ⚠️ Please enable notifications in your browser settings
            </div>
          )}
        </div>
      ),
    },
    {
      id: "shortcuts",
      icon: Keyboard,
      title: "Keyboard Shortcuts",
      description: "Custom keyboard shortcuts for faster workflow",
      color: "cyan",
      glow: "rgba(6, 182, 212, 0.3)",
      children: (
        <div className="space-y-2 mt-4">
          {Object.entries(isEditingShortcuts ? tempShortcuts : shortcuts).map(
            ([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {key === "pomodoro"
                    ? "Start Pomodoro"
                    : key === "note"
                      ? "New Note"
                      : "Quick Reminder"}
                </span>
                {isEditingShortcuts ? (
                  <input
                    type="text"
                    value={value}
                    onKeyDown={(e) =>
                      handleShortcutKey(key as keyof typeof shortcuts, e)
                    }
                    onChange={(e) =>
                      setTempShortcuts((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder="Press keys..."
                    className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-mono text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <kbd className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-mono text-gray-700 dark:text-gray-300">
                    {value}
                  </kbd>
                )}
              </div>
            ),
          )}
          {isEditingShortcuts ? (
            <div className="flex gap-2">
              <AnimatedButton
                size="sm"
                className="flex-1"
                onClick={saveShortcuts}
              >
                <Save className="h-4 w-4" />
                Save
              </AnimatedButton>
              <AnimatedButton
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={cancelShortcuts}
              >
                Cancel
              </AnimatedButton>
            </div>
          ) : (
            <AnimatedButton
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setIsEditingShortcuts(true)}
            >
              Edit Shortcuts
            </AnimatedButton>
          )}
        </div>
      ),
    },
    {
      id: "backup",
      icon: Database,
      title: "Backup & Restore",
      description: "Export your data or restore from backup",
      color: "emerald",
      glow: "rgba(16, 185, 129, 0.3)",
      children: (
        <div className="flex gap-3 mt-4">
          <AnimatedButton
            variant="outline"
            className="flex-1"
            onClick={() => {
              const data: Record<string, string | null> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("studyos_")) {
                  data[key] = localStorage.getItem(key);
                }
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `studyos-backup-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />
            Export Backup
          </AnimatedButton>
          <AnimatedButton
            variant="outline"
            className="flex-1"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const restored = restoreBackup(
                      event.target?.result as string,
                    );
                    alert(
                      `Backup restored (${restored} setting${restored === 1 ? "" : "s"})! Please refresh the page.`,
                    );
                  } catch {
                    alert("Invalid backup file.");
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
          >
            <Upload className="h-4 w-4" />
            Restore Backup
          </AnimatedButton>
        </div>
      ),
    },
    {
      id: "lectures",
      icon: BookOpen,
      title: "Lecture Tracker",
      description: "Create chapters and track your lectures",
      color: "violet",
      glow: "rgba(139, 92, 246, 0.3)",
      children: (
        <div className="mt-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="New chapter name (e.g., Chapter 1)"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <AnimatedButton size="sm">Add Chapter</AnimatedButton>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              <GradientText from="from-primary-500" to="to-accent-500">
                Settings
              </GradientText>
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Customize your StudyOS experience
            </p>
          </div>
          <div className="flex gap-2">
            <AnimatedButton variant="outline" size="sm" onClick={resetDefaults}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </AnimatedButton>
            <AnimatedButton size="sm" onClick={saveSettings}>
              <Save className="h-4 w-4" />
              Save All
            </AnimatedButton>
          </div>
        </motion.div>

        <div className="space-y-4">
          {settingsSections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="relative">
                <div
                  className="absolute -inset-0.5 rounded-2xl blur-xl opacity-30"
                  style={{
                    background: `radial-gradient(circle at center, ${section.glow}, transparent 70%)`,
                  }}
                />
                <GlassCard className="relative p-6 transition-all hover:scale-[1.01]">
                  <div className="flex items-start gap-4">
                    <div
                      className="rounded-xl p-3 shrink-0"
                      style={{
                        background: `rgba(var(--color-${section.color}-500), 0.1)`,
                      }}
                    >
                      <section.icon
                        className="h-6 w-6"
                        style={{ color: `var(--color-${section.color}-500)` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {section.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {section.description}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {section.id === "appearance" && `Current: ${theme}`}
                          {section.id === "language" && `Language: ${language}`}
                          {section.id === "notifications" &&
                            `${Object.values(notifications).filter(Boolean).length}/4 enabled`}
                        </div>
                      </div>
                      {section.children}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
