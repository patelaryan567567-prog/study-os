import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  BookOpen,
  FileText,
  Target,
  Brain,
  Award,
  Settings,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  cn,
  getTextColor,
  getMutedTextColor,
  getBorderColor,
} from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/context/ThemeContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Clock, label: "Focus", path: "/focus" },
  { icon: Calendar, label: "Planner", path: "/planner" },
  { icon: Target, label: "Tasks", path: "/tasks" },
  { icon: BookOpen, label: "Lectures", path: "/lectures" },
  { icon: FileText, label: "Modules", path: "/modules" },
  { icon: Brain, label: "Analytics", path: "/analytics" },
  { icon: Award, label: "Achievements", path: "/achievements" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();
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
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const toggleTheme = () => {
    setTheme(
      theme === "dark" ? "light" : theme === "light" ? "system" : "dark",
    );
  };

  const getThemeIcon = () => {
    if (theme === "dark") return <Sun className="h-5 w-5" />;
    if (theme === "light") return <Moon className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
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
            {navItems.map((item) => {
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
          </nav>

          {/* Footer */}
          <div
            className={cn(
              "px-3 py-4",
              isDark ? "border-t border-gray-800" : "border-t border-gray-200",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 p-[2px]">
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
                      U
                    </span>
                  </div>
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      getTextColor(resolvedTheme),
                    )}
                  >
                    User
                  </p>
                  <p
                    className={cn("text-xs", getMutedTextColor(resolvedTheme))}
                  >
                    student@studyos.com
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleTheme}
                  className={cn(
                    "rounded-xl p-2 transition-colors",
                    isDark
                      ? "text-gray-300 hover:bg-white/10 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  {getThemeIcon()}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
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
