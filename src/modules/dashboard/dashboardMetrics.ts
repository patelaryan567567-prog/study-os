import type { StudySession, UserProfile } from '@/services/firestoreService';

export type DashboardMetrics = {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  weeklyHours: number[];
  weeklyLabels: string[];
  streakDays: number;
  xp: number;
  coins: number;
};

export const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  todaySeconds: 0,
  weekSeconds: 0,
  monthSeconds: 0,
  weeklyHours: [0, 0, 0, 0, 0, 0, 0],
  weeklyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  streakDays: 0,
  xp: 0,
  coins: 0,
};

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function weekStart(date: Date): Date {
  const day = date.getDay();
  return addDays(startOfDay(date), day === 0 ? -6 : 1 - day);
}

function sessionStart(session: StudySession): Date {
  return session.startedAt.toDate();
}

function durationSeconds(session: StudySession): number {
  return Math.max(0, session.durationSeconds);
}

export function calculateDashboardMetrics(
  sessions: StudySession[],
  profile: UserProfile | null,
  now = new Date(),
): DashboardMetrics {
  const today = startOfDay(now);
  const week = weekStart(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weeklySeconds = [0, 0, 0, 0, 0, 0, 0];
  const studyDays = new Set<string>();
  let todaySeconds = 0;
  let weekSeconds = 0;
  let monthSeconds = 0;

  for (const session of sessions) {
    const startedAt = sessionStart(session);
    const seconds = durationSeconds(session);
    const dayStart = startOfDay(startedAt);

    studyDays.add(dateKey(dayStart));

    if (dayStart.getTime() === today.getTime()) todaySeconds += seconds;
    if (dayStart >= week && dayStart < addDays(week, 7)) {
      weekSeconds += seconds;
      const weekdayIndex = Math.floor((dayStart.getTime() - week.getTime()) / 86_400_000);
      weeklySeconds[weekdayIndex] += seconds;
    }
    if (dayStart >= monthStart && dayStart < nextMonth) monthSeconds += seconds;
  }

  let streakDays = 0;
  let cursor = today;
  while (studyDays.has(dateKey(cursor))) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    todaySeconds,
    weekSeconds,
    monthSeconds,
    weeklyHours: weeklySeconds.map((seconds) => Math.round((seconds / 3600) * 10) / 10),
    weeklyLabels: EMPTY_DASHBOARD_METRICS.weeklyLabels,
    streakDays,
    xp: profile?.xp ?? 0,
    coins: profile?.coins ?? 0,
  };
}

export function formatStudyHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  return `${minutes}m`;
}
