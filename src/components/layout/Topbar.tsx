import { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Menu,
  Sparkles,
  Minus,
  Square,
  Copy,
  Flame,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store";
import { useAIChatStore } from "@/store/aiChatStore";
import { KEY_ROTATION_EVENT } from "@/services/gemini/geminiService";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui";
import { formatTime } from "@/utils";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils";
import { isNative } from "@/native/capacitorBridge";
import {
  collectNotifications,
  dismissNotifications,
  refreshAiRecommendation,
  type StudyNotification,
} from "@/services/notifications/notifications";

interface TopbarProps {
  onMenuClick: () => void;
  /**
   * When the mobile sidebar overlay is open, the topbar must stop being a
   * window-drag region: Electron intercepts mouse input over drag regions at
   * the OS level (no-drag on overlapping sibling elements does not carve
   * holes), which made the sidebar's close button unclickable.
   */
  dragDisabled?: boolean;
}

const NAV_ITEMS = [
  { label: "Dashboard", path: "/" },
  { label: "Focus Mode", path: "/focus" },
  { label: "Study Planner", path: "/planner" },
  { label: "Task Manager", path: "/tasks" },
  { label: "Lecture Tracker", path: "/lectures" },
  { label: "Module Tracker", path: "/modules" },
  { label: "Backlog Manager", path: "/backlog" },
  { label: "Revision Manager", path: "/revision" },
  { label: "Notes", path: "/notes" },
  { label: "Analytics", path: "/analytics" },
  { label: "Achievements", path: "/gamification" },
  { label: "Calendar", path: "/calendar" },
  { label: "AI Assistant", path: "/ai" },
  { label: "Settings", path: "/settings" },
  { label: "Profile", path: "/profile" },
];

const SAMPLE_NOTIFICATIONS: StudyNotification[] = [];

/* Self-contained clock: it updates every second without re-rendering the whole
   Topbar (which contains search/notification panels and the profile chip). */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      className="mr-2 shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono hidden sm:block"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "var(--color-text-secondary)",
      }}
    >
      {formatTime(time)}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (Number.isNaN(m)) return "just now";
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const notifIcon = {
  success: <CheckCircle size={14} style={{ color: "var(--color-success)" }} />,
  warning: (
    <AlertTriangle size={14} style={{ color: "var(--color-warning)" }} />
  ),
  info: <Clock size={14} style={{ color: "var(--color-info)" }} />,
  reminder: <Bell size={14} style={{ color: "var(--color-accent)" }} />,
  ai: <Sparkles size={14} style={{ color: "var(--color-accent)" }} />,
};

export function Topbar({ onMenuClick, dragDisabled = false }: TopbarProps) {
  const { user } = useAppStore();
  const tasks = useAppStore((s) => s.tasks);
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<StudyNotification[]>(SAMPLE_NOTIFICATIONS);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Legacy custom controls are retained for frameless builds. The Windows
  // installer uses the native frame, whose controls stay fixed above content.
  const winApi = (window as any).electronAPI;
  const usesNativeWindowFrame = Boolean(winApi?.usesNativeWindowFrame);
  const [maximized, setMaximized] = useState(false);
  const native = isNative();
  useEffect(() => {
    if (winApi?.onMaximizeChange) return winApi.onMaximizeChange(setMaximized);
  }, []);
  const windowMin = () => winApi?.minimize?.();
  const windowMax = () => winApi?.maximize?.();
  const windowClose = () => winApi?.close?.();

  // ── Header study stats ──
  // Streak lives in the gamification module's storage; poll it lightly so the
  // chip stays current without coupling the Topbar to the gamification state.
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const read = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("studyos_gamification_v1") || "{}");
        setStreak(Math.max(0, Number(saved?.streak) || 0));
      } catch {
        setStreak(0);
      }
    };
    read();
    const t = setInterval(read, 30_000);
    window.addEventListener("storage", read);
    window.addEventListener("studyos-data-changed", read);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", read);
      window.removeEventListener("studyos-data-changed", read);
    };
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const dueToday = tasks.filter((t) => t.dueDate === todayKey);
  const doneToday = dueToday.filter((t) => t.status === "completed").length;
  const todayPercent = dueToday.length ? Math.round((doneToday / dueToday.length) * 100) : null;
  const completedTodayCount = tasks.filter((t) => t.completedAt?.slice(0, 10) === todayKey).length;
  const xp = Math.max(0, user?.xp ?? 0);

  // ── StudyOS AI (background) ─────────────────────────────────────────────
  // The global AI chat store keeps requests running on every page, so the
  // topbar can show a live "AI working" indicator on the logo.
  const aiBusy = useAIChatStore((s) => s.busy);
  const [aiToast, setAiToast] = useState<string | null>(null);
  useEffect(() => {
    // Fires when a rate-limited/invalid key is auto-swapped for another one.
    const onRotation = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      const from = d.fromMasked
        ? `API Key ${(d.from ?? 0) + 1} (${d.fromMasked})`
        : "Your API key";
      const to = d.toMasked
        ? `API Key ${(d.to ?? 0) + 1} (${d.toMasked})`
        : "your next API key";
      const reason = d.reason === "invalid-key" ? "was rejected" : "hit its rate limit";
      setAiToast(`${from} ${reason} — switched to ${to}`);
      window.setTimeout(() => setAiToast(null), 7000);
    };
    window.addEventListener(KEY_ROTATION_EVENT, onRotation);
    return () => window.removeEventListener(KEY_ROTATION_EVENT, onRotation);
  }, []);

  useEffect(() => {
    const refresh = () => setNotifications(collectNotifications());
    refresh();
    refreshAiRecommendation().then(refresh).catch(() => {});
    const t = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function dismissAll() {
    dismissNotifications(notifications.map((n) => n.id));
    setNotifications(collectNotifications());
  }

  function dismissOne(id: string) {
    dismissNotifications([id]);
    setNotifications(collectNotifications());
  }

  // Close panels on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const filtered = searchQuery.trim()
    ? NAV_ITEMS.filter((i) =>
        i.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : NAV_ITEMS;

  function goTo(path: string) {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery("");
  }

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: native
      ? "max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 82px)"
      : "82px",
    right: 12,
    left: "auto",
    zIndex: 100,
    width: "min(360px, calc(100vw - 24px))",
    maxWidth: "min(360px, calc(100vw - 24px))",
    background: "rgba(8, 11, 25, 0.95)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    boxShadow: "0 22px 54px rgba(0,0,0,0.35), 0 0 0 1px rgba(124,106,247,0.1)",
  };

  return (
    <header
      className={cn(
        "sticky top-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 shrink-0",
        "bg-gray-900/85 border-b border-gray-800 text-white",
      )}
      style={{
        minHeight: "72px",
        // Native WebView + edge-to-edge: keep the header below the status bar.
        // Prefer Capacitor 8's injected --safe-area-inset-top when available.
        paddingTop: native
          ? "max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 12px)"
          : undefined,
        ...(native
          ? {}
          : {
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }),
        boxShadow: "0 10px 40px rgba(0,0,0,0.28)",
        position: "sticky",
        zIndex: 60,
        // A native Windows title bar owns the drag region and window controls.
        paddingRight: winApi && !usesNativeWindowFrame ? 128 : undefined,
        WebkitAppRegion:
          usesNativeWindowFrame || dragDisabled ? "no-drag" : "drag",
      } as any}
    >
      {/* Brand + Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          title="Toggle menu"
          aria-label="Toggle menu"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Menu
            className="h-5 w-5 shrink-0"
            style={{ color: "#d1d5db" }}
            strokeWidth={2.25}
          />
        </button>

        {/* StudyOS logo — clicking it opens StudyOS AI directly */}
        <button
          onClick={() => navigate("/ai")}
          title="Open StudyOS AI"
          className="relative flex items-center gap-3 shrink-0 rounded-xl px-1 py-0.5 text-left transition-transform duration-200 ease-out hover:scale-[1.03]"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 opacity-50 blur-sm" />
            <div className="relative rounded-lg bg-gray-950 p-1.5">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {aiBusy && (
              <span
                className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center"
                title="AI is working in the background"
              >
                <span className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-purple-400 opacity-60" />
                <span className="relative h-2.5 w-2.5 rounded-full border-2 border-gray-950 bg-purple-400" />
              </span>
            )}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-base font-bold text-white leading-none">
              StudyOS
            </p>
            <p className="mt-0.5 text-[11px] text-[rgba(255,255,255,0.55)]">
              {aiBusy ? "AI working in background…" : "Smart Learning Platform"}
            </p>
          </div>
        </button>

      </div>

      <div
        className="ml-auto flex flex-nowrap items-center gap-3 shrink-0"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        {/* Clock */}
        <LiveClock />

        {/* ── Study stats: streak / XP / today's task progress ── */}
        <button
          onClick={() => navigate("/gamification")}
          title={`${streak}-day study streak — open Achievements`}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#fb7185",
          }}
        >
          <Flame className="h-3.5 w-3.5" />
          {streak}d
        </button>
        <button
          onClick={() => navigate("/gamification")}
          title={`${xp} XP — open Achievements`}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#7dd3fc",
          }}
        >
          <Zap className="h-3.5 w-3.5" />
          {xp}
        </button>
        <button
          onClick={() => navigate("/tasks")}
          title={
            dueToday.length
              ? `${doneToday}/${dueToday.length} tasks done today (${todayPercent}%)`
              : `${completedTodayCount} task(s) completed today`
          }
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color:
              todayPercent === null
                ? "var(--color-text-secondary)"
                : todayPercent >= 100
                  ? "var(--color-success)"
                  : todayPercent >= 50
                    ? "#fbbf24"
                    : "#f87171",
          }}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {dueToday.length
            ? `${todayPercent}% (${doneToday}/${dueToday.length})`
            : `${completedTodayCount} done`}
        </button>

        {/* ── Search ── */}
        <div ref={searchRef} className="relative">
          <div
            className="hidden xl:flex items-center h-[46px] w-[360px] rounded-[16px] px-3 gap-3 bg-white/5 border border-white/10 transition duration-200 ease-out focus-within:border-cyan-400 focus-within:shadow-[0_0_24px_rgba(56,189,248,0.16)]"
            onClick={() => {
              setSearchOpen(true);
              setNotifOpen(false);
            }}
          >
            <Search size={18} className="text-[rgba(255,255,255,0.65)]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setSearchOpen(true);
                setNotifOpen(false);
              }}
              placeholder="Search pages..."
              className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-[rgba(255,255,255,0.45)]"
            />
          </div>

          <div className="xl:hidden">
            <Button
              variant="ghost"
              size="icon"
              title="Search (Ctrl+K)"
              onClick={() => {
                setSearchOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="h-11 w-11 rounded-full bg-white/5 transition-transform duration-200 ease-out hover:scale-105 hover:shadow-[0_0_18px_rgba(56,189,248,0.18)]"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Search size={15} />
            </Button>
          </div>

          {searchOpen && (
            <div style={{ ...panelStyle }}>
              {/* Search input */}
              <div
                style={{
                  padding: "12px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages..."
                    style={{
                      width: "100%",
                      paddingLeft: 32,
                      paddingRight: 12,
                      paddingTop: 8,
                      paddingBottom: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "var(--color-text-primary)",
                      outline: "none",
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                </div>
              </div>
              {/* Results */}
              <div
                style={{ maxHeight: 280, overflowY: "auto", padding: "6px" }}
              >
                {filtered.length === 0 ? (
                  <div style={{ padding: 12 }}>
                    <EmptyState
                      title="No results"
                      description="Try a different keyword or browse pages"
                      primaryLabel="Browse"
                      onPrimary={() => {
                        setSearchOpen(false);
                        navigate("/");
                      }}
                    />
                  </div>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "9px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        color: "var(--color-text-primary)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(124,106,247,0.12)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span
                        style={{ color: "var(--color-accent)", fontSize: 11 }}
                      >
                        →
                      </span>
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Notifications ── */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <Button
            variant="ghost"
            size="icon"
            title="Notifications"
            onClick={() => {
              setNotifOpen((o) => !o);
              setSearchOpen(false);
            }}
            className="relative h-11 w-11 rounded-full bg-white/5 transition-transform duration-200 ease-out hover:scale-105 hover:shadow-[0_0_18px_rgba(56,189,248,0.18)]"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Bell size={15} />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(248,113,113,0.55)]">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div style={{ ...panelStyle }}>
              {/* Header */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Notifications
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {notifications.length > 0 && (
                    <button
                      onClick={dismissAll}
                      style={{
                        fontSize: 11,
                        color: "var(--color-accent)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    style={{
                      color: "var(--color-text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "40px 16px", textAlign: "center" }}>
                    <Bell
                      size={28}
                      style={{
                        color: "var(--color-text-muted)",
                        margin: "0 auto 10px",
                      }}
                    />
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      No notifications
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        marginTop: 4,
                      }}
                    >
                      You're all caught up!
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        cursor: n.path ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (n.path) {
                          navigate(n.path);
                          setNotifOpen(false);
                        }
                      }}
                    >
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        {notifIcon[n.kind]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {n.title}
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginTop: 2,
                          }}
                        >
                          {n.body}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {relativeTime(n.at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissOne(n.id);
                        }}
                        style={{
                          color: "var(--color-text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          flexShrink: 0,
                          display: "flex",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 ml-2 transition duration-200 ease-out hover:scale-105"
            title={user.name}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #7c6af7, #38bdf8)",
                boxShadow: "0 0 20px rgba(56,189,248,0.24)",
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {user.name}
              </span>
              <span className="text-[12px] text-[rgba(255,255,255,0.55)] truncate">
                {user.email ?? "Student"}
              </span>
            </div>
          </button>
        )}
        {winApi && !usesNativeWindowFrame && (
          // Fixed to the viewport corner (not part of the header flow) so the
          // minimize / maximize / close buttons stay visible and clickable no
          // matter what the page or header layout is doing.
          <div
            className="fixed top-0 right-0 z-[80] flex items-center gap-1 px-2"
            style={{
              height:
                "max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 72px)",
              paddingTop:
                "max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 0px)",
              background: "rgba(11,15,26,0.92)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              WebkitAppRegion: "no-drag",
            } as any}
          >
            <button
              onClick={windowMin}
              title="Minimize"
              className="h-8 w-8 grid place-items-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={windowMax}
              title={maximized ? "Restore" : "Maximize"}
              className="h-8 w-8 grid place-items-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {maximized ? (
                <Copy className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={windowClose}
              title="Close"
              className="h-8 w-8 grid place-items-center rounded-lg text-gray-300 hover:bg-red-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* AI key rotation toast — shows on any page when keys auto-switch */}
      {aiToast && (
        <div
          className="fixed left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-purple-400/30 bg-[rgba(20,16,40,0.95)] px-4 py-2.5 text-xs font-medium text-purple-100 shadow-[0_18px_44px_rgba(0,0,0,0.4)]"
          style={{
            top: native
              ? "max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 84px)"
              : "84px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            maxWidth: "min(92vw, 520px)",
          }}
          onClick={() => setAiToast(null)}
          title="Click to dismiss"
        >
          <Sparkles size={13} className="shrink-0 text-purple-300" />
          <span className="truncate">{aiToast}</span>
        </div>
      )}
    </header>
  );
}
