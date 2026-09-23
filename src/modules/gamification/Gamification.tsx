import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Zap,
  Coins,
  Flame,
  Lock,
  Gift,
  Medal,
  Check,
  Sparkles,
  Gem,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/Progress";
import { useAppStore } from "@/store";
import { useFocusClock } from "@/services/focusClock";
import { getLevelFromXP, getXPProgress } from "@/utils";
import { showToast } from "@/components/ui/Toast";
import { persistStore } from "@/services/appDataSync";

type Achievement = {
  id: string;
  title: string;
  desc?: string;
  unlocked: boolean;
  unlockedAt?: string;
};
type Challenge = {
  id: string;
  title: string;
  desc?: string;
  rewardXP: number;
  rewardCoins: number;
  target: number;
  completed?: boolean;
};

const STORAGE_KEY = "studyos_gamification_v1";
const todayKey = () => new Date().toISOString().slice(0, 10);

function defaultState() {
  return {
    xp: 0,
    level: 1,
    coins: 0,
    streak: 0,
    lastDaily: null as string | null,
    achievements: [
      {
        id: "ach_first_xp",
        title: "First XP",
        desc: "Earn your first XP",
        unlocked: false,
      },
      {
        id: "ach_week_streak",
        title: "7-day Streak",
        desc: "Maintain 7-day streak",
        unlocked: false,
      },
      { id: "ach_task_starter", title: "Task Starter", desc: "Complete your first task", unlocked: false },
      { id: "ach_focus_hero", title: "Focus Hero", desc: "Study for 25 minutes", unlocked: false },
      { id: "ach_task_champion", title: "Task Champion", desc: "Complete 10 tasks", unlocked: false },
      { id: "ach_note_taker", title: "Note Taker", desc: "Keep 10 notes", unlocked: false },
      { id: "ach_coin_collector", title: "Coin Collector", desc: "Hold 500 coins", unlocked: false },
      { id: "ach_level_5", title: "Scholar", desc: "Reach Level 5", unlocked: false },
      { id: "ach_streak_master", title: "Streak Master", desc: "Maintain a 30-day streak", unlocked: false },
      { id: "ach_marathon", title: "Marathoner", desc: "Study 5 hours in one day", unlocked: false },
    ] as Achievement[],
    challenges: [
      {
        id: "ch_complete_task",
        title: "One Thing Done",
        desc: "Complete one task today",
        rewardXP: 30,
        rewardCoins: 6,
        target: 1,
        completed: false,
      },
      { id: "ch_focus_25", title: "Focus Sprint", desc: "Study for 25 minutes today", rewardXP: 40, rewardCoins: 8, target: 25, completed: false },
      { id: "ch_plan_day", title: "Plan the Day", desc: "Set a task or event for today", rewardXP: 25, rewardCoins: 5, target: 1, completed: false },
      { id: "ch_note_today", title: "Capture a Note", desc: "Create or update a note today", rewardXP: 20, rewardCoins: 4, target: 1, completed: false },
      { id: "ch_three_tasks", title: "Hat-Trick", desc: "Complete 3 tasks today", rewardXP: 50, rewardCoins: 10, target: 3, completed: false },
      { id: "ch_focus_60", title: "Deep Work", desc: "Study for 60 minutes today", rewardXP: 70, rewardCoins: 14, target: 60, completed: false },
    ] as Challenge[],
    questDate: todayKey(),
    totalXp: 0,
    themesUnlocked: ["default"] as string[],
  };
}

/** The Dashboard and this page share ONE ledger: `useAppStore.user.xp/coins`.
 *  `state.xp/coins` below is only a legacy fallback for the (rare) case where
 *  no user profile exists yet. */

/** Reward tuning shared by daily bonus / challenges / level-ups. */
const DAILY_BONUS_XP = 30;
const DAILY_BONUS_COINS = 20;
const LEVEL_UP_COIN_BONUS = 50;

export function Gamification() {
  const tasks = useAppStore((s) => s.tasks);
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);
  const sessions = useAppStore((s) => s.sessions);
  const user = useAppStore((s) => s.user);
  const focusClock = useFocusClock();
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const saved = JSON.parse(raw);
      const defaults = defaultState();
      const isNewDay = saved.questDate !== todayKey();
      // Corrupted saves must never crash the page — fall back per-collection.
      const savedAchievements = Array.isArray(saved.achievements) ? saved.achievements : [];
      const savedChallenges = Array.isArray(saved.challenges) ? saved.challenges : [];
      // A streak only counts if it was kept alive: missing yesterday resets it.
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streakAlive = !saved.lastDaily || saved.lastDaily >= yesterday;
      return {
        ...defaults,
        ...saved,
        totalXp: saved.totalXp ?? saved.xp ?? 0,
        streak: streakAlive ? saved.streak ?? 0 : 0,
        questDate: todayKey(),
        achievements: [...savedAchievements, ...defaults.achievements.filter((d) => !savedAchievements.some((a: Achievement) => a.id === d.id))],
        challenges: isNewDay ? defaults.challenges : defaults.challenges.map((d) => ({ ...d, ...savedChallenges.find((c: Challenge) => c.id === d.id) })),
      };
    } catch {
      return defaultState();
    }
  });
  const [showConfetti, setShowConfetti] = useState(false);

  /** Single source of truth — identical to what the Dashboard displays. */
  const displayXp = Math.max(0, user?.xp ?? state.totalXp ?? state.xp ?? 0);
  const coinsBalance = Math.max(0, user?.coins ?? state.coins ?? 0);
  const progress = getXPProgress(displayXp);

  useEffect(() => {
    // Persist module-owned progress to localStorage + cloud, but always stamp
    // the shared XP/coins ledger with the live store values so every reader
    // stays in sync.
    persistStore(STORAGE_KEY, {
      ...state,
      xp: displayXp,
      totalXp: displayXp,
      level: getLevelFromXP(displayXp),
      coins: coinsBalance,
    });
  }, [state, displayXp, coinsBalance]);

  const studyMinutesToday = useMemo(() => {
    const today = todayKey();
    const storeMinutes = sessions
      .filter((session) => String(session.startTime || "").slice(0, 10) === today)
      .reduce((sum, session) => sum + Math.floor((session.duration || 0) / 60), 0);
    const focusMinutes = focusClock.sessions
      .filter((session) => String(session.startedAt || "").slice(0, 10) === today)
      .reduce((sum, session) => sum + Math.floor((session.duration || 0) / 60), 0);
    return storeMinutes + focusMinutes;
  }, [focusClock.sessions, sessions]);

  const completedTasksToday = useMemo(
    () => tasks.filter((task) => task.completedAt?.slice(0, 10) === todayKey()).length,
    [tasks],
  );
  const plannedToday = useMemo(
    () => tasks.filter((task) => task.dueDate === todayKey()).length + events.filter((event) => event.date === todayKey()).length,
    [events, tasks],
  );
  const notesToday = useMemo(
    () => notes.filter((note) => String(note.createdAt || "").slice(0, 10) === todayKey() || String(note.updatedAt || "").slice(0, 10) === todayKey()).length,
    [notes],
  );
  const completedTaskTotal = tasks.filter((task) => task.status === "completed").length;
  const weeklyStudy = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const day = date.toISOString().slice(0, 10);
      const storeMinutes = sessions
        .filter((session) => String(session.startTime || "").slice(0, 10) === day)
        .reduce((sum, session) => sum + Math.floor((session.duration || 0) / 60), 0);
      const focusMinutes = focusClock.sessions
        .filter((session) => String(session.startedAt || "").slice(0, 10) === day)
        .reduce((sum, session) => sum + Math.floor((session.duration || 0) / 60), 0);
      return { day, label: date.toLocaleDateString(undefined, { weekday: "narrow" }), minutes: storeMinutes + focusMinutes };
    });
  }, [focusClock.sessions, sessions]);
  const weeklyMinutes = weeklyStudy.reduce((sum, day) => sum + day.minutes, 0);
  const league = weeklyMinutes >= 300 ? "Gold" : weeklyMinutes >= 150 ? "Silver" : "Bronze";

  useEffect(() => {
    if (state.questDate === todayKey()) return;
    setState((previous) => ({ ...previous, questDate: todayKey(), challenges: defaultState().challenges }));
  }, [state.questDate]);

  useEffect(() => {
    const earned: Record<string, boolean> = {
      ach_first_xp: displayXp > 0,
      ach_week_streak: state.streak >= 7,
      ach_task_starter: completedTaskTotal >= 1,
      ach_focus_hero: studyMinutesToday >= 25,
      ach_task_champion: completedTaskTotal >= 10,
      ach_note_taker: notes.length >= 10,
      ach_coin_collector: coinsBalance >= 500,
      ach_level_5: progress.level >= 5,
      ach_streak_master: state.streak >= 30,
      ach_marathon: studyMinutesToday >= 300,
    };
    const newlyUnlocked = state.achievements.filter((a) => !a.unlocked && earned[a.id]);
    if (!newlyUnlocked.length) return;
    setState((previous) => ({
      ...previous,
      achievements: previous.achievements.map((achievement) =>
        earned[achievement.id] && !achievement.unlocked
          ? { ...achievement, unlocked: true, unlockedAt: new Date().toISOString() }
          : achievement,
      ),
    }));
    newlyUnlocked.forEach((achievement) =>
      showToast(`🏅 Achievement unlocked: ${achievement.title}`, "success"),
    );
  }, [completedTaskTotal, coinsBalance, displayXp, notes.length, progress.level, state.achievements, state.streak, studyMinutesToday]);

  /** All XP flows through the shared store ledger so this page and the
   *  Dashboard always display identical numbers. Level-ups grant a coin bonus
   *  and trigger confetti. */
  function addXP(amount: number) {
    if (!amount) return;
    if (!useAppStore.getState().user) {
      // No shared profile available — fall back to the local ledger only.
      setState((prev) => ({ ...prev, xp: prev.xp + amount, totalXp: prev.totalXp + amount }));
      return;
    }
    const beforeLevel = getLevelFromXP(useAppStore.getState().user?.xp ?? 0);
    useAppStore.getState().addXP(amount);
    const afterXp = useAppStore.getState().user?.xp ?? 0;
    if (getLevelFromXP(afterXp) > beforeLevel) {
      useAppStore.getState().addCoins(LEVEL_UP_COIN_BONUS);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2200);
    }
  }

  function claimDaily() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastDaily === today) return; // already claimed
    setState((p) => ({
      ...p,
      lastDaily: today,
      streak:
        p.lastDaily ===
        new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          ? p.streak + 1
          : 1,
    }));
    useAppStore.getState().addCoins(DAILY_BONUS_COINS);
    addXP(DAILY_BONUS_XP);
  }

  function questProgress(id: string) {
    if (id === "ch_complete_task") return completedTasksToday;
    if (id === "ch_focus_25" || id === "ch_focus_60") return studyMinutesToday;
    if (id === "ch_plan_day") return plannedToday;
    if (id === "ch_note_today") return notesToday;
    if (id === "ch_three_tasks") return completedTasksToday;
    return 0;
  }

  function claimChallenge(id: string) {
    const challenge = state.challenges.find((item) => item.id === id);
    if (!challenge || challenge.completed || questProgress(id) < challenge.target) return;
    setState((p) => ({
      ...p,
      challenges: p.challenges.map((c) =>
        c.id === id && !c.completed ? { ...c, completed: true } : c,
      ),
    }));
    addXP(challenge.rewardXP);
    useAppStore.getState().addCoins(challenge.rewardCoins);
  }

  function unlockTheme(name: string, cost = 100) {
    if (!user || coinsBalance < cost || state.themesUnlocked.includes(name)) return;
    useAppStore.getState().addCoins(-cost);
    setState((p) => ({
      ...p,
      themesUnlocked: [...p.themesUnlocked, name],
    }));
  }

  const claimedToday = state.lastDaily === new Date().toISOString().slice(0, 10);
  const unlockedCount = state.achievements.filter((a) => a.unlocked).length;
  const completedChallenges = state.challenges.filter((c) => c.completed).length;
  const themeOptions: {
    key: string;
    label: string;
    cost: number;
    gradient: string;
  }[] = [
    {
      key: "default",
      label: "Default",
      cost: 0,
      gradient: "from-gray-600/50 to-white/5",
    },
    {
      key: "midnight",
      label: "Midnight",
      cost: 100,
      gradient: "from-violet-600/60 to-sky-500/40",
    },
    {
      key: "sunrise",
      label: "Sunrise",
      cost: 150,
      gradient: "from-orange-500/60 to-rose-500/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-primary-500/20 to-emerald-500/20 blur-xl" />
        <GlassCard className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
                  Gamification
                </span>
              </div>
              <h3 className="mt-2 text-3xl font-bold sm:text-4xl">
                <span className="shimmer-text">Level {progress.level}</span>
              </h3>
              <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
                Earn XP, unlock achievements, keep your streak alive and collect
                coins for every focused study session.
              </p>
            </div>

            <div className="flex items-center gap-5 sm:gap-8">
              <div className="text-center">
                <div className="text-xs text-[var(--color-text-muted)]">
                  Coins
                </div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-3xl font-bold text-amber-300">
                  <Coins className="h-6 w-6" />
                  {coinsBalance}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--color-text-muted)]">XP</div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-3xl font-bold text-sky-300">
                  <Zap className="h-6 w-6" />
                  {displayXp}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--color-text-muted)]">
                  Streak
                </div>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-3xl font-bold text-rose-400">
                  <Flame className="h-6 w-6" />
                  {state.streak}
                </div>
              </div>
              <div
                className="rounded-full p-1"
                style={{
                  background: "rgba(var(--glow-primary), 0.15)",
                  boxShadow: "0 0 24px rgba(var(--glow-primary), 0.35)",
                }}
              >
                <CircularProgress
                  value={progress.percent}
                  size={82}
                  strokeWidth={8}
                  color="var(--color-accent-500)"
                >
                  <div className="text-center leading-tight">
                    <div className="text-base font-bold text-white">
                      {progress.percent}%
                    </div>
                    <div className="text-[9px] text-[var(--color-text-muted)]">
                      to Lv {progress.level + 1}
                    </div>
                  </div>
                </CircularProgress>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
              <span>
                Level {progress.level} → Level {progress.level + 1}
              </span>
              <span>
                {progress.current} / {progress.required} XP
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress.percent)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-accent-500 to-rose-500"
                style={{ boxShadow: "0 0 20px rgba(245,158,11,0.4)" }}
              />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Rewards & Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 blur-xl" />
          <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-400" />
              <h4 className="font-semibold text-amber-300">
                Daily Rewards & Streak
              </h4>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(var(--glow-rose), 0.12)" }}
              >
                <Flame
                  className="h-8 w-8"
                  style={{ color: "var(--color-rose-500)" }}
                />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {state.streak}
                  <span className="ml-1 text-base font-medium text-[var(--color-text-muted)]">
                    days
                  </span>
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Last claimed: {state.lastDaily || "never"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {claimedToday ? (
                <Button variant="success" disabled>
                  <Check className="h-4 w-4" /> Claimed Today
                </Button>
              ) : (
                <AnimatedButton variant="primary" onClick={claimDaily}>
                  <Gift className="h-4 w-4" /> Claim Daily
                </AnimatedButton>
              )}
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Claiming daily gives{" "}
              <span className="text-amber-300">+20 coins</span> and{" "}
              <span className="text-sky-300">+30 XP</span>.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-xl" />
          <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-emerald-400" />
                <h4 className="font-semibold text-emerald-300">Achievements</h4>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                {unlockedCount}/{state.achievements.length}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {state.achievements.map((a, index) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                    a.unlocked
                      ? "border border-emerald-500/25 bg-emerald-500/10"
                      : "border border-white/5 bg-white/[0.03]"
                  }`}
                >
                  <div
                    className="shrink-0 rounded-lg p-2"
                    style={{
                      background: a.unlocked
                        ? "rgba(var(--glow-emerald), 0.15)"
                        : "rgba(255,255,255,0.05)",
                      boxShadow: a.unlocked
                        ? "0 0 18px rgba(var(--glow-emerald), 0.35)"
                        : "none",
                    }}
                  >
                    {a.unlocked ? (
                      <Medal className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Lock className="h-5 w-5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium ${a.unlocked ? "text-white" : "text-[var(--color-text-muted)]"}`}
                    >
                      {a.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {a.unlocked && a.unlockedAt
                        ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}`
                        : a.desc}
                    </div>
                  </div>
                  {a.unlocked && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary-500/20 to-pink-500/20 blur-xl" />
          <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h4 className="font-semibold text-amber-300">
                  Challenges & Rewards
                </h4>
              </div>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                {completedChallenges}/{state.challenges.length} done
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {state.challenges.map((c, index) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`rounded-xl border p-4 transition-all ${
                    c.completed
                      ? "border-emerald-500/25 bg-emerald-500/10"
                      : "border-white/5 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`font-medium ${c.completed ? "text-emerald-300" : "text-white"}`}
                      >
                        {c.title}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                        {c.desc}
                      </div>
                    </div>
                    <AnimatedButton
                      size="sm"
                      variant={c.completed ? "ghost" : questProgress(c.id) >= c.target ? "primary" : "secondary"}
                      onClick={() => claimChallenge(c.id)}
                      disabled={c.completed || questProgress(c.id) < c.target}
                    >
                      {c.completed ? (
                        <>
                          <Check className="h-4 w-4" /> Done
                        </>
                      ) : questProgress(c.id) >= c.target ? (
                        "Claim reward"
                      ) : (
                        `${Math.min(questProgress(c.id), c.target)}/${c.target}${c.id === "ch_focus_25" || c.id === "ch_focus_60" ? " min" : ""}`
                      )}
                    </AnimatedButton>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
                      style={{ width: `${Math.min(100, (questProgress(c.id) / c.target) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300">
                      <Zap className="h-3.5 w-3.5" /> +{c.rewardXP} XP
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                      <Coins className="h-3.5 w-3.5" /> +{c.rewardCoins} coins
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Themes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 blur-xl" />
          <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-violet-400" />
              <h4 className="font-semibold text-violet-300">Unlock Themes</h4>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {themeOptions.map((t) => {
                const owned = state.themesUnlocked.includes(t.key);
                const canAfford = coinsBalance >= t.cost;
                return (
                  <button
                    key={t.key}
                    disabled={owned}
                    onClick={() => unlockTheme(t.key, t.cost)}
                    className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                      owned
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-white/10 bg-white/[0.04] hover:border-white/25"
                    } ${
                      owned
                        ? "cursor-default"
                        : canAfford
                          ? "cursor-pointer hover:scale-[1.03]"
                          : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-30 transition-opacity group-hover:opacity-50`}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {t.label}
                        </span>
                        {owned ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Lock className="h-4 w-4 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                        {owned ? (
                          <span className="text-emerald-300">Unlocked</span>
                        ) : t.cost === 0 ? (
                          "Free"
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <Coins className="h-3.5 w-3.5" /> {t.cost}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-[var(--color-text-muted)]">
              Unlocked: {state.themesUnlocked.join(", ")}
            </div>
          </div>
        </motion.div>

        {/* Weekly study board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 blur-xl" />
          <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-sky-300" />
              <h4 className="font-semibold text-sky-200">Weekly Study Board</h4>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold text-white">{weeklyMinutes} <span className="text-base font-medium text-[var(--color-text-muted)]">min</span></p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Your last 7 days of recorded study</p>
              </div>
              <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                {league} league
              </span>
            </div>
            <div className="mt-5 flex h-24 items-end justify-between gap-2">
              {weeklyStudy.map((day) => (
                <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-16 w-full items-end rounded-md bg-white/[0.035]">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-sky-500 to-emerald-400"
                      style={{ height: `${Math.max(4, Math.min(100, (day.minutes / 90) * 100))}%` }}
                      title={`${day.minutes} minutes`}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{day.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">Reach 150 minutes for Silver and 300 minutes for Gold this week.</p>
          </div>
        </motion.div>
      </div>

      {showConfetti && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2">
          <motion.div
            initial={{ scale: 0, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-500/20 to-pink-500/20 px-8 py-5 text-center backdrop-blur-xl"
            style={{ boxShadow: "0 0 40px rgba(245,158,11,0.35)" }}
          >
            <div className="text-5xl">🎉</div>
            <div className="mt-2 text-xl font-bold shimmer-text">Level Up!</div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Gamification;
