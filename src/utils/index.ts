import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function formatTime(value: number | string | Date): string {
  if (typeof value === "number") {
    if (value < 1) {
      return `${Math.round(value * 60)}m`;
    }
    return `${Math.floor(value)}h ${Math.round((value % 1) * 60)}m`;
  }

  const parsed = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

export function getProgressColor(percent: number): string {
  if (percent >= 80) return "#22d3a0";
  if (percent >= 50) return "#7c6af7";
  if (percent >= 25) return "#f59e0b";
  return "#ef4444";
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isToday(dateStr: string): boolean {
  const today = new Date().toDateString();
  return new Date(dateStr).toDateString() === today;
}

export function getDaysBetween(a: string, b: string): number {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const MOTIVATIONAL_QUOTES = [
  "The secret of getting ahead is getting started.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Don't watch the clock; do what it does. Keep going.",
  "The expert in anything was once a beginner.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
];

export function getRandomQuote(): string {
  return MOTIVATIONAL_QUOTES[
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  ];
}

/**
 * Total XP required to REACH a given level.
 * Level 1 is the starting level (0 XP); from there the curve is level² × 100,
 * so level 2 unlocks at 400 XP, level 3 at 900 XP, level 4 at 1600 XP…
 * Anchoring level 1 at 0 keeps getXPProgress correct from the very first XP
 * earned — previously level 1 was treated as starting at 100 XP, which clamped
 * the profile progress bar to "0 / 300" until the user crossed 100 XP, making
 * it look like the level could never increase.
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return level * level * 100;
}

export function getLevelFromXP(xp: number): number {
  let level = 1;
  while (calculateXPForLevel(level + 1) <= xp) level++;
  return level;
}

export function getXPProgress(xp: number): {
  level: number;
  current: number;
  required: number;
  percent: number;
} {
  const level = getLevelFromXP(xp);
  const levelStartXP = calculateXPForLevel(level);
  const nextLevelXP = calculateXPForLevel(level + 1);
  const required = Math.max(1, nextLevelXP - levelStartXP);
  const current = Math.max(0, Math.min(required, xp - levelStartXP));
  return {
    level,
    current,
    required,
    percent: Math.round((current / required) * 100),
  };
}
