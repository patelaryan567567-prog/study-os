import { useEffect } from "react";
import { isNative } from "@/native/capacitorBridge";

export type ShortcutAction = "pomodoro" | "note" | "reminder";

const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  pomodoro: "⌘ + P",
  note: "⌘ + N",
  reminder: "⌘ + R",
};

function readShortcuts(): Record<ShortcutAction, string> {
  const base: Record<ShortcutAction, string> = { ...DEFAULT_SHORTCUTS };
  try {
    const raw = localStorage.getItem("studyos_shortcuts");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<ShortcutAction, string>>;
      return { ...base, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return base;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    !!el.isContentEditable
  );
}

/** Match a stored combo like "⌘ + P" or "Ctrl + Shift + N" against a key event. */
function matchesShortcut(e: KeyboardEvent, combo: string): boolean {
  const parts = combo
    .split("+")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const key = parts.pop() || "";

  let meta = false;
  let ctrl = false;
  let shift = false;
  let alt = false;
  for (const p of parts) {
    if (
      p === "⌘" ||
      p === "cmd" ||
      p === "meta" ||
      p === "command" ||
      p === "ctrl" ||
      p === "control" ||
      p === "⌃"
    ) {
      meta = true;
      ctrl = true;
    } else if (p === "⇧" || p === "shift") {
      shift = true;
    } else if (p === "⌥" || p === "alt" || p === "option") {
      alt = true;
    }
  }

  const keyMatch = e.key.toLowerCase() === key.toLowerCase();
  if (!keyMatch) return false;

  const needsModifier = meta || ctrl;
  const modifierOk = needsModifier
    ? e.ctrlKey || e.metaKey
    : !e.ctrlKey && !e.metaKey;
  const shiftOk = shift ? e.shiftKey : !e.shiftKey;
  const altOk = alt ? e.altKey : !e.altKey;

  return modifierOk && shiftOk && altOk;
}

/**
 * Global keyboard shortcuts. Runs only on desktop (not in the native/mobile
 * app). Listens for the combos stored in `studyos_shortcuts` and calls
 * `onAction` when one matches and the user is not typing in a field.
 */
export function useKeyboardShortcuts(onAction: (action: ShortcutAction) => void): void {
  useEffect(() => {
    if (isNative()) return;

    const shortcuts = readShortcuts();

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const entries = Object.entries(shortcuts) as [ShortcutAction, string][];
      for (const [action, combo] of entries) {
        if (matchesShortcut(e, combo)) {
          e.preventDefault();
          onAction(action);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // Re-bind only when the callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAction]);
}
