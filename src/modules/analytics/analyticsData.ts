import { useMemo } from "react";
import type { User } from "@/types";
import { useAppStore } from "@/store";
import { getLevelFromXP } from "@/utils";

export interface FocusSessionEntry {
  id?: string;
  mode?: string;
  start?: string;
  duration?: number;
}

export interface AnalyticsModeDatum {
  mode: string;
  label: string;
  hours: number;
  seconds: number;
  count: number;
  color: string;
}

export interface AnalyticsWeeklyDatum {
  day: string;
  hours: number;
  seconds: number;
}

export interface AnalyticsData {
  todaySec: number;
  weekSec: number;
  monthSec: number;
  todaySessions: number;
  weekSessions: number;
  monthSessions: number;
  todayChangePct: number | null;
  weekChangePct: number | null;
  monthChangePct: number | null;
  modeDistribution: AnalyticsModeDatum[];
  weeklyData: AnalyticsWeeklyDatum[];
  lecturePercent: number;
  lectureDone: number;
  lectureTotal: number;
  currentStreak: number;
  bestStreak: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  xp: number;
  coins: number;
  level: number;
  totalSeconds: number;
  totalSessions: number;
  hasData: boolean;
}

const MODE_COLORS: Record<string, string> = {
  pomodoro: "primary",
  countdown: "accent",
  stopwatch: "pink",
  alarm: "cyan",
};

const MODE_LABELS: Record<string, string> = {
  pomodoro: "Pomodoro",
  countdown: "Countdown",
  stopwatch: "Stopwatch",
  alarm: "Alarm",
};

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MS = 86_400_000;

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sessionStartMs(entry: FocusSessionEntry): number {
  if (!entry.start) return NaN;
  const t = new Date(entry.start).getTime();
  return Number.isNaN(t) ? NaN : t;
}

function sessionDurationSeconds(entry: FocusSessionEntry): number {
  if (typeof entry.duration === "number") return Math.max(0, entry.duration);
  // Legacy sessions without a stored duration default to a 25-minute pomodoro.
  return 25 * 60;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function computeStreaks(
  history: FocusSessionEntry[],
  today: Date,
): { current: number; best: number } {
  const dayKeys = new Set<string>();
  for (const entry of history) {
    const ts = sessionStartMs(entry);
    if (Number.isNaN(ts)) continue;
    dayKeys.add(localDateKey(new Date(ts)));
  }

  let current = 0;
  let cursor = today;
  if (!dayKeys.has(localDateKey(cursor))) cursor = addDays(cursor, -1);
  while (dayKeys.has(localDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...dayKeys].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const key of sorted) {
    const dayMs = new Date(`${key}T00:00:00`).getTime();
    if (previous !== null && dayMs - previous === DAY_MS) run += 1;
    else run = 1;
    if (run > best) best = run;
    previous = dayMs;
  }

  return { current, best };
}


function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function weekStart(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  return addDays(start, day === 0 ? -6 : 1 - day);
}

export function computeAnalyticsData(user: User | null): AnalyticsData {
  const now = new Date();
  const today = startOfDay(now);
  const todayStart = today.getTime();
  const tomorrow = addDays(today, 1).getTime();
  const yesterday = addDays(today, -1);
  const yesterdayStart = yesterday.getTime();

  const week = weekStart(now);
  const weekEnd = addDays(week, 7).getTime();
  const prevWeekStart = addDays(week, -7).getTime();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const focus = readLS<{ history?: FocusSessionEntry[] }>("studyos_focus_v1", {});
  const history = focus.history || [];

  let todaySec = 0;
  let yesterdaySec = 0;
  let weekSec = 0;
  let prevWeekSec = 0;
  let monthSec = 0;
  let prevMonthSec = 0;
  let todaySessions = 0;
  let weekSessions = 0;
  let monthSessions = 0;
  let totalSeconds = 0;
  let totalSessions = 0;

  const byMode = new Map<string, { seconds: number; count: number }>();

  for (const entry of history) {
    const ts = sessionStartMs(entry);
    if (Number.isNaN(ts)) continue;
    const seconds = sessionDurationSeconds(entry);
    const mode = entry.mode || "pomodoro";

    totalSeconds += seconds;
    totalSessions += 1;
    const current = byMode.get(mode);
    byMode.set(mode, {
      seconds: (current?.seconds || 0) + seconds,
      count: (current?.count || 0) + 1,
    });

    if (ts >= todayStart && ts < tomorrow) {
      todaySec += seconds;
      todaySessions += 1;
    } else if (ts >= yesterdayStart && ts < todayStart) {
      yesterdaySec += seconds;
    }
    if (ts >= week.getTime() && ts < weekEnd) {
      weekSec += seconds;
      weekSessions += 1;
    } else if (ts >= prevWeekStart && ts < week.getTime()) {
      prevWeekSec += seconds;
    }
    if (ts >= monthStart && ts < nextMonth) {
      monthSec += seconds;
      monthSessions += 1;
    } else if (ts >= prevMonthStart && ts < monthStart) {
      prevMonthSec += seconds;
    }
  }


  // Weekly bars for the current Mon–Sun window.
  const weeklyData: AnalyticsWeeklyDatum[] = WEEK_LABELS.map((day, index) => {
    const dayStart = addDays(week, index).getTime();
    const dayEnd = dayStart + DAY_MS;
    let seconds = 0;
    for (const entry of history) {
      const ts = sessionStartMs(entry);
      if (Number.isNaN(ts)) continue;
      if (ts >= dayStart && ts < dayEnd) {
        seconds += sessionDurationSeconds(entry);
      }
    }
    return { day, hours: round1(seconds / 3600), seconds };
  });

  // Mode distribution (show all modes so the section still renders).
  const distribution: AnalyticsModeDatum[] = [
    "pomodoro",
    "countdown",
    "stopwatch",
    "alarm",
  ].map((mode) => {
    const data = byMode.get(mode);
    return {
      mode,
      label: MODE_LABELS[mode] || mode,
      hours: round1((data?.seconds || 0) / 3600),
      seconds: data?.seconds || 0,
      count: data?.count || 0,
      color: MODE_COLORS[mode] || "primary",
    };
  });

  const { current: currentStreak, best: bestStreak } = computeStreaks(history, today);

  // Lecture / module completion.
  const chapters = readLS<
    { items?: { status?: string }[] }[]
  >("studyos_module_tracker_v1", []);
  const lectureChapters = readLS<
    { lectures?: { status?: string }[] }[]
  >("studyos_lecture_tracker_v1", []);
  let lectureTotal = 0;
  let lectureDone = 0;
  for (const chapter of chapters) {
    for (const item of chapter.items || []) {
      lectureTotal += 1;
      if (item.status === "completed") lectureDone += 1;
    }
  }
  for (const chapter of lectureChapters) {
    for (const lecture of chapter.lectures || []) {
      lectureTotal += 1;
      if (lecture.status === "completed") lectureDone += 1;
    }
  }
  const lecturePercent = lectureTotal ? Math.round((lectureDone / lectureTotal) * 100) : 0;

  // Gamification (achievements, fallback XP/coins).
  const gamification = readLS<{
    achievements?: { unlocked?: boolean }[];
    xp?: number;
    coins?: number;
  }>("studyos_gamification_v1", {});
  const achievementsTotal = gamification.achievements?.length || 0;
  const achievementsUnlocked = gamification.achievements
    ? gamification.achievements.filter((a) => a.unlocked).length
    : 0;

  const xp = user?.xp ?? gamification.xp ?? 0;
  const coins = user?.coins ?? gamification.coins ?? 0;
  const level = user?.level ?? getLevelFromXP(xp);


  return {
    todaySec,
    weekSec,
    monthSec,
    todaySessions,
    weekSessions,
    monthSessions,
    todayChangePct: percentChange(todaySec, yesterdaySec),
    weekChangePct: percentChange(weekSec, prevWeekSec),
    monthChangePct: percentChange(monthSec, prevMonthSec),
    modeDistribution: distribution,
    weeklyData,
    lecturePercent,
    lectureDone,
    lectureTotal,
    currentStreak,
    bestStreak,
    achievementsUnlocked,
    achievementsTotal,
    xp,
    coins,
    level,
    totalSeconds,
    totalSessions,
    hasData: history.length > 0 || lectureTotal > 0 || achievementsUnlocked > 0,
  };
}

/** Format a seconds value as a compact study-hours string, e.g. "3.5h" or "40m". */
export function formatStudyHours(seconds: number): string {
  if (seconds <= 0) return "0h";
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}


/** Download every focus session as a CSV file. */
export function exportSessionsCSV(history: FocusSessionEntry[]): void {
  const rows: (string | number)[][] = [
    ["Date", "Time", "Mode", "Duration (min)", "Duration (sec)"],
    ...history.map((entry) => {
      const start = entry.start ? new Date(entry.start) : null;
      return [
        start ? start.toLocaleDateString() : "",
        start ? start.toLocaleTimeString() : "",
        MODE_LABELS[entry.mode || ""] || entry.mode || "unknown",
        typeof entry.duration === "number"
          ? Math.round((entry.duration / 60) * 10) / 10
          : "",
        typeof entry.duration === "number" ? entry.duration : "",
      ];
    }),
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `studyos-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Reactive hook that recomputes the analytics when the signed-in user changes. */
export function useAnalyticsData(): AnalyticsData {
  const user = useAppStore((state) => state.user);
  return useMemo(() => computeAnalyticsData(user), [user]);
}

