import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SearchBar } from "@/components/ui/SearchBar";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { FullscreenToggle } from "@/components/ui/FullscreenToggle";
import { Menu, Sparkles, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl bg-gray-100 dark:bg-white/5 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </motion.button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 blur opacity-50" />
                <div className="relative rounded-lg bg-gray-950 dark:bg-gray-950 p-1.5">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                StudyOS
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SearchBar className="lg:hidden" />
            <NotificationBell />
            <FullscreenToggle />
            <button
              onClick={toggleTheme}
              className="rounded-xl bg-gray-100 dark:bg-white/5 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            >
              {getThemeIcon()}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <main className="lg:ml-[280px] min-h-screen pt-16 lg:pt-0">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 blur opacity-50" />
              <div className="relative rounded-lg bg-gray-950 dark:bg-gray-950 p-1.5">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                StudyOS
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Smart Learning Platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchBar />
            <NotificationBell />
            <FullscreenToggle />
            <button
              onClick={toggleTheme}
              className="rounded-xl bg-gray-100 dark:bg-white/5 p-2 text-gray-600 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-white/10"
            >
              {getThemeIcon()}
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
