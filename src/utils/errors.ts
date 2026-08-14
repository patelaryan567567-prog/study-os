import { showToast } from "@/components/ui/Toast";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/** Logs an error with its origin so failures are never lost. */
export function logError(context: string, error: unknown): void {
  console.error(`[StudyOS] ${context}:`, error);
}

/** Logs an error and tells the user about it. */
export function reportError(
  context: string,
  error: unknown,
  userMessage: string,
): void {
  logError(context, error);
  showToast(userMessage, "error");
}
