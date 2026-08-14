import { describe, expect, it } from 'vitest';
import type { StudySession, UserProfile } from '@/services/firestoreService';
import {
  EMPTY_DASHBOARD_METRICS,
  calculateDashboardMetrics,
  formatStudyHours,
} from './dashboardMetrics';

function session(startedAt: Date, durationSeconds: number): StudySession {
  return {
    userId: 'user-1',
    type: 'custom',
    durationSeconds,
    startedAt: { toDate: () => startedAt },
  } as unknown as StudySession;
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    xp: 0,
    coins: 0,
    settings: {},
    ...overrides,
  } as UserProfile;
}

// Wednesday 2026-03-11; the surrounding week runs Mon 2026-03-09 .. Sun 2026-03-15.
const NOW = new Date(2026, 2, 11, 15, 30);

describe('calculateDashboardMetrics', () => {
  it('returns zeroed totals for an empty history', () => {
    const metrics = calculateDashboardMetrics([], null, NOW);

    expect(metrics).toEqual(EMPTY_DASHBOARD_METRICS);
  });

  it('sums today, this week and this month separately', () => {
    const metrics = calculateDashboardMetrics(
      [
        session(new Date(2026, 2, 11, 9), 1800),
        session(new Date(2026, 2, 11, 20), 900),
        session(new Date(2026, 2, 9, 8), 3600),
        session(new Date(2026, 2, 3, 8), 7200),
        session(new Date(2026, 1, 25, 8), 5400),
      ],
      null,
      NOW,
    );

    expect(metrics.todaySeconds).toBe(2700);
    expect(metrics.weekSeconds).toBe(6300);
    expect(metrics.monthSeconds).toBe(13500);
  });

  it('buckets the current week into Monday-first weekday hours', () => {
    const metrics = calculateDashboardMetrics(
      [
        session(new Date(2026, 2, 9, 8), 3600),
        session(new Date(2026, 2, 11, 8), 1800),
        session(new Date(2026, 2, 15, 8), 5400),
      ],
      null,
      NOW,
    );

    expect(metrics.weeklyLabels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(metrics.weeklyHours).toEqual([1, 0, 0.5, 0, 0, 0, 1.5]);
  });

  it('treats Sunday as the last day of the week that started on Monday', () => {
    const sunday = new Date(2026, 2, 15, 12);
    const metrics = calculateDashboardMetrics(
      [session(new Date(2026, 2, 9, 8), 3600), session(sunday, 1800)],
      null,
      sunday,
    );

    expect(metrics.weekSeconds).toBe(5400);
    expect(metrics.weeklyHours).toEqual([1, 0, 0, 0, 0, 0, 0.5]);
  });

  it('excludes sessions outside the current week from the weekly buckets', () => {
    const metrics = calculateDashboardMetrics(
      [session(new Date(2026, 2, 8, 8), 3600), session(new Date(2026, 2, 16, 8), 3600)],
      null,
      NOW,
    );

    expect(metrics.weekSeconds).toBe(0);
    expect(metrics.weeklyHours).toEqual(EMPTY_DASHBOARD_METRICS.weeklyHours);
  });

  it('counts consecutive study days back from today as the streak', () => {
    const metrics = calculateDashboardMetrics(
      [
        session(new Date(2026, 2, 11, 8), 600),
        session(new Date(2026, 2, 10, 8), 600),
        session(new Date(2026, 2, 9, 8), 600),
        session(new Date(2026, 2, 7, 8), 600),
      ],
      null,
      NOW,
    );

    expect(metrics.streakDays).toBe(3);
  });

  it('reports a zero streak when today has no session', () => {
    const metrics = calculateDashboardMetrics(
      [session(new Date(2026, 2, 10, 8), 600), session(new Date(2026, 2, 9, 8), 600)],
      null,
      NOW,
    );

    expect(metrics.streakDays).toBe(0);
  });

  it('ignores negative durations instead of subtracting them', () => {
    const metrics = calculateDashboardMetrics(
      [session(new Date(2026, 2, 11, 8), -3600), session(new Date(2026, 2, 11, 9), 1800)],
      null,
      NOW,
    );

    expect(metrics.todaySeconds).toBe(1800);
    expect(metrics.weekSeconds).toBe(1800);
  });

  it('takes xp and coins from the profile when present', () => {
    const metrics = calculateDashboardMetrics([], profile({ xp: 1250, coins: 42 }), NOW);

    expect(metrics.xp).toBe(1250);
    expect(metrics.coins).toBe(42);
  });
});

describe('formatStudyHours', () => {
  it.each([
    [0, '0m'],
    [59, '0m'],
    [600, '10m'],
    [3600, '1h'],
    [3660, '1h 1m'],
    [7845, '2h 10m'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatStudyHours(seconds as number)).toBe(expected);
  });
});
