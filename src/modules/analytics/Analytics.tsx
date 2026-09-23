import { motion } from "framer-motion";
import {
  TrendingUp,
  Clock,
  BookOpen,
  Award,
  Download,
  Calendar,
  Activity,
  Zap,
  Flame,
  Coins,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  exportSessionsCSV,
  formatStudyHours,
  useAnalyticsData,
} from "./analyticsData";
import type { FocusSessionEntry } from "./analyticsData";

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return <p className="mt-1 text-sm text-gray-500">No prior data yet</p>;
  }
  const positive = change >= 0;
  return (
    <p
      className={`mt-1 text-sm ${
        positive ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(change)}% vs. previous
    </p>
  );
}

export function Analytics() {
  const d = useAnalyticsData();

  const stats = [
    {
      label: "Study Hours Today",
      value: formatStudyHours(d.todaySec),
      icon: Clock,
      color: "primary",
      sub: `${d.todaySessions} session${d.todaySessions === 1 ? "" : "s"} today`,
      change: <ChangeBadge change={d.todayChangePct} />,
    },
    {
      label: "This Week",
      value: formatStudyHours(d.weekSec),
      icon: TrendingUp,
      color: "accent",
      sub: `${d.weekSessions} sessions this week`,
      change: <ChangeBadge change={d.weekChangePct} />,
    },
    {
      label: "This Month",
      value: formatStudyHours(d.monthSec),
      icon: Calendar,
      color: "pink",
      sub: `${d.monthSessions} sessions this month`,
      change: <ChangeBadge change={d.monthChangePct} />,
    },
    {
      label: "Lecture Completion",
      value: `${d.lecturePercent}%`,
      icon: BookOpen,
      color: "emerald",
      sub: `${d.lectureDone} / ${d.lectureTotal} items done`,
      change: (
        <p className="mt-1 text-sm text-gray-500">
          {d.lectureTotal > 0 ? "across all modules" : "no lectures added yet"}
        </p>
      ),
    },
  ];

  const maxMode = Math.max(1, ...d.modeDistribution.map((m) => m.hours));
  const maxWeek = Math.max(1, ...d.weeklyData.map((day) => day.hours));

  const handleExport = () => {
    let history: FocusSessionEntry[] = [];
    try {
      const raw = localStorage.getItem("studyos_focus_v1");
      const parsed = raw ? JSON.parse(raw) : {};
      history = parsed.history || [];
    } catch {
      history = [];
    }
    exportSessionsCSV(history);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Background Glow */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 -right-20 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <span className="shimmer-text">Analytics</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base md:text-xl text-gray-400">
                Track your study patterns and progress
              </p>
            </div>
            <AnimatedButton
              variant="outline"
              onClick={handleExport}
              disabled={d.totalSessions === 0}
              title={
                d.totalSessions === 0 ? "No sessions to export yet" : undefined
              }
            >
              <Download className="h-4 w-4" />
              Export CSV
            </AnimatedButton>
          </div>
        </motion.div>

        {!d.hasData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <GlassCard className="p-8">
              <EmptyState
                title="No data to analyze yet"
                description="Complete a focus session, add lectures or unlock achievements to see your study analytics here."
              />
            </GlassCard>
          </motion.div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div
                className="absolute -inset-0.5 rounded-2xl blur-xl opacity-50"
                style={{
                  background: `radial-gradient(circle at center, var(--color-${stat.color}-500), transparent 70%)`,
                  animation: "glow-pulse 3s ease-in-out infinite",
                }}
              />
              <GlassCard className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{stat.sub}</p>
                    {stat.change}
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: `rgba(var(--glow-${stat.color}), 0.15)`,
                    }}
                  >
                    <stat.icon
                      className="h-6 w-6"
                      style={{ color: `var(--color-${stat.color}-500)` }}
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>


        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Mode Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl" />
            <GlassCard className="relative p-6">
              <h2 className="mb-6 text-2xl font-bold text-white">
                Mode Distribution
              </h2>
              <div className="space-y-4">
                {d.modeDistribution.map((mode, index) => (
                  <motion.div
                    key={mode.mode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-1"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        {mode.label}
                        {mode.count > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            {mode.count} session{mode.count === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-400">
                        {mode.hours}h
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max((mode.hours / maxMode) * 100, mode.hours > 0 ? 4 : 0)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: `var(--color-${mode.color}-500)`,
                          boxShadow: `0 0 20px var(--color-${mode.color}-500)`,
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Weekly Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-pink-500/20 to-cyan-500/20 blur-xl" />
            <GlassCard className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Weekly Activity
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Activity className="h-4 w-4" />
                  <span>This Week</span>
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 sm:gap-3">
                {d.weeklyData.map((day, index) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.6 }}
                    className="flex flex-1 flex-col items-center"
                  >
                    <div className="flex h-40 w-full items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max((day.hours / maxWeek) * 100, day.hours > 0 ? 6 : 2)}%` }}
                        transition={{ delay: index * 0.05, duration: 0.8 }}
                        className="relative w-full rounded-t-lg"
                        style={{
                          background:
                            day.hours > 0
                              ? "linear-gradient(to top, var(--color-primary-500), var(--color-accent-500))"
                              : "rgba(255,255,255,0.06)",
                          boxShadow: day.hours > 0 ? "0 0 20px rgba(139, 92, 246, 0.3)" : "none",
                        }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                          {day.hours > 0 ? `${day.hours}h` : ""}
                        </div>
                      </motion.div>
                    </div>
                    <div className="mt-2 text-center text-xs text-gray-500">
                      {day.day}
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>


        {/* Streak, Achievements & Rewards */}
        <div className="mt-6 grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-rose-500/20 blur-xl" />
              <GlassCard className="relative p-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {[
                    {
                      label: "Current Streak",
                      value: `${d.currentStreak} days`,
                      icon: Flame,
                      color: "rose",
                    },
                    {
                      label: "Best Streak",
                      value: `${d.bestStreak} days`,
                      icon: Zap,
                      color: "accent",
                    },
                    {
                      label: "Achievements",
                      value: `${d.achievementsUnlocked} / ${d.achievementsTotal}`,
                      icon: Award,
                      color: "emerald",
                    },
                    {
                      label: "XP Earned",
                      value: `${d.xp.toLocaleString()} XP`,
                      icon: Activity,
                      color: "primary",
                    },
                    {
                      label: "Coins",
                      value: d.coins.toLocaleString(),
                      icon: Coins,
                      color: "pink",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 rounded-xl bg-white/5 p-4"
                    >
                      <div
                        className="rounded-xl p-3"
                        style={{
                          background: `rgba(var(--glow-${item.color}), 0.15)`,
                        }}
                      >
                        <item.icon
                          className="h-6 w-6"
                          style={{ color: `var(--color-${item.color}-500)` }}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">{item.label}</p>
                        <p className="text-2xl font-bold text-white">
                          {item.value}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

