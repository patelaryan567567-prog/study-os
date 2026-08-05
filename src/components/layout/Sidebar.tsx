import { motion } from "framer-motion";
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
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

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

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="fixed inset-y-0 left-0 z-50 w-72 bg-gray-900/95 backdrop-blur-xl border-r border-white/10"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-accent-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">StudyOS</h1>
            <p className="text-xs text-gray-400">Smart Learning Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.button
                key={item.path}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-500/20 text-white shadow-lg shadow-primary-500/10"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <button className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
