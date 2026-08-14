import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui";
import { CircularProgress } from "@/components/ui/Progress";
import { PageContainer } from "@/components/layout/PageContainer";
import { Timer } from "lucide-react";
import { createId, readJSON, writeJSON } from "@/utils";

type Mode = "pomodoro" | "countdown" | "stopwatch" | "alarm";

const STORAGE_KEY = "studyos_focus_v1";

export function FocusMode() {
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [workDuration, setWorkDuration] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [cyclesBeforeLong, setCyclesBeforeLong] = useState(4);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [countdownInput, setCountdownInput] = useState(10 * 60);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
  const [alarmTime, setAlarmTime] = useState("");
  const [floating, setFloating] = useState(false);
  const [alwaysOnTop] = useState(true);

  const [ambient, setAmbient] = useState<"off" | "white" | "rain" | "forest">(
    "off",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [history, setHistory] = useState<any[]>(
    () => readJSON<{ history?: any[] }>(STORAGE_KEY, {}).history ?? [],
  );

  useEffect(() => {
    writeJSON(STORAGE_KEY, { history });
  }, [history]);

  // Timer interval
  useEffect(() => {
    let t: any;
    if (running) {
      t = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            // session end
            playBeep();
            setRunning(false);
            recordSession();
            // handle pomodoro auto-switch
            if (mode === "pomodoro") {
              if (!isOnBreak) {
                setCurrentCycle((c) => c + 1);
                const nextBreak =
                  (currentCycle + 1) % cyclesBeforeLong === 0
                    ? longBreak * 60
                    : shortBreak * 60;
                setSecondsLeft(nextBreak);
                setIsOnBreak(true);
                setRunning(true);
                return nextBreak;
              } else {
                // end break -> work
                setIsOnBreak(false);
                setSecondsLeft(workDuration * 60);
                setRunning(true);
                return workDuration * 60;
              }
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [
    running,
    mode,
    isOnBreak,
    currentCycle,
    workDuration,
    shortBreak,
    longBreak,
    cyclesBeforeLong,
  ]);

  // Stopwatch
  useEffect(() => {
    let t: any;
    if (stopwatchRunning) {
      t = setInterval(() => setStopwatchElapsed((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [stopwatchRunning]);

  // Ambient audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (ambient !== "off") {
      const src =
        ambient === "white"
          ? "https://assets.mixkit.co/sfx/preview/mixkit-calming-wind-ambient-2386.mp3"
          : ambient === "rain"
            ? "https://assets.mixkit.co/sfx/preview/mixkit-heavy-rain-ambient-2395.mp3"
            : "https://assets.mixkit.co/sfx/preview/mixkit-forest-birds-ambience-2353.mp3";
      const a = new Audio(src);
      a.loop = true;
      a.volume = 0.45;
      a.play().catch(() => {});
      audioRef.current = a;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [ambient]);

  function playBeep() {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.1;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 800);
    } catch {}
  }

  function recordSession() {
    const entry = {
      id: createId("sess_"),
      mode,
      start: new Date().toISOString(),
      duration:
        (mode === "stopwatch" ? stopwatchElapsed : undefined) ?? undefined,
    };
    setHistory((h) => [entry, ...h].slice(0, 200));
  }

  const startPomodoro = () => {
    setMode("pomodoro");
    setSecondsLeft(workDuration * 60);
    setIsOnBreak(false);
    setRunning(true);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
      // update fullscreen state not required
    } catch {}
  };

  const formatted = (s: number) => {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <PageContainer className="space-y-6 pb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)]">
          <Timer size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Focus Mode
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Pomodoro, countdown, stopwatch & ambient sounds
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="pomodoro">Pomodoro</option>
          <option value="countdown">Countdown</option>
          <option value="stopwatch">Stopwatch</option>
          <option value="alarm">Alarm</option>
        </select>
        <select
          value={ambient}
          onChange={(e) => setAmbient(e.target.value as any)}
        >
          <option value="off">🔇 No Ambient</option>
          <option value="white">🌬 White Noise</option>
          <option value="rain">🌧 Rain</option>
          <option value="forest">🌲 Forest</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFloating((f) => !f)}
        >
          {floating ? "Hide Float" : "Float Timer"}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
          Fullscreen
        </Button>
      </div>

      <Card padding="lg">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Current mode
            </p>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {mode === "pomodoro"
                ? isOnBreak
                  ? "Break Time"
                  : "Focus Work"
                : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {mode === "pomodoro" &&
                `Cycle ${currentCycle + 1} · ${isOnBreak ? "Rest up" : "Stay focused"}`}
              {mode === "countdown" && "Count down to zero"}
              {mode === "stopwatch" && "Track elapsed time"}
              {mode === "alarm" && "Alert at a set time"}
            </p>
          </div>
          <CircularProgress
            value={Math.min(
              100,
              Math.round(
                (mode === "stopwatch"
                  ? (stopwatchElapsed / 60 / 25) * 100
                  : (1 - secondsLeft / (workDuration * 60 || 1)) * 100) || 0,
              ),
            )}
            size={100}
            strokeWidth={8}
          >
            <div className="text-center">
              <div className="text-base font-mono font-bold text-[var(--color-text-primary)]">
                {mode === "stopwatch"
                  ? formatted(stopwatchElapsed)
                  : formatted(secondsLeft)}
              </div>
            </div>
          </CircularProgress>
        </div>
      </Card>

      {mode === "pomodoro" && (
        <Card padding="md">
          <div className="grid grid-cols-4 gap-3">
            <Input
              label="Work (min)"
              type="number"
              value={workDuration}
              onChange={(e: any) =>
                setWorkDuration(Number(e.target.value) || 25)
              }
            />
            <Input
              label="Short Break (min)"
              type="number"
              value={shortBreak}
              onChange={(e: any) => setShortBreak(Number(e.target.value) || 5)}
            />
            <Input
              label="Long Break (min)"
              type="number"
              value={longBreak}
              onChange={(e: any) => setLongBreak(Number(e.target.value) || 15)}
            />
            <Input
              label="Cycles before long"
              type="number"
              value={cyclesBeforeLong}
              onChange={(e: any) =>
                setCyclesBeforeLong(Number(e.target.value) || 4)
              }
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={startPomodoro}>
              Start Pomodoro
            </Button>
            <Button
              onClick={() => {
                setRunning((s) => !s);
              }}
            >
              {running ? "Pause" : "Resume"}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(workDuration * 60);
                setIsOnBreak(false);
              }}
            >
              Reset
            </Button>
          </div>
        </Card>
      )}

      {mode === "countdown" && (
        <Card padding="md">
          <div className="flex gap-2">
            <Input
              label="Seconds"
              type="number"
              value={countdownInput}
              onChange={(e: any) =>
                setCountdownInput(Number(e.target.value) || 0)
              }
            />
            <Button
              onClick={() => {
                setSecondsLeft(countdownInput);
                setRunning(true);
                setMode("countdown");
              }}
            >
              Start
            </Button>
            <Button
              onClick={() => {
                setRunning(false);
                setSecondsLeft(0);
              }}
            >
              Stop
            </Button>
          </div>
        </Card>
      )}

      {mode === "stopwatch" && (
        <Card padding="md">
          <div className="flex gap-2 items-center">
            <div className="text-lg font-mono">
              {formatted(stopwatchElapsed)}
            </div>
            <Button onClick={() => setStopwatchRunning((r) => !r)}>
              {stopwatchRunning ? "Pause" : "Start"}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setStopwatchRunning(false);
                setStopwatchElapsed(0);
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                recordSession();
                setStopwatchElapsed(0);
                setStopwatchRunning(false);
              }}
            >
              Save Session
            </Button>
          </div>
        </Card>
      )}

      {mode === "alarm" && (
        <Card padding="md">
          <div className="flex gap-2 items-center">
            <Input
              type="time"
              value={alarmTime}
              onChange={(e: any) => setAlarmTime(e.target.value)}
            />
            <Button
              onClick={() => {
                setRunning(true);
              }}
            >
              Enable
            </Button>
            <Button
              onClick={() => {
                setRunning(false);
              }}
            >
              Disable
            </Button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            When enabled the alarm will check the clock each minute and play a
            tone at the set time.
          </p>
        </Card>
      )}

      <Card padding="md">
        <h4 className="font-semibold">Session History</h4>
        <div className="space-y-2 mt-2">
          {history.length === 0 && (
            <div className="py-4">
              <EmptyState
                title="No sessions yet"
                description="Start a focus session to record history"
                primaryLabel="Start Pomodoro"
                onPrimary={() => startPomodoro()}
              />
            </div>
          )}
          {history.map((h) => (
            <div
              key={h.id}
              className="glass rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{h.mode}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {new Date(h.start).toLocaleString()} •{" "}
                  {h.duration ? `${h.duration}s` : ""}
                </div>
              </div>
              <div>
                <Button
                  size="icon"
                  variant="danger"
                  onClick={() =>
                    setHistory(history.filter((x) => x.id !== h.id))
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {floating && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: alwaysOnTop ? 9999 : 50,
          }}
        >
          <div className="glass rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="font-mono text-lg">{formatted(secondsLeft)}</div>
              <div className="flex gap-2">
                <Button size="icon" onClick={() => setRunning((r) => !r)}>
                  {running ? "▮▮" : "▶"}
                </Button>
                <Button
                  size="icon"
                  onClick={() => {
                    setFloating(false);
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default FocusMode;
