import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Timer,
  CalendarDays,
  CheckSquare,
  PlayCircle,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  FileText,
  BarChart3,
  Trophy,
  Calendar,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  UserRound,
} from "lucide-react";
import { useAppStore } from "@/store";
import { cn } from "@/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
      {
        id: "analytics",
        label: "Analytics",
        icon: BarChart3,
        path: "/analytics",
      },
      { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
    ],
  },
  {
    label: "Study",
    items: [
      { id: "focus", label: "Focus Mode", icon: Timer, path: "/focus" },
      {
        id: "planner",
        label: "Study Planner",
        icon: CalendarDays,
        path: "/planner",
      },
      { id: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks" },
      {
        id: "lectures",
        label: "Lectures",
        icon: PlayCircle,
        path: "/lectures",
      },
      { id: "modules", label: "Modules", icon: BookOpen, path: "/modules" },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        id: "backlog",
        label: "Backlog",
        icon: AlertTriangle,
        path: "/backlog",
      },
      { id: "revision", label: "Revision", icon: RotateCcw, path: "/revision" },
      { id: "notes", label: "Notes", icon: FileText, path: "/notes" },
    ],
  },
  {
    label: "Personal",
    items: [
      {
        id: "gamification",
        label: "Achievements",
        icon: Trophy,
        path: "/gamification",
      },
      { id: "ai", label: "AI Assistant", icon: Bot, path: "/ai" },
      { id: "profile", label: "Profile", icon: UserRound, path: "/profile" },
      { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.aside
      layout
      animate={{ width: sidebarCollapsed ? 64 : 290 }}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
      className="flex flex-col h-full shrink-0 relative z-10"
      style={{
        background: "rgba(12, 14, 32, 0.75)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 60px rgba(88, 84, 255, 0.18)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-r-[32px] bg-white/5 backdrop-blur-xl md:hidden" />
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-[72px] shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #7c6af7, #38bdf8)",
            boxShadow: "0 0 18px rgba(124,106,247,0.35)",
          }}
        >
          <GraduationCap size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col min-w-0">
                <span
                  className="font-extrabold text-lg bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #8b5cf6, #38bdf8)",
                  }}
                >
                  StudyOS
                </span>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  Learning Platform
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group) => {
          return (
            <div key={group.label}>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="label-xs px-3 mb-2 text-[var(--color-text-muted)] uppercase tracking-[0.16em]"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-2.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "relative flex items-center gap-[14px] pl-[18px] pr-4 h-[52px] rounded-[16px] transition-all duration-200 w-full text-left group",
                        active
                          ? "text-white"
                          : "text-[var(--color-text-secondary)] hover:text-white",
                      )}
                      style={
                        active
                          ? {
                              background:
                                "linear-gradient(135deg, rgba(56,189,248,0.32), rgba(124,106,247,0.28))",
                              border: "1px solid rgba(96,165,250,0.22)",
                              boxShadow: "0 18px 30px rgba(56,189,248,0.18)",
                              transform: "scale(1.02)",
                            }
                          : {
                              background: "transparent",
                              border: "1px solid transparent",
                            }
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon
                        size={20}
                        className={cn(
                          "shrink-0 transition duration-200 ease-out group-hover:scale-105",
                          active
                            ? "text-white drop-shadow-[0_0_18px_rgba(56,189,248,0.65)]"
                            : "text-[var(--color-text-secondary)]",
                        )}
                      />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className="text-sm font-semibold whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div
          className="p-4 mt-4 mx-3 rounded-[20px]"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c6af7, #38bdf8)",
                boxShadow: "0 0 22px rgba(56,189,248,0.25)",
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="min-w-0"
                >
                  <p className="text-sm font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Level {user.level} • Premium
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-[30px] w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 z-20 hover:scale-110"
        style={{
          background: "rgba(13,14,30,0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#dbeafe",
          boxShadow: "0 12px 24px rgba(56,189,248,0.18)",
        }}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={11} />
        ) : (
          <ChevronLeft size={11} />
        )}
      </button>
    </motion.aside>
  );
}
