import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

export function getProgressColor(percent: number): string {
  if (percent >= 80) return '#22d3a0';
  if (percent >= 50) return '#7c6af7';
  if (percent >= 25) return '#f59e0b';
  return '#ef4444';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
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
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export function calculateXPForLevel(level: number): number {
  return level * level * 100;
}

export function getLevelFromXP(xp: number): number {
  let level = 1;
  while (calculateXPForLevel(level + 1) <= xp) level++;
  return level;
}

export function getXPProgress(xp: number): { level: number; current: number; required: number; percent: number } {
  const level = getLevelFromXP(xp);
  const current = xp - calculateXPForLevel(level);
  const required = calculateXPForLevel(level + 1) - calculateXPForLevel(level);
  return { level, current, required, percent: Math.round((current / required) * 100) };
}
