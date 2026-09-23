import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckSquare,
  Command,
  LayoutDashboard,
  Search,
  StickyNote,
  Timer,
} from "lucide-react";
import { startPomodoro } from "@/services/focusClock";

/**
 * Remove any stale overlay body-lock classes (e.g. react-aria
 * `block-interactivity-*` / Radix focus-trap classes). If a modal close is
 * interrupted by a paint or React 18 batch, these classes can stay on <body>
 * and set `pointer-events: none`, freezing every input in the app until a
 * restart — matching the reported "nothing responds to typing until restart".
 */
function clearBodyOverlayLocks() {
  if (typeof document === "undefined") return;
  document.body.className = document.body.className
    .toString()
    .replace(
      /\b(block-interactivity-[a-zA-Z0-9_-]+|allow-interactivity-[a-zA-Z0-9_-]+)\b/g,
      "",
    )
    .trim();
  // If no real modal is currently mounted, drop any inline overflow/pointer
  // locks that a previous trap may have left on <body>.
  const hasRealModal = document.querySelector(
    "[role='dialog'][aria-modal='true'], .modal-backdrop, .fixed.inset-0.z-\\[90\\], .fixed.inset-0.z-\\[200\\]",
  );
  if (!hasRealModal) {
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  }
}

const ACTIONS = [
  { label: "Go to Dashboard", hint: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Open Tasks", hint: "Plan your work", path: "/tasks", icon: CheckSquare },
  { label: "Open Notes", hint: "Capture an idea", path: "/notes", icon: StickyNote },
  { label: "Open Calendar", hint: "Schedule your day", path: "/calendar", icon: CalendarDays },
  { label: "Start Pomodoro", hint: "Begin a focus session", path: "/focus", icon: Timer, startFocus: true },
];

/** Desktop-first quick navigator. Ctrl/Cmd+K opens it from every app screen. */
export function CommandPalette() {
  const navigate = useNavigate();
    const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Global keyboard shortcut to toggle the palette, plus an Escape that also
  // scrubs any stale body overlay-lock so a stuck focus trap can never make the
  // rest of the app unresponsive.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((visible) => !visible);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearBodyOverlayLocks();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // App-shell safety net: scrub stale overlay body-locks on mount/unmount and
  // whenever the app regains focus — guarantees a frozen-pointer state from a
  // previous route/modal can never block input hereafter.
  useEffect(() => {
    clearBodyOverlayLocks();
    const onVis = () => {
      if (document.visibilityState === "visible") clearBodyOverlayLocks();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearBodyOverlayLocks();
    };
  }, []);

  const actions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? ACTIONS.filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(needle))
      : ACTIONS;
  }, [query]);

  const close = () => {
    setQuery("");
    setOpen(false);
    // Immediately remove any focus-trap body locks the dialog may have
    // installed, so a stuck pointer-events:none can never block input.
    clearBodyOverlayLocks();
  };

  const run = (action: (typeof ACTIONS)[number]) => {
    if (action.startFocus) startPomodoro();
    navigate(action.path);
    close();
  };

  if (!open) return null;
  // role="dialog" kept for accessibility, but aria-modal intentionally omitted
  // and markup portal'd to <body> — avoids react-aria/Radix focus-trap classes
  // that toggle `pointer-events: none` on <body> on close, which previously
  // leaked and froze all inputs until the app was restarted.
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-label="Command palette"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[#101423] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-sky-300" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded bg-white/10 px-2 py-1 text-[10px] text-slate-300">Esc</kbd>
        </div>
        <div className="p-2">
          {actions.length ? (
            actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => run(action)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/8 focus-visible:bg-white/10"
                >
                  <Icon className="h-5 w-5 text-sky-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">{action.label}</span>
                    <span className="block text-xs text-slate-400">{action.hint}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-5 text-center text-sm text-slate-400">No matching action</p>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 text-[11px] text-slate-400">
          <Command className="h-3.5 w-3.5" /> Press Ctrl/Cmd + K anywhere to navigate quickly.
        </div>
      </div>
    </div>,
    document.body,
  );
}


