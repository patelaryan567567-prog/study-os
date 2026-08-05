import { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  Maximize2,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui";
import { formatTime } from "@/utils";
import { useNavigate } from "react-router-dom";

interface TopbarProps {
  title: string;
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

const SAMPLE_NOTIFICATIONS = [
  {
    id: "1",
    type: "success" as const,
    title: "Study streak active!",
    body: "You have studied 3 days in a row.",
    time: "2m ago",
  },
  {
    id: "2",
    type: "warning" as const,
    title: "Backlog reminder",
    body: "You have 4 overdue tasks.",
    time: "1h ago",
  },
  {
    id: "3",
    type: "info" as const,
    title: "Weekly goal",
    body: "You are 60% toward your 12h weekly goal.",
    time: "3h ago",
  },
];

const notifIcon = {
  success: <CheckCircle size={14} style={{ color: "var(--color-success)" }} />,
  warning: (
    <AlertTriangle size={14} style={{ color: "var(--color-warning)" }} />
  ),
  info: <Clock size={14} style={{ color: "var(--color-info)" }} />,
};

export function Topbar({ title }: TopbarProps) {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  function toggleFullscreen() {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 100,
    background: "rgba(8, 11, 25, 0.95)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    boxShadow: "0 22px 54px rgba(0,0,0,0.35), 0 0 0 1px rgba(124,106,247,0.1)",
  };

  return (
    <header
      className="sticky top-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 shrink-0"
      style={{
        minHeight: "72px",
        background: "rgba(8, 11, 25, 0.78)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.22)",
        position: "sticky",
        zIndex: 60,
      }}
    >
      {/* Title */}
      <div className="min-w-0 flex-1">
        <h1
          className="text-[30px] font-extrabold tracking-tight truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-[rgba(255,255,255,0.55)] hidden md:block truncate">
          Stay focused and track your progress in one place.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* Clock */}
        <div
          className="mr-2 px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "var(--color-text-secondary)",
          }}
        >
          {formatTime(time)}
        </div>

        {/* ── Search ── */}
        <div ref={searchRef} className="relative">
          <div
            className="hidden md:flex items-center h-[46px] w-[360px] rounded-[16px] px-3 gap-3 bg-white/5 border border-white/10 transition duration-200 ease-out focus-within:border-cyan-400 focus-within:shadow-[0_0_24px_rgba(56,189,248,0.16)]"
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

          <div className="md:hidden">
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
            <div style={{ ...panelStyle, width: "360px", right: 0 }}>
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
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.55)] animate-pulse" />
            )}
          </Button>

          {notifOpen && (
            <div style={{ ...panelStyle, width: "360px" }}>
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
                      onClick={() => setNotifications([])}
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
                      }}
                    >
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        {notifIcon[n.type]}
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
                          {n.time}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((p) =>
                            p.filter((x) => x.id !== n.id),
                          )
                        }
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

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          title="Fullscreen"
          onClick={toggleFullscreen}
          className="h-11 w-11 rounded-full bg-white/5 transition-transform duration-200 ease-out hover:scale-105 hover:shadow-[0_0_18px_rgba(56,189,248,0.18)]"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <Maximize2 size={15} />
        </Button>

        {/* Profile */}
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 ml-2 rounded-[18px] px-3 py-1 transition duration-200 ease-out hover:scale-105 bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(56,189,248,0.08)]"
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
            <div className="hidden md:flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {user.name}
              </span>
              <span className="text-[12px] text-[rgba(255,255,255,0.55)] truncate">
                {user.email ?? "Student"}
              </span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
