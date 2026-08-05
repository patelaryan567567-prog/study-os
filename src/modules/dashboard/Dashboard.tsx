import { motion } from "framer-motion";
import {
  Clock,
  Target,
  BookOpen,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  BarChart3,
  Sparkles,
  Zap,
  Flame,
  Star,
  Rocket,
  Activity,
  Crown,
  Gem,
  Coins,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const stats = [
    {
      label: "Today's Study",
      value: "3.5h",
      icon: Clock,
      color: "primary",
      glow: "rgba(139, 92, 246, 0.4)",
      subtext: "2 sessions completed",
    },
    {
      label: "Weekly Hours",
      value: "12h",
      icon: TrendingUp,
      color: "accent",
      glow: "rgba(245, 158, 11, 0.4)",
      subtext: "? 15% from last week",
    },
    {
      label: "Monthly Hours",
      value: "48h",
      icon: Calendar,
      color: "pink",
      glow: "rgba(236, 72, 153, 0.4)",
      subtext: "On track for 60h",
    },
    {
      label: "Total XP",
      value: "2,450",
      icon: Award,
      color: "cyan",
      glow: "rgba(6, 182, 212, 0.4)",
      subtext: "Level 7 - 350 to next",
    },
    {
      label: "Coins",
      value: "1,280",
      icon: Coins,
      color: "emerald",
      glow: "rgba(16, 185, 129, 0.4)",
      subtext: "+50 today",
    },
    {
      label: "Study Streak",
      value: "12 days",
      icon: Flame,
      color: "rose",
      glow: "rgba(244, 63, 94, 0.4)",
      subtext: "?? Keep going!",
    },
  ];

  const recentActivity = [
    {
      title: "Completed Deep Focus Session",
      time: "2 hours ago",
      description: "Finished a 90-minute uninterrupted study block",
      icon: Zap,
      color: "primary",
    },
    {
      title: "Streak Extended",
      time: "Yesterday",
      description: "You kept your learning streak alive for another day",
      icon: Flame,
      color: "rose",
    },
    {
      title: "Reached Weekly High",
      time: "3 days ago",
      description: "Your weekly total hours hit a new personal best",
      icon: Rocket,
      color: "accent",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Animated Background Glow */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold">
                <span className="shimmer-text">Dashboard</span>
              </h1>
              <p className="mt-2 text-xl text-gray-400">
                Stay focused and track your progress in one place
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-500/20 px-4 py-2 text-sm text-primary-300 backdrop-blur-sm">
                ?? Today's Goal: 4h
              </div>
              <div className="rounded-full bg-accent-500/20 px-4 py-2 text-sm text-accent-300 backdrop-blur-sm">
                ? 85% Focus Score
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid with Glowing Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div
                className="absolute -inset-0.5 rounded-2xl blur-xl opacity-50"
                style={{
                  background: `radial-gradient(circle at center, ${stat.glow}, transparent 70%)`,
                  animation: "glow-pulse 3s ease-in-out infinite",
                }}
              />
              <GlassCard className="relative overflow-hidden p-6 transition-all hover:scale-[1.02]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{stat.subtext}</p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: `rgba(${stat.color === "primary" ? "139, 92, 246" : stat.color === "accent" ? "245, 158, 11" : stat.color === "pink" ? "236, 72, 153" : stat.color === "cyan" ? "6, 182, 212" : stat.color === "emerald" ? "16, 185, 129" : "244, 63, 94"}, 0.15)`,
                    }}
                  >
                    <stat.icon
                      className="h-6 w-6"
                      style={{
                        color:
                          stat.color === "primary"
                            ? "#8b5cf6"
                            : stat.color === "accent"
                              ? "#f59e0b"
                              : stat.color === "pink"
                                ? "#ec4899"
                                : stat.color === "cyan"
                                  ? "#06b6d4"
                                  : stat.color === "emerald"
                                    ? "#10b981"
                                    : "#f43f5e",
                      }}
                    />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Study Progress */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-pink-500/30 blur-xl" />
              <GlassCard className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Today's Progress
                    </h2>
                    <p className="text-sm text-gray-400">
                      How far you've come this week
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-primary-500/20 px-3 py-1">
                    <Sparkles className="h-4 w-4 text-primary-400" />
                    <span className="text-sm text-primary-300">
                      75% Complete
                    </span>
                  </div>
                </div>

                {/* Subjects Progress */}
                <div className="space-y-4">
                  {[
                    {
                      subject: "Mathematics",
                      progress: 75,
                      hours: 2.5,
                      color: "primary",
                    },
                    {
                      subject: "Physics",
                      progress: 45,
                      hours: 1.5,
                      color: "accent",
                    },
                    {
                      subject: "Chemistry",
                      progress: 30,
                      hours: 1,
                      color: "pink",
                    },
                    {
                      subject: "Biology",
                      progress: 60,
                      hours: 1.5,
                      color: "emerald",
                    },
                  ].map((subject, index) => (
                    <motion.div
                      key={subject.subject}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="group relative rounded-xl bg-white/5 p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              background: `var(--color-${subject.color}-500)`,
                              boxShadow: `0 0 20px var(--color-${subject.color}-500)`,
                            }}
                          />
                          <span className="text-lg font-semibold text-white">
                            {subject.subject}
                          </span>
                          <span className="text-sm text-gray-400">
                            {subject.hours}h
                          </span>
                        </div>
                        <span className="text-lg font-bold text-white">
                          {subject.progress}%
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800/50">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${subject.progress}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, var(--color-${subject.color}-500), var(--color-${subject.color}-400))`,
                            boxShadow: `0 0 30px var(--color-${subject.color}-500)`,
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-pink-500/20 blur-xl" />
              <GlassCard className="relative p-6">
                <h2 className="mb-6 text-2xl font-bold text-white">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="group relative rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="rounded-lg p-2"
                          style={{
                            background: `rgba(var(--glow-${activity.color}), 0.15)`,
                          }}
                        >
                          <activity.icon
                            className="h-5 w-5"
                            style={{
                              color: `var(--color-${activity.color}-500)`,
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {activity.description}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                      <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary-500/50">
                        <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-primary-500/30" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
