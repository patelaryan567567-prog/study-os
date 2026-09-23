import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  CalendarDays,
  BookOpen,
  Layers,
  ListChecks,
  NotebookPen,
  Repeat,
  Target,
  Brain,
  Award,
  Settings,
  LogOut,
  Sparkles,
  ShieldBan,
  User,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { cn, getTextColor, getMutedTextColor } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { useAppStore } from "@/store";
import { signOut } from "@/services/auth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Navigation model grouped into labelled sections for a premium, organised menu.
 * Every route registered in src/routes/paths.ts is surfaced here so no module
 * is hidden from the user (Notes, Backlog, Revision, Calendar, AI, Profile were
 * previously missing from the sidebar).
 */
const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Clock, label: "Focus Mode", path: "/focus" },
    ],
  },
  {
    label: "Study",
    items: [
      { icon: Calendar, label: "Planner", path: "/planner" },
      { icon: Target, label: "Tasks", path: "/tasks" },
      { icon: BookOpen, label: "Lectures", path: "/lectures" },
      { icon: Layers, label: "Modules", path: "/modules" },
      { icon: ListChecks, label: "Backlog", path: "/backlog" },
      { icon: Repeat, label: "Revision", path: "/revision" },
      { icon: NotebookPen, label: "Notes", path: "/notes" },
      { icon: ShieldBan, label: "App Blocker", path: "/blocker" },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: Brain, label: "Analytics", path: "/analytics" },
      { icon: Award, label: "Achievements", path: "/gamification" },
      { icon: CalendarDays, label: "Calendar", path: "/calendar" },
    ],
  },
  {
    label: "AI & System",
    items: [
      { icon: Sparkles, label: "AI Assistant", path: "/ai" },
      { icon: Settings, label: "Settings", path: "/settings" },
      { icon: User, label: "Profile", path: "/profile" },
    ],
  },
] as const;

const STYLES_ID = "studyos-body-scroll-lock";

function setBodyScrollLock(locked: boolean) {
  if (locked) {
    // Use a class-based lock (not inline overflow) so the value always
    // restores cleanly even if another caller or a route transition interrupts
    // the useEffect cleanup. Inline `overflow = "unset"` / `"hidden"` was
    // leaking across unmounts and locking the body on mobile/desktop, which
    // left inputs un-focusable after the first interaction.
    if (!document.getElementById(STYLES_ID)) {
      const style = document.createElement("style");
      style.id = STYLES_ID;
      style.textContent = "html,body{overflow:hidden;}";
      document.head.appendChild(style);
    }
  } else {
    document.getElementById(STYLES_ID)?.remove();
  }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { user } = useAppStore();
  const isDark = resolvedTheme === "dark";

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    setBodyScrollLock(isOpen);
    return () => setBodyScrollLock(false);
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Demo mode has no Firebase session to sign out of — keep the UI stable.
    }
    navigate("/login");
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            // The frameless window's topbar declares a -webkit-app-region: drag
            // strip across the top; without no-drag here (and on the sidebar
            // below), clicks on the overlay/sidebar header would start a
            // window drag instead of reaching the close button.
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] shadow-2xl shadow-primary-500/5",
          isDark
            ? "bg-gray-950 border-r border-gray-800"
            : "bg-white border-r border-gray-200",
        )}
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="flex h-full flex-col">
          {/* Header with Logo & Close Button */}
          <div
            className={cn(
              "flex items-center justify-between px-6 py-6",
              isDark ? "border-b border-gray-800" : "border-b border-gray-200",
            )}
          >
            <div className="flex items-center gap-3">
              {/* Animated Logo */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-500 via-accent-500 to-pink-500 blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 backdrop-blur-sm border border-white/10 dark:border-white/10">
                  <Sparkles
                    className={cn(
                      "h-6 w-6 animate-pulse",
                      isDark ? "text-white" : "text-primary-600",
                    )}
                  />
                </div>
              </div>
              <div>
                <h1
                  className={cn(
                    "text-xl font-bold",
                    getTextColor(resolvedTheme),
                  )}
                >
                  StudyOS
                </h1>
                <p
                  className={cn(
                    "text-[10px] tracking-wider uppercase",
                    getMutedTextColor(resolvedTheme),
                  )}
                >
                  Smart Learning Platform
                </p>
              </div>
            </div>

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="rounded-xl bg-gray-100 dark:bg-white/5 p-2 text-gray-600 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-4 last:mb-0">
                {/* Section label */}
                <p
                  className={cn(
                    "px-4 mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    isDark ? "text-gray-600" : "text-gray-400",
                  )}
                >
                  {group.label}
                </p>

                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <motion.button
                      key={item.path}
                      whileHover={{ x: 6 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative group",
                        isActive
                          ? cn(
                              "bg-gradient-to-r from-primary-500/10 to-accent-500/5 shadow-lg shadow-primary-500/5 border",
                              isDark
                                ? "dark:from-primary-500/20 dark:to-accent-500/10 text-white border-primary-500/20"
                                : "text-primary-700 border-primary-500/20",
                            )
                          : cn(
                              "hover:bg-gray-100 hover:text-gray-900",
                              isDark
                                ? "text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                                : "text-gray-600",
                            ),
                      )}
                    >
                      {/* Active Indicator Glow */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-500 to-accent-500"
                        />
                      )}
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isActive
                            ? isDark
                              ? "text-primary-400"
                              : "text-primary-500"
                            : isDark
                              ? "text-gray-400 group-hover:text-gray-200"
                              : "text-gray-500 group-hover:text-gray-700",
                        )}
                      />
                      <span
                        className={cn(
                          "transition-colors",
                          isActive
                            ? isDark
                              ? "text-white"
                              : "text-primary-700"
                            : getTextColor(resolvedTheme),
                        )}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50 animate-pulse" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div
            className={cn(
              "px-3 py-4",
              isDark ? "border-t border-gray-800" : "border-t border-gray-200",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 p-[2px] shrink-0">
                  <div
                    className={cn(
                      "h-full w-full rounded-full flex items-center justify-center",
                      isDark ? "bg-gray-950" : "bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-bold",
                        isDark ? "text-white" : "text-primary-600",
                      )}
                    >
                      {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      getTextColor(resolvedTheme),
                    )}
                  >
                    {user?.name ?? "User"}
                  </p>
                  <p
                    className={cn(
                      "text-xs truncate",
                      getMutedTextColor(resolvedTheme),
                    )}
                  >
                    {user?.email ?? "student@studyos.com"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout}
                  title="Sign out"
                  className={cn(
                    "rounded-xl p-2 transition-colors",
                    isDark
                      ? "text-gray-300 hover:bg-white/10 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <LogOut className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
