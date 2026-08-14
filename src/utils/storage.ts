const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

export function readJSON<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable or quota exceeded
  }
}

export function readString(key: string, fallback: string): string {
  if (!hasStorage()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable or quota exceeded
  }
}

export function removeKeys(...keys: string[]): void {
  if (!hasStorage()) return;
  try {
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // storage unavailable
  }
}
