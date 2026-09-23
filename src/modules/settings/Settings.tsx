import { useState, useEffect, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
  Moon,
  Bell,
  Keyboard,
  Download,
  Upload,
  Palette,
  Languages,
  Database,
  CheckCircle,
  Save,
  RotateCcw,
  EyeOff,
  Sparkles,
  Accessibility,
  Type,
  Contrast,
} from "lucide-react";
import { ApiKeyManager } from "@/modules/ai/ApiKeyManager";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/lib/utils";
import { isNative } from "@/native/capacitorBridge";
import {
  applyAccessibilityPreferences,
  DEFAULT_ACCESSIBILITY,
  readAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/services/accessibility";

interface KeyboardShortcuts {
  pomodoro: string;
  note: string;
  reminder: string;
}

const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  pomodoro: "⌘ + P",
  note: "⌘ + N",
  reminder: "⌘ + R",
};

export function Settings() {
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
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(() => {
    const saved = localStorage.getItem("studyos_shortcuts");
    return saved ? (JSON.parse(saved) as KeyboardShortcuts) : DEFAULT_SHORTCUTS;
  });
  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const [tempShortcuts, setTempShortcuts] = useState(shortcuts);
  const [notificationPermission, setNotificationPermission] = useState<
    "granted" | "denied" | "default"
  >("default");
  const [isMobile, setIsMobile] = useState(false);
  const [accessibility, setAccessibility] = useState(readAccessibilityPreferences);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsMobile(mq.matches || isNative());
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

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
    const defaultShortcuts = { ...DEFAULT_SHORTCUTS };
    setShortcuts(defaultShortcuts);
    setTempShortcuts(defaultShortcuts);
    localStorage.removeItem("studyos_language");
    localStorage.removeItem("studyos_dateFormat");
    localStorage.removeItem("studyos_notifications");
    localStorage.removeItem("studyos_shortcuts");
    localStorage.removeItem("theme");
    applyAccessibilityPreferences(DEFAULT_ACCESSIBILITY);
    setAccessibility(DEFAULT_ACCESSIBILITY);
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

  const updateAccessibility = (patch: Partial<AccessibilityPreferences>) => {
    setAccessibility((previous) => {
      const next = { ...previous, ...patch };
      applyAccessibilityPreferences(next);
      return next;
    });
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
        <div className="mt-4">
          {/* Dark mode is the only theme — light mode was removed. */}
          <div className="flex items-center gap-3 rounded-xl border border-primary-500/20 bg-primary-500/10 p-4">
            <Moon className="h-6 w-6 shrink-0 text-primary-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Dark Mode</p>
              <p className="text-xs text-gray-400">
                StudyOS is optimized for a premium dark experience. Theme
                switching is disabled.
              </p>
            </div>
            <CheckCircle className="ml-auto h-5 w-5 shrink-0 text-success" />
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
      id: "accessibility",
      icon: Accessibility,
      title: "Accessibility & Reading",
      description: "Make StudyOS easier to read, navigate and focus on",
      color: "emerald",
      glow: "rgba(16, 185, 129, 0.3)",
      children: (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white"><Type className="h-4 w-4 text-emerald-400" /> Text size</span>
              <select
                value={accessibility.fontScale}
                onChange={(event) => updateAccessibility({ fontScale: event.target.value as AccessibilityPreferences["fontScale"] })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra large</option>
              </select>
            </label>
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
              Changes apply immediately across pages, dialogs and menus. Keyboard focus is always visible in high-contrast mode.
            </div>
          </div>
          {[
            { key: "reducedMotion" as const, label: "Reduce motion", desc: "Minimize transitions and animated effects" },
            { key: "highContrast" as const, label: "High contrast", desc: "Sharper text, stronger borders and focus rings", icon: Contrast },
            { key: "readableFont" as const, label: "Readable font", desc: "Use a simple, wider-spaced reading font", icon: Type },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => updateAccessibility({ [item.key]: !accessibility[item.key] })}
              className="flex w-full items-center justify-between rounded-xl bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800"
              aria-pressed={accessibility[item.key]}
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">{item.icon && <item.icon className="h-4 w-4 text-emerald-400" />}{item.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{item.desc}</span>
              </span>
              <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", accessibility[item.key] ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600")}>
                <span className={cn("h-4 w-4 rounded-full bg-white transition-transform", accessibility[item.key] ? "translate-x-6" : "translate-x-1")} />
              </span>
            </button>
          ))}
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
            onClick={isNative() ? undefined : requestNotificationPermission}
          >
            {isNative() ? (
              <span className="text-cyan-300">
                Managed by device settings
              </span>
            ) : notificationPermission === "granted" ? (
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
          {isNative() && (
            <div className="mt-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-center text-xs text-cyan-300">
              On Android / iOS, reminders are sent through your device's
              notification system (no browser permission needed).
            </div>
          )}
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
      id: "ai",
      icon: Sparkles,
      title: "AI Assistant (Gemini)",
      description: "Your personal Gemini API key powers StudyOS AI",
      color: "primary",
      glow: "rgba(139, 92, 246, 0.3)",
      children: (
        <div className="mt-4">
          <ApiKeyManager variant="settings" />
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
                    const data = JSON.parse(event.target?.result as string);
                    Object.entries(data).forEach(([key, value]) => {
                      localStorage.setItem(key, value as string);
                    });
                    alert(
                      "Backup restored successfully! Please refresh the page.",
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
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              <GradientText from="from-primary-500" to="to-accent-500">
                Settings
              </GradientText>
            </h1>
            <p className="mt-1 text-sm md:text-base text-gray-600 dark:text-gray-300">
              Customize your StudyOS experience
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          {settingsSections
            .filter((section) => !(isMobile && section.id === "shortcuts"))
            .map((section, index) => (
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {section.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {section.description}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {section.id === "appearance" && `Mode: Dark (always)`}
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
