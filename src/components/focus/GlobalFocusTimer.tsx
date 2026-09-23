import { Button } from "@/components/ui/Button";
import { toggleStopwatch, toggleTimer, useFocusClock } from "@/services/focusClock";
import { useRef, useState } from "react";

const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

/** Kept above Routes so the timer remains visible while navigating the app. */
export function GlobalFocusTimer() {
  const clock = useFocusClock();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ offsetX: number; offsetY: number } | null>(null);
  if (!clock.floating) return null;
  const stopwatch = clock.stopwatchElapsed + (clock.stopwatchStartedAt ? Math.floor((Date.now() - clock.stopwatchStartedAt) / 1000) : 0);
  const isStopwatch = clock.mode === "stopwatch";
  const active = isStopwatch ? !!clock.stopwatchStartedAt : clock.running;
  return <div
    className="fixed z-[9999] cursor-move select-none rounded-2xl border border-violet-400/40 bg-slate-950/95 p-3 shadow-2xl"
    style={position ? { left: position.x, top: position.y, touchAction: "none" } : { right: 20, bottom: 20, touchAction: "none" }}
    onPointerDown={(e) => { const box = e.currentTarget.getBoundingClientRect(); drag.current = { offsetX: e.clientX - box.left, offsetY: e.clientY - box.top }; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={(e) => { if (!drag.current) return; setPosition({ x: Math.max(0, Math.min(window.innerWidth - 190, e.clientX - drag.current.offsetX)), y: Math.max(0, Math.min(window.innerHeight - 85, e.clientY - drag.current.offsetY)) }); }}
    onPointerUp={() => { drag.current = null; }}
  ><div className="text-[10px] uppercase tracking-wider text-violet-300">StudyOS {clock.mode} · drag me</div><div className="flex items-center gap-3"><span className="font-mono text-xl font-bold">{format(isStopwatch ? stopwatch : clock.secondsLeft)}</span><Button size="sm" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); isStopwatch ? toggleStopwatch() : toggleTimer(); }}>{active ? "Pause" : "Start"}</Button></div></div>;
}
