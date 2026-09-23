import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  Zap,
  Flame,
  Rocket,
  Coins,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowingText } from "@/components/ui/GlowingText";
import { useAppStore } from "@/store";
import { getLevelFromXP } from "@/utils";

/* ------------------------------ data helpers ------------------------------ */

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatHours(seconds: number) {
  if (seconds <= 0) return "0h";
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

/** Local-time YYYY-MM-DD key. toISOString() buckets by UTC date, which breaks
 *  day-based streaks for users in any non-UTC timezone. */
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Real dashboard data from the user's stores — no demo values. */
function useDashboardData() {
  const { user, sessions: storeSessions } = useAppStore();

  // The dashboard aggregates localStorage modules (focus clock sessions,
  // gamification ledger) that change outside the React store, so refresh
  // lightly on data-change events — the same pattern the Topbar streak chip
  // uses — instead of staying frozen until the next store update.
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setDataVersion((v) => v + 1);
    const t = setInterval(refresh, 30_000);
    window.addEventListener("storage", refresh);
    window.addEventListener("studyos-data-changed", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("studyos-data-changed", refresh);
    };
  }, []);

  return useMemo(() => {
    // dataVersion forces a recompute when external modules change (effect above).
    void dataVersion;
    // Unified session feed — merge EVERY source completed sessions land in:
    //  • studyos_focus_clock_v2.sessions (the live focus clock — primary)
    //  • studyos_focus_v1.history        (legacy focus-module store)
    //  • the app store's sessions        (profile-synced sessions)
    // Reading only the legacy key here is what made the streak (and the study
    // totals) always show 0.
    const rawFocus = readLS<{ history?: any[] }>("studyos_focus_v1", {});
    const rawClock = readLS<{ sessions?: any[] }>("studyos_focus_clock_v2", {});
    const seenMinutes = new Set<number>();
    const history = [
      ...(rawClock.sessions || []).map((e: any) => ({
        start: e?.startedAt as string,
        duration: typeof e?.duration === "number" ? e.duration : undefined,
        mode: e?.mode as string | undefined,
      })),
      ...(rawFocus.history || []).map((e: any) => ({
        start: e?.start as string,
        duration: typeof e?.duration === "number" ? e.duration : undefined,
        mode: e?.mode as string | undefined,
      })),
      ...storeSessions.map((e) => ({
        start: e.startTime,
        duration: e.duration,
        mode: e.type,
      })),
    ]
      .filter((e) => e.start && !Number.isNaN(new Date(e.start).getTime()))
      // minute-level dedupe so a session logged in two stores counts once
      .filter((e) => {
        const key = Math.round(new Date(e.start).getTime() / 60_000);
        if (seenMinutes.has(key)) return false;
        seenMinutes.add(key);
        return true;
      })
      .sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
      );
    const now = Date.now();
    const dayMs = 86400000;
    const durSec = (e: any) =>
      typeof e.duration === "number" ? e.duration : 25 * 60; // pomodoro default
    const sessionsIn = (ms: number) =>
      history.filter((e) => e.start && now - new Date(e.start).getTime() <= ms);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySec = history
      .filter((e) => e.start && new Date(e.start) >= todayStart)
      .reduce((a, e) => a + durSec(e), 0);
    const weekSec = sessionsIn(7 * dayMs).reduce((a, e) => a + durSec(e), 0);
    const monthSec = sessionsIn(30 * dayMs).reduce((a, e) => a + durSec(e), 0);
    const todayCount = history.filter(
      (e) => e.start && new Date(e.start) >= todayStart,
    ).length;

    // module tracker → subject progress
    type Chapter = { id: string; name: string; items: { status: string }[] };
    const chapters = readLS<Chapter[]>("studyos_module_tracker_v1", []);
    const subjects = chapters
      .map((c) => {
        const total = c.items.length;
        const done = c.items.filter((i) => i.status === "completed").length;
        return {
          subject: c.name,
          progress: total ? Math.round((done / total) * 100) : 0,
          done,
          total,
        };
      })
      .filter((s) => s.total > 0);
    const moduleTotal = chapters.reduce((a, c) => a + c.items.length, 0);
    const moduleDone = chapters.reduce(
      (a, c) => a + c.items.filter((i) => i.status === "completed").length,
      0,
    );
    const modulePercent = moduleTotal
      ? Math.round((moduleDone / moduleTotal) * 100)
      : 0;

    // backlog + notes
    type BacklogItem = { status: string };
    const backlog = readLS<BacklogItem[]>("studyos_backlog_v1", []);
    const backlogPending = backlog.filter((b) => b.status === "pending").length;
    const backlogDone = backlog.filter((b) => b.status === "completed").length;
    const notes = readLS<{ notes?: any[] }>("studyos_notes_v1", {}).notes || [];

    // real recent activity: focus sessions, note edits, AI chats
    const activity: {
      title: string;
      time: string;
      description: string;
      icon: any;
      color: string;
      ts: number;
    }[] = [];
    for (const e of history.slice(0, 10)) {
      if (!e.start) continue;
      activity.push({
        title: `Completed ${e.mode === "stopwatch" ? "Stopwatch" : "Focus"} Session`,
        time: new Date(e.start).toLocaleString(),
        description: `Studied for ${formatHours(durSec(e))}`,
        icon: Zap,
        color: "primary",
        ts: new Date(e.start).getTime(),
      });
    }
    for (const n of notes.slice(0, 5)) {
      const ts = new Date(n.updatedAt || n.createdAt).getTime();
      if (Number.isNaN(ts)) continue;
      activity.push({
        title: "Note Updated",
        time: new Date(ts).toLocaleString(),
        description: n.title || "Untitled note",
        icon: Sparkles,
        color: "accent",
        ts,
      });
    }
    activity.sort((a, b) => b.ts - a.ts);

    // streak: consecutive LOCAL study days with at least one session
    const days = new Set(history.map((e) => localDayKey(new Date(e.start))));
    let sessionStreak = 0;
    const cursor = new Date();
    // allow today missing — start from yesterday
    if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(localDayKey(cursor))) {
      sessionStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Gamification ledger streak — the exact number the Topbar chip and the
    // Achievements page display (kept-alive rule identical to Achievements).
    // Take the max so the Dashboard can never disagree with them.
    let gamificationStreak = 0;
    try {
      const saved = JSON.parse(
        localStorage.getItem("studyos_gamification_v1") || "{}",
      );
      const savedStreak = Math.max(0, Number(saved?.streak) || 0);
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const alive = !saved?.lastDaily || saved.lastDaily >= yesterday;
      gamificationStreak = alive ? savedStreak : 0;
    } catch {
      gamificationStreak = 0;
    }
    const streak = Math.max(
      sessionStreak,
      gamificationStreak,
      user?.streak || 0,
    );

    const level = getLevelFromXP(user?.xp || 0);

    return {
      todaySec,
      todayCount,
      weekSec,
      monthSec,
      subjects,
      modulePercent,
      backlogPending,
      backlogDone,
      notesCount: notes.length,
      activity: activity.slice(0, 5),
      streak: Math.max(streak, user?.streak || 0),
      xp: user?.xp || 0,
      coins: user?.coins || 0,
      level,
      hasData: history.length > 0 || chapters.length > 0 || notes.length > 0,
    };
  }, [user, storeSessions, dataVersion]);
}

/* ------------------------------ component ------------------------------ */

const SUBJECT_COLORS = ["primary", "accent", "pink", "emerald", "cyan", "rose"];

export function Dashboard() {
  const d = useDashboardData();

  // Daily goal (hours) — persisted on this device, editable from the header.
  const [goalHours, setGoalHours] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("studyos_daily_goal_hours_v1");
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 4;
    } catch {
      return 4;
    }
  });
  const [goalEditing, setGoalEditing] = useState(false);
  const goalPct = Math.min(
    100,
    Math.round((d.todaySec / (goalHours * 3600)) * 100) || 0,
  );

  const saveGoal = (hours: number) => {
    const h =
      Number.isFinite(hours) && hours > 0
        ? Math.max(1, Math.min(16, hours))
        : 4;
    setGoalHours(h);
    try {
      localStorage.setItem("studyos_daily_goal_hours_v1", String(h));
    } catch {}
  };

  const stats = [
    {
      label: "Today's Study",
      value: formatHours(d.todaySec),
      icon: Clock,
      color: "primary",
      glow: "rgba(139, 92, 246, 0.4)",
      subtext: `${d.todayCount} sessions completed`,
    },
    {
      label: "Weekly Hours",
      value: formatHours(d.weekSec),
      icon: TrendingUp,
      color: "accent",
      glow: "rgba(245, 158, 11, 0.4)",
      subtext: `${d.backlogPending} backlog items pending`,
    },
    {
      label: "Modules Done",
      value: `${d.modulePercent}%`,
      icon: Calendar,
      color: "pink",
      glow: "rgba(236, 72, 153, 0.4)",
      subtext: `${d.backlogDone} items completed`,
    },
    {
      label: "Total XP",
      value: d.xp.toLocaleString(),
      icon: Award,
      color: "cyan",
      glow: "rgba(6, 182, 212, 0.4)",
      subtext: `Level ${d.level}`,
    },
    {
      label: "Coins",
      value: d.coins.toLocaleString(),
      icon: Coins,
      color: "emerald",
      glow: "rgba(16, 185, 129, 0.4)",
      subtext: `${d.notesCount} notes`,
    },
    {
      label: "Study Streak",
      value: `${d.streak} days`,
      icon: Flame,
      color: "rose",
      glow: "rgba(244, 63, 94, 0.4)",
      subtext: d.streak > 0 ? "Keep going!" : "Start today!",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-4 sm:p-6 md:p-8">
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
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <GlowingText variant="primary">Dashboard</GlowingText>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base md:text-xl text-gray-400">
                Stay focused and track your progress in one place
              </p>
            </div>
            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={() => setGoalEditing((v) => !v)}
                className="rounded-full bg-primary-500/20 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-primary-300 backdrop-blur-sm transition-colors hover:bg-primary-500/30 text-center"
                title="Change today's goal (hours)"
              >
                Today's Goal: {goalHours}h
              </button>
              {goalEditing && (
                <div className="absolute right-0 top-full mt-2 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-gray-900 p-2 shadow-2xl">
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={goalHours}
                    onChange={(e) => setGoalHours(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveGoal(goalHours);
                        setGoalEditing(false);
                      }
                    }}
                    className="w-16 rounded-lg bg-white/10 px-2 py-1 text-sm text-white focus:outline-none"
                  />
                  <span className="text-xs text-gray-400">h/day</span>
                  <button
                    onClick={() => {
                      saveGoal(goalHours);
                      setGoalEditing(false);
                    }}
                    className="rounded-lg bg-primary-500 px-3 py-1 text-xs font-medium text-white"
                  >
                    Set
                  </button>
                </div>
              )}
              <div className="rounded-full bg-accent-500/20 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-accent-300 backdrop-blur-sm">
                {goalPct}% Focus Score
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid with Glowing Cards */}
        <div className="mb-6 sm:mb-8 grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <GlassCard className="relative overflow-hidden p-3 sm:p-4 md:p-6 transition-all hover:scale-[1.02]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-bold text-white break-words">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 sm:mt-1 text-xs text-gray-500 line-clamp-2">
                      {stat.subtext}
                    </p>
                  </div>
                  <div
                    className="rounded-lg sm:rounded-xl p-2 sm:p-3 flex-shrink-0"
                    style={{
                      background: `rgba(${stat.color === "primary" ? "139, 92, 246" : stat.color === "accent" ? "245, 158, 11" : stat.color === "pink" ? "236, 72, 153" : stat.color === "cyan" ? "6, 182, 212" : stat.color === "emerald" ? "16, 185, 129" : "244, 63, 94"}, 0.15)`,
                    }}
                  >
                    <stat.icon
                      className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
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
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Study Progress */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-pink-500/30 blur-xl" />
              <GlassCard className="relative p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      Today's Progress
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      How far you've come this week
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-primary-500/20 px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-primary-300">
                      {goalPct}% Complete
                    </span>
                  </div>
                </div>

                {/* Subjects Progress — from Module Tracker */}
                <div className="space-y-4">
                  {d.subjects.length === 0 && (
                    <p className="text-sm text-gray-500 py-4">
                      Add chapters in the Modules tracker to see subject
                      progress here.
                    </p>
                  )}
                  {d.subjects.slice(0, 6).map((subject, index) => {
                    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                    return (
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
                                background: `var(--color-${color}-500)`,
                                boxShadow: `0 0 20px var(--color-${color}-500)`,
                              }}
                            />
                            <span className="text-lg font-semibold text-white">
                              {subject.subject}
                            </span>
                            <span className="text-sm text-gray-400">
                              {subject.done}/{subject.total} items
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
                              background: `linear-gradient(90deg, var(--color-${color}-500), var(--color-${color}-400))`,
                              boxShadow: `0 0 30px var(--color-${color}-500)`,
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
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
                  {d.activity.length === 0 && (
                    <div className="text-center py-6">
                      <Rocket className="h-8 w-8 mx-auto text-gray-500" />
                      <p className="text-sm text-gray-500 mt-2">
                        No activity yet — complete a focus session or write a
                        note!
                      </p>
                    </div>
                  )}
                  {d.activity.map((activity, index) => (
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
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-gray-400 truncate">
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
