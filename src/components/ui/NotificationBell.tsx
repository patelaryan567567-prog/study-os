import { useState } from "react";
import {
  Bell,
  BellDot,
  Check,
  Clock,
  BookOpen,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  icon: React.ReactNode;
  color: "primary" | "accent" | "emerald" | "rose" | "cyan" | "pink" | "violet";
  type?: "task" | "study" | "achievement" | "reminder" | "system";
}

const colorMap = {
  primary: {
    bg: "rgba(139, 92, 246, 0.1)",
    text: "#8b5cf6",
    border: "rgba(139, 92, 246, 0.2)",
    glow: "rgba(139, 92, 246, 0.3)",
  },
  accent: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#f59e0b",
    border: "rgba(245, 158, 11, 0.2)",
    glow: "rgba(245, 158, 11, 0.3)",
  },
  emerald: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#10b981",
    border: "rgba(16, 185, 129, 0.2)",
    glow: "rgba(16, 185, 129, 0.3)",
  },
  rose: {
    bg: "rgba(244, 63, 94, 0.1)",
    text: "#f43f5e",
    border: "rgba(244, 63, 94, 0.2)",
    glow: "rgba(244, 63, 94, 0.3)",
  },
  cyan: {
    bg: "rgba(6, 182, 212, 0.1)",
    text: "#06b6d4",
    border: "rgba(6, 182, 212, 0.2)",
    glow: "rgba(6, 182, 212, 0.3)",
  },
  pink: {
    bg: "rgba(236, 72, 153, 0.1)",
    text: "#ec4899",
    border: "rgba(236, 72, 153, 0.2)",
    glow: "rgba(236, 72, 153, 0.3)",
  },
  violet: {
    bg: "rgba(139, 92, 246, 0.1)",
    text: "#8b5cf6",
    border: "rgba(139, 92, 246, 0.2)",
    glow: "rgba(139, 92, 246, 0.3)",
  },
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Task Completed",
      description: 'You completed "Mathematics Assignment"',
      time: "2 min ago",
      read: false,
      icon: <Check className="h-4 w-4" />,
      color: "emerald",
      type: "task",
    },
    {
      id: "2",
      title: "Study Reminder",
      description: "Time for your daily study session",
      time: "1 hour ago",
      read: false,
      icon: <Clock className="h-4 w-4" />,
      color: "accent",
      type: "reminder",
    },
    {
      id: "3",
      title: "New Lecture Added",
      description: "Physics Chapter 5 is now available",
      time: "3 hours ago",
      read: true,
      icon: <BookOpen className="h-4 w-4" />,
      color: "primary",
      type: "study",
    },
    {
      id: "4",
      title: "Goal Achieved! 🎉",
      description: "You hit your weekly study goal!",
      time: "5 hours ago",
      read: true,
      icon: <Sparkles className="h-4 w-4" />,
      color: "pink",
      type: "achievement",
    },
    {
      id: "5",
      title: "Upcoming Exam",
      description: "Mathematics exam in 2 days",
      time: "1 day ago",
      read: true,
      icon: <AlertCircle className="h-4 w-4" />,
      color: "rose",
      type: "reminder",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-500/30 animate-pulse">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl bg-gray-950 shadow-2xl ring-1 ring-white/10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-primary-500/10 to-accent-500/10">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary-400" />
                  <h3 className="font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs text-primary-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-400 transition-colors hover:text-primary-300"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No notifications</p>
                    <p className="text-xs text-gray-500">
                      You're all caught up!
                    </p>
                  </div>
                ) : (
                  notifications.map((notification, index) => {
                    const colors = colorMap[notification.color];
                    const isUnread = !notification.read;

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => markAsRead(notification.id)}
                        className={cn(
                          "flex items-start gap-3 p-3 transition-all cursor-pointer border-b border-white/5 last:border-0",
                          isUnread && "bg-primary-500/5",
                          "hover:bg-white/5",
                        )}
                      >
                        <div
                          className="relative rounded-lg p-2 shrink-0"
                          style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {isUnread && (
                            <div
                              className="absolute inset-0 rounded-lg animate-pulse"
                              style={{ boxShadow: `0 0 20px ${colors.glow}` }}
                            />
                          )}
                          <span style={{ color: colors.text }}>
                            {notification.icon}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isUnread ? "text-white" : "text-gray-400",
                              )}
                            >
                              {notification.title}
                            </p>
                            {isUnread && (
                              <div
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ background: colors.text }}
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {notification.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500">
                              {notification.time}
                            </span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider"
                              style={{
                                background: colors.bg,
                                color: colors.text,
                              }}
                            >
                              {notification.type || "system"}
                            </span>
                          </div>
                        </div>

                        {!isUnread && (
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-600 shrink-0" />
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-white/5 p-2 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-500 transition-colors hover:text-gray-300"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
