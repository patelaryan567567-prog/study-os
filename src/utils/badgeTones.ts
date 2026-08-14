export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  error: "text-error bg-error/10",
  info: "text-info bg-info/10",
  neutral: "text-gray-400 bg-gray-100 dark:bg-gray-800",
};

export function badgeToneClass(tone: BadgeTone): string {
  return BADGE_TONE_CLASSES[tone];
}

const PRIORITY_TONES: Record<string, BadgeTone> = {
  high: "error",
  medium: "warning",
  low: "info",
};

const STATUS_TONES: Record<string, BadgeTone> = {
  completed: "success",
  "in-progress": "warning",
  missed: "error",
};

export function priorityToneClass(priority: string): string {
  return badgeToneClass(PRIORITY_TONES[priority] ?? "neutral");
}

export function statusToneClass(status: string): string {
  return badgeToneClass(STATUS_TONES[status] ?? "neutral");
}
