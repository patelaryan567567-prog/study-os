import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Clock,
  BookOpen,
  Award,
  Download,
  Calendar,
  Activity,
  PieChart,
  Zap,
  Flame,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientText } from '@/components/ui/GradientText';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { cn } from '@/lib/utils';

export function Analytics() {
  const stats = [
    { label: 'Study Hours Today', value: '3.5h', icon: Clock, color: 'primary', change: '+12%' },
    { label: 'This Week', value: '12h', icon: TrendingUp, color: 'accent', change: '+8%' },
    { label: 'This Month', value: '48h', icon: Calendar, color: 'pink', change: '+15%' },
    { label: 'Lecture Completion', value: '67%', icon: BookOpen, color: 'emerald', change: '+5%' },
  ];

  const modeDistribution = [
    { mode: 'Pomodoro', hours: 2.5, color: 'primary' },
    { mode: 'Countdown', hours: 1.8, color: 'accent' },
    { mode: 'Stopwatch', hours: 1.2, color: 'pink' },
    { mode: 'Alarm', hours: 0.5, color: 'cyan' },
  ];

  const weeklyData = [
    { day: 'Mon', hours: 2.5 },
    { day: 'Tue', hours: 3.0 },
    { day: 'Wed', hours: 1.8 },
    { day: 'Thu', hours: 4.0 },
    { day: 'Fri', hours: 2.2 },
    { day: 'Sat', hours: 3.5 },
    { day: 'Sun', hours: 1.5 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-8">
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
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold">
                <span className="shimmer-text">Analytics</span>
              </h1>
              <p className="mt-2 text-xl text-gray-400">
                Track your study patterns and progress
              </p>
            </div>
            <AnimatedButton variant="outline">
              <Download className="h-4 w-4" />
              Export CSV
            </AnimatedButton>
          </div>
        </motion.div>

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
                  animation: 'glow-pulse 3s ease-in-out infinite',
                }}
              />
              <GlassCard className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-emerald-400">{stat.change}</p>
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
              <h2 className="mb-6 text-2xl font-bold text-white">Mode Distribution</h2>
              <div className="space-y-4">
                {modeDistribution.map((mode, index) => (
                  <motion.div
                    key={mode.mode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-1"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{mode.mode}</span>
                      <span className="text-gray-400">{mode.hours}h</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(mode.hours / 8) * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
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

          {/* Activity Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-pink-500/20 to-cyan-500/20 blur-xl" />
            <GlassCard className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Weekly Activity</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Activity className="h-4 w-4" />
                  <span>This Week</span>
                </div>
              </div>
              <div className="flex h-48 items-end gap-2">
                {weeklyData.map((day, index) => (
                  <motion.div
                    key={day.day}
                    className="flex-1"
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.hours / 4) * 100}%` }}
                    transition={{ delay: index * 0.05, duration: 0.8 }}
                  >
                    <div
                      className="relative h-full w-full rounded-t-lg"
                      style={{
                        background: `linear-gradient(to top, var(--color-primary-500), var(--color-accent-500))`,
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                        {day.hours}h
                      </div>
                    </div>
                    <div className="mt-2 text-center text-xs text-gray-500">{day.day}</div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Streak & Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-rose-500/20 blur-xl" />
              <GlassCard className="relative p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {[
                    { label: 'Current Streak', value: '12 days', icon: Flame, color: 'rose' },
                    { label: 'Best Streak', value: '24 days', icon: Zap, color: 'accent' },
                    { label: 'Achievements', value: '15', icon: Award, color: 'emerald' },
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
                        <p className="text-2xl font-bold text-white">{item.value}</p>
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
