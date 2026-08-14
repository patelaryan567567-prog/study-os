import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MOTIVATIONAL_QUOTES,
  calculateXPForLevel,
  cn,
  formatDate,
  formatTime,
  generateId,
  getDaysBetween,
  getGreeting,
  getLevelFromXP,
  getProgressColor,
  getRandomQuote,
  getXPProgress,
  isToday,
} from '@/utils';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('cn', () => {
  it('joins conditional class names and drops falsy values', () => {
    const disabled = false;
    expect(cn('a', disabled && 'b', undefined, 'c')).toBe('a c');
  });

  it('lets later tailwind classes win over conflicting earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm text-gray-100', 'text-gray-900')).toBe('text-sm text-gray-900');
  });
});

describe('formatDate', () => {
  it('formats an ISO string', () => {
    expect(formatDate('2026-03-09T12:00:00.000Z')).toBe('Mar 9, 2026');
  });

  it('formats a Date instance', () => {
    expect(formatDate(new Date(Date.UTC(2025, 11, 31, 12)))).toBe('Dec 31, 2025');
  });
});

describe('formatTime', () => {
  it('renders sub-hour numbers as minutes only', () => {
    expect(formatTime(0.5)).toBe('30m');
    expect(formatTime(0)).toBe('0m');
  });

  it('renders hour-and-minute pairs for numbers of at least one hour', () => {
    expect(formatTime(1)).toBe('1h 0m');
    expect(formatTime(2.25)).toBe('2h 15m');
  });

  it('formats dates and date strings as a clock time', () => {
    const date = new Date(2026, 2, 9, 14, 5);
    expect(formatTime(date)).toBe('02:05 PM');
    expect(formatTime(date.toISOString())).toBe('02:05 PM');
  });
});

describe('getGreeting', () => {
  it.each([
    [8, 'Good Morning'],
    [11, 'Good Morning'],
    [12, 'Good Afternoon'],
    [16, 'Good Afternoon'],
    [17, 'Good Evening'],
    [20, 'Good Evening'],
    [21, 'Good Night'],
    [23, 'Good Night'],
  ])('returns %s for hour %i', (hour, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, hour as number, 30));
    expect(getGreeting()).toBe(expected);
  });
});

describe('getProgressColor', () => {
  it.each([
    [100, '#22d3a0'],
    [80, '#22d3a0'],
    [79, '#7c6af7'],
    [50, '#7c6af7'],
    [49, '#f59e0b'],
    [25, '#f59e0b'],
    [24, '#ef4444'],
    [0, '#ef4444'],
  ])('maps %i%% to %s', (percent, expected) => {
    expect(getProgressColor(percent as number)).toBe(expected);
  });
});

describe('generateId', () => {
  it('prefixes the current timestamp and appends a random suffix', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9));
    const now = Date.now();

    const id = generateId();

    expect(id.startsWith(`${now}-`)).toBe(true);
    expect(id.split('-')[1]).toMatch(/^[a-z0-9]{1,7}$/);
  });

  it('produces distinct ids within the same millisecond', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9));
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

describe('isToday', () => {
  it('recognizes another time on the same local day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, 10));
    expect(isToday(new Date(2026, 2, 9, 23, 59).toISOString())).toBe(true);
  });

  it('rejects adjacent days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, 10));
    expect(isToday(new Date(2026, 2, 8, 10).toISOString())).toBe(false);
    expect(isToday(new Date(2026, 2, 10, 10).toISOString())).toBe(false);
  });
});

describe('getDaysBetween', () => {
  it('counts whole days forward', () => {
    expect(getDaysBetween('2026-03-01T00:00:00.000Z', '2026-03-04T00:00:00.000Z')).toBe(3);
  });

  it('floors partial days', () => {
    expect(getDaysBetween('2026-03-01T00:00:00.000Z', '2026-03-02T18:00:00.000Z')).toBe(1);
  });

  it('returns a negative count when the range is reversed', () => {
    expect(getDaysBetween('2026-03-04T00:00:00.000Z', '2026-03-01T00:00:00.000Z')).toBe(-3);
  });
});

describe('getRandomQuote', () => {
  it('returns a quote from the catalogue', () => {
    expect(MOTIVATIONAL_QUOTES).toContain(getRandomQuote());
  });

  it('indexes the catalogue with the random value', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomQuote()).toBe(MOTIVATIONAL_QUOTES[0]);

    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(getRandomQuote()).toBe(MOTIVATIONAL_QUOTES[MOTIVATIONAL_QUOTES.length - 1]);
  });
});

describe('XP helpers', () => {
  it('scales the level threshold quadratically', () => {
    expect(calculateXPForLevel(1)).toBe(100);
    expect(calculateXPForLevel(2)).toBe(400);
    expect(calculateXPForLevel(3)).toBe(900);
  });

  it('never drops below level 1', () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(-50)).toBe(1);
    expect(getLevelFromXP(399)).toBe(1);
  });

  it('levels up exactly at the threshold', () => {
    expect(getLevelFromXP(400)).toBe(2);
    expect(getLevelFromXP(899)).toBe(2);
    expect(getLevelFromXP(900)).toBe(3);
  });

  it('reports progress towards the next level', () => {
    expect(getXPProgress(400)).toEqual({
      level: 2,
      current: 0,
      required: 500,
      percent: 0,
    });

    expect(getXPProgress(650)).toEqual({
      level: 2,
      current: 250,
      required: 500,
      percent: 50,
    });
  });

  it('measures progress inside level 1 from the level-1 threshold', () => {
    expect(getXPProgress(100)).toEqual({
      level: 1,
      current: 0,
      required: 300,
      percent: 0,
    });
  });
});
