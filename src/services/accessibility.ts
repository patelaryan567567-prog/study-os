export type AccessibilityPreferences = {
  fontScale: "normal" | "large" | "extra-large";
  reducedMotion: boolean;
  highContrast: boolean;
  readableFont: boolean;
};

const KEY = "studyos_accessibility_v1";

export const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  fontScale: "normal",
  reducedMotion: false,
  highContrast: false,
  readableFont: false,
};

export function readAccessibilityPreferences(): AccessibilityPreferences {
  try {
    return { ...DEFAULT_ACCESSIBILITY, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULT_ACCESSIBILITY;
  }
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  const root = document.documentElement;
  const scale = preferences.fontScale === "extra-large" ? "1.18" : preferences.fontScale === "large" ? "1.09" : "1";
  root.style.setProperty("--studyos-font-scale", scale);
  root.classList.toggle("accessibility-reduced-motion", preferences.reducedMotion);
  root.classList.toggle("accessibility-high-contrast", preferences.highContrast);
  root.classList.toggle("accessibility-readable-font", preferences.readableFont);
  localStorage.setItem(KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event("studyos-accessibility-change"));
}
