import { logError, reportError } from "./errors";

/**
 * Reads and parses a localStorage entry. Corrupt or unreadable data is logged
 * and replaced with `fallback` instead of crashing the calling component.
 */
export function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch (error) {
    logError(`Unable to read "${key}" from local storage`, error);
    return fallback;
  }

  if (raw === null) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logError(`Discarding corrupt local storage entry "${key}"`, error);
    return fallback;
  }
}

/**
 * Persists a value to localStorage. Failures (quota exceeded, disabled storage)
 * are surfaced to the user so silent data loss is visible.
 */
export function writeStoredJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    reportError(
      `Unable to save "${key}" to local storage`,
      error,
      "Changes could not be saved locally. Your browser storage may be full or blocked.",
    );
    return false;
  }
}

/** Reads a raw string entry, logging (rather than throwing on) storage failures. */
export function readStoredString(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    logError(`Unable to read "${key}" from local storage`, error);
    return null;
  }
}

/** Writes a raw string entry, surfacing storage failures to the user. */
export function writeStoredString(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    reportError(
      `Unable to save "${key}" to local storage`,
      error,
      "Changes could not be saved locally. Your browser storage may be full or blocked.",
    );
    return false;
  }
}

/** Removes an entry, logging (rather than throwing on) storage failures. */
export function removeStoredKey(key: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logError(`Unable to remove "${key}" from local storage`, error);
  }
}
