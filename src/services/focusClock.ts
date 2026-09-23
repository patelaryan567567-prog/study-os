// focusClock.ts — Focus clock store: pomodoro, timer, countdown, stopwatch, alarm + multiple alarms
import { useSyncExternalStore } from "react";
import { persistStore } from "@/services/appDataSync";
import { scheduleLocalReminder, notifyNative } from "@/native/capacitorBridge";

export type ClockMode = "pomodoro" | "countdown" | "stopwatch" | "alarm";
type Phase = "work" | "break";

export type Alarm = {
  id: string;
  time: string; // HH:mm format
  enabled: boolean;
  title: string; // Alarm name/label
  note: string; // Note/reminder text — what the alarm is for
  tone: "chime" | "bell" | "gentle";
  volume: number;
  // Unique identifier for scheduling system notifications
  notifyId?: string;
};

export interface FocusSession {
  id: string;
  startedAt: string;
  duration: number; // seconds
  mode: ClockMode;
}

export type FocusClockState = {
  mode: ClockMode;
  phase: Phase;
  running: boolean;
  endsAt: number | null;
  secondsLeft: number;
  stopwatchElapsed: number;
  stopwatchStartedAt: number | null;
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesBeforeLong: number;
  cycle: number;
  countdownSeconds: number;
  alarmTime: string;
  alarmEnabled: boolean;
  floating: boolean;
  alarmTone: "chime" | "bell" | "gentle";
  alarmVolume: number;
  selectedTaskId: string;
  autoStartBreak: boolean;
  blockDuringFocus: boolean;
  // Multiple alarms support
  alarms: Alarm[];
  selectedAlarmIndex: number | null;
  // Note tracking for alarms
  alarmNotes: Record<string, string>;
  // Scheduled notification tracking
  scheduledAlarms: Record<string, boolean>;
  // Note field for the primary alarm
  note: string;
  // Custom alarm sound
  customAlarmSound: any;
  // Study sessions recorded by the clock
  sessions: FocusSession[];
};

const KEY = "studyos_focus_clock_v2";

const initial: FocusClockState = {
  mode: "pomodoro",
  phase: "work",
  running: false,
  endsAt: null,
  secondsLeft: 25 * 60,
  stopwatchElapsed: 0,
  stopwatchStartedAt: null,
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLong: 4,
  cycle: 0,
  countdownSeconds: 10 * 60,
  alarmTime: "",
  alarmEnabled: false,
  floating: false,
  alarmTone: "chime",
  alarmVolume: 0.65,
  selectedTaskId: "",
    autoStartBreak: true,
  blockDuringFocus: false,
  alarms: [],
  selectedAlarmIndex: null,
  alarmNotes: {},
  scheduledAlarms: {},
  note: "",
  customAlarmSound: null,
  sessions: [],
};

/** External store using useSyncExternalStore with localStorage persistence */
type Listener = () => void;
let state: FocusClockState = { ...initial };
const listeners = new Set<Listener>();

function loadState(): FocusClockState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...initial, ...parsed, customAlarmSound: null };
    }
  } catch {
    // ignore parse errors
  }
  return { ...initial };
}

if (typeof window !== "undefined" && "localStorage" in window) {
  state = loadState();
  // Pull this account's cloud copy once at startup so focus sessions recorded
  // on another device appear here. The store initialises before sign-in
  // completes, so without this a fresh device's clock would stay empty until a
  // hard reload. Only the session list is adopted — a timer that is actually
  // running locally keeps its live fields.
  import("@/services/appDataSync")
    .then(({ loadStore }) =>
      loadStore<FocusClockState>(KEY, state).then((restored) => {
        const cloudSessions = restored?.sessions;
        if (!restored || !Array.isArray(cloudSessions)) return;
        if (state.sessions.length >= cloudSessions.length) return; // nothing new
        state = { ...state, sessions: cloudSessions };
        listeners.forEach((l) => l());
      }),
    )
    .catch(() => {});
}

function saveState() {
  try {
    const { customAlarmSound: _omit, ...persistable } = state;
    localStorage.setItem(KEY, JSON.stringify(persistable));
    // File objects cannot be restored from localStorage/Firestore. Never send
    // the selected audio file to cloud sync as an empty object.
    void persistStore(KEY, persistable);
  } catch {
    // ignore
  }
}

function emitChange() {
  saveState();
  listeners.forEach((l) => l());
}

export function patchFocusClock(patch: Partial<FocusClockState>) {
  state = { ...state, ...patch };
  emitChange();
}

/** Hook to access the focus clock state */
export function useFocusClock(): FocusClockState {
  return useSyncExternalStore(
    (callback: () => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => state,
    () => state,
  );
}

export const FOCUS_PRESETS = [
  { name: "Classic Pomodoro", workMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesBeforeLong: 4 },
  { name: "Deep Focus", workMin: 50, shortBreakMin: 10, longBreakMin: 20, cyclesBeforeLong: 3 },
  { name: "Short Bursts", workMin: 15, shortBreakMin: 3, longBreakMin: 10, cyclesBeforeLong: 5 },
  { name: "Ultradian", workMin: 90, shortBreakMin: 20, longBreakMin: 30, cyclesBeforeLong: 2 },
];

/** Apply a preset configuration */
export function applyFocusPreset(preset: (typeof FOCUS_PRESETS)[number]) {
  patchFocusClock({
    workMin: preset.workMin,
    shortBreakMin: preset.shortBreakMin,
    longBreakMin: preset.longBreakMin,
    cyclesBeforeLong: preset.cyclesBeforeLong,
  });
}

let audioContext: AudioContext | null = null;
let customAlarmSound: File | null = null;
let currentSoundUrl: string = "";
let customAudio: HTMLAudioElement | null = null;
let soundStopTimer: ReturnType<typeof setTimeout> | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

async function unlockAlarmAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    // The HTML audio fallback below can still work without Web Audio.
  }
}

/** Stop a currently ringing custom alarm (called by dismiss/snooze). */
export function stopAlarmTone() {
  if (soundStopTimer) {
    clearTimeout(soundStopTimer);
    soundStopTimer = null;
  }
  if (customAudio) {
    customAudio.pause();
    customAudio.currentTime = 0;
    customAudio = null;
  }
}

async function playBuiltInAlarm(tone: string, volume: number) {
  const ctx = getAudioContext();
  await unlockAlarmAudio();
  const patterns: Record<string, number[]> = {
    chime: [880, 1175, 1568, 1175, 1568, 1760],
    bell: [784, 784, 784, 659, 784, 784, 784, 659],
    gentle: [440, 523, 659, 523, 440, 523],
  };
  const notes = patterns[tone] || patterns.chime;
  const start = ctx.currentTime + 0.03;
  notes.forEach((frequency, index) => {
    const at = start + index * 0.38;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = tone === "bell" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.75), at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.30);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.32);
  });
}

async function playAlarmTone(tone: string, volume: number) {
  stopAlarmTone();
  // HTMLAudioElement is substantially more reliable than decoding a blob via
  // Web Audio in Electron, especially for MP3/M4A files selected by the user.
  if (customAlarmSound && currentSoundUrl) {
    try {
      const audio = new Audio(currentSoundUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.loop = true;
      customAudio = audio;
      await audio.play();
      soundStopTimer = setTimeout(stopAlarmTone, 30_000);
      return;
    } catch {
      stopAlarmTone();
      // Fall through to a dependable built-in alarm.
    }
  }
  try {
    await playBuiltInAlarm(tone, volume);
  } catch {
    // silent fail on unsupported environments
  }
}

let timerInterval: ReturnType<typeof setInterval> | null = null;
let alarmCheckInterval: ReturnType<typeof setInterval> | null = null;

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const s = state;
    if (!s.running || !s.endsAt) return;
    const remaining = Math.max(0, Math.floor((s.endsAt - Date.now()) / 1000));
    if (remaining <= 0) {
      clearInterval(timerInterval!);
      timerInterval = null;
      handleTimerEnd();
    } else {
      patchFocusClock({ secondsLeft: remaining });
    }
  }, 1000);
  if (!alarmCheckInterval) {
    alarmCheckInterval = setInterval(() => checkDueAlarms(state), 60000);
  }
}

function handleTimerEnd() {
  const s = state;
  void playAlarmTone(s.alarmTone, s.alarmVolume);
  if (s.mode === "pomodoro") {
    if (s.phase === "work") {
      const session: FocusSession = {
        id: "session_" + Date.now(),
        startedAt: new Date().toISOString(),
        duration: s.workMin * 60,
        mode: "pomodoro",
      };
      if (s.cycle + 1 >= s.cyclesBeforeLong) {
        patchFocusClock({
          phase: "break",
          running: false,
          secondsLeft: s.longBreakMin * 60,
          endsAt: null,
          cycle: s.cycle + 1,
          sessions: [...s.sessions, session],
        });
      } else {
        patchFocusClock({
          phase: "break",
          running: false,
          secondsLeft: s.shortBreakMin * 60,
          endsAt: null,
          cycle: s.cycle + 1,
          sessions: [...s.sessions, session],
        });
      }
      if (s.autoStartBreak) {
        setTimeout(startBreak, 1000);
      }
    } else {
      patchFocusClock({
        phase: "work",
        running: false,
        secondsLeft: s.workMin * 60,
        endsAt: null,
        cycle: s.cycle + 1,
      });
    }
  } else if (s.mode === "countdown") {
    patchFocusClock({ running: false, endsAt: null });
  }
}

function startBreak() {
  const s = state;
  if (s.phase === "break" && !s.running) {
    patchFocusClock({
      running: true,
      endsAt: Date.now() + s.secondsLeft * 1000,
    });
    startTimerLoop();
  }
}

/** Toggle timer pause/resume */
export function toggleTimer() {
  if (state.running) {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    patchFocusClock({ running: false, endsAt: null });
  } else {
    const remaining = state.secondsLeft;
    patchFocusClock({
      running: true,
      endsAt: Date.now() + remaining * 1000,
    });
    startTimerLoop();
  }
}

/** Reset the timer */
export function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  patchFocusClock({
    running: false,
    endsAt: null,
    secondsLeft: state.workMin * 60,
    cycle: 0,
    phase: "work",
  });
}

/** Toggle stopwatch */
export function toggleStopwatch() {
  if (state.stopwatchStartedAt) {
    const elapsed = state.stopwatchElapsed + Math.floor((Date.now() - state.stopwatchStartedAt) / 1000);
    patchFocusClock({ stopwatchStartedAt: null, stopwatchElapsed: elapsed });
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  } else {
    patchFocusClock({ stopwatchStartedAt: Date.now() });
    startTimerLoop();
  }
}

/** Reset the stopwatch */
export function resetStopwatch() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  patchFocusClock({ stopwatchStartedAt: null, stopwatchElapsed: 0 });
}

/** Set custom alarm sound */
export function setCustomAlarmSound(file: File | null) {
  if (currentSoundUrl) URL.revokeObjectURL(currentSoundUrl);
  customAlarmSound = file;
  currentSoundUrl = file ? URL.createObjectURL(file) : "";
  void unlockAlarmAudio();
  patchFocusClock({ customAlarmSound: file });
}

/** Test alarm sound */
export async function testAlarmSound() {
  await unlockAlarmAudio();
  await playAlarmTone(state.alarmTone, state.alarmVolume);
}

/** Start a pomodoro work session */
export function startPomodoro() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const workSeconds = state.workMin * 60;
  patchFocusClock({
    mode: "pomodoro",
    phase: "work",
    running: true,
    endsAt: Date.now() + workSeconds * 1000,
    secondsLeft: workSeconds,
  });
  startTimerLoop();
}

/** Start a pomodoro work session with a specific task */
export function startPomodoroTasks(taskId: string) {
  patchFocusClock({ selectedTaskId: taskId });
  startPomodoro();
}

/** Start a countdown timer */
export function startCountdown() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const totalSeconds = state.countdownSeconds;
  patchFocusClock({
    mode: "countdown",
    running: true,
    endsAt: Date.now() + totalSeconds * 1000,
    secondsLeft: totalSeconds,
  });
  startTimerLoop();
}

/**
 * Schedule all enabled alarms
 */
export async function scheduleAllAlarms(clock: FocusClockState): Promise<void> {
  for (const alarm of clock.alarms) {
    if (alarm.enabled && alarm.time && !clock.scheduledAlarms[alarm.time]) {
      await scheduleAlarm({
        ...clock,
        alarmTime: alarm.time,
        alarmEnabled: true,
        note: alarm.note,
      });
    }
  }
}

/**
 * Enable/disable an alarm by time
 */
export async function enableAlarm(alarmTime: string, enabled: boolean = true): Promise<void> {
  if (enabled) await unlockAlarmAudio();
  patchFocusClock({
    alarms: state.alarms.map((a) => (a.time === alarmTime ? { ...a, enabled } : a)),
  });
  if (enabled) {
    await scheduleAlarm({ ...state, alarmTime, alarmEnabled: true });
  } else {
    await cancelScheduledAlarm(alarmTime);
  }
}

/**
 * Schedule a single alarm notification
 */
export async function scheduleAlarm(clock: FocusClockState): Promise<void> {
  if (clock.scheduledAlarms[clock.alarmTime]) {
    await cancelScheduledAlarm(clock.alarmTime);
  }
  if (!clock.alarmEnabled || !clock.alarmTime) return;
  const [hours, minutes] = clock.alarmTime.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return;
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  const delay = target.getTime() - now.getTime();
  const notifyId = "alarm_" + clock.alarmTime + "_" + Date.now();
  if (!clock.alarms.some((a) => a.notifyId === notifyId)) {
    const existing = clock.alarms.find((a) => a.time === clock.alarmTime);
    const newAlarm: Alarm = {
      id: existing ? existing.id : notifyId,
      time: clock.alarmTime,
      enabled: true,
      title: existing ? existing.title : "",
      note: existing ? existing.note : (clock.note || ""),
      tone: existing ? existing.tone : clock.alarmTone,
      volume: existing ? existing.volume : clock.alarmVolume,
      notifyId,
    };
    patchFocusClock({ alarms: [...clock.alarms, newAlarm] });
  }
  const alarmInfo = clock.alarms.find((a) => a.time === clock.alarmTime);
  void scheduleLocalReminder(
    "Alarm: " + (alarmInfo ? alarmInfo.title : "Alarm"),
    (alarmInfo ? alarmInfo.note : clock.note) || "Time to wake up!",
    target.toISOString(),
  );
  if (delay > 0) {
    (state as any)._alarmTimeout = window.setTimeout(() => {
      void triggerAlarm(clock);
    }, delay);
  }
}

/** Cancel a scheduled alarm */
export async function cancelScheduledAlarm(alarmTime: string): Promise<void> {
  const timeoutId = (state as any)._alarmTimeout;
  if (timeoutId) {
    clearTimeout(timeoutId);
    delete (state as any)._alarmTimeout;
  }
  delete state.scheduledAlarms[alarmTime];
  saveState();
}

/** Check and trigger any due alarms */
export function checkDueAlarms(clock: FocusClockState): void {
  const enabledAlarms = clock.alarms.filter((a) => a.enabled && a.time);
  for (const alarm of enabledAlarms) {
    const now = new Date();
    const [hours, minutes] = alarm.time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) continue;
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    const diff = now.getTime() - target.getTime();
    if (diff >= 0 && diff < 60000) {
      triggerAlarmFor(alarm);
    }
  }
}

/** Trigger alarm manually */
export function triggerAlarm(clock: FocusClockState): void {
  if (!clock.alarmEnabled) return;
  const alarmInfo = clock.alarms.find((a) => a.time === clock.alarmTime);
  if (typeof document !== "undefined") {
    showAlarmPopup(alarmInfo || {
      id: "popup_alarm",
      time: clock.alarmTime,
      enabled: true,
      title: "Alarm",
      note: clock.note || "",
      tone: clock.alarmTone,
      volume: clock.alarmVolume,
    });
  }
  void notifyNative(
    "Alarm: " + (alarmInfo ? alarmInfo.title : "Alarm"),
    (alarmInfo ? alarmInfo.note : clock.note) || "Time to wake up!",
  );
  void playAlarmTone(clock.alarmTone, clock.alarmVolume);
  patchFocusClock({ alarmEnabled: false, alarmTime: "" });
}

/**
 * Trigger a specific alarm: popup + native notification + sound + disable
 */
export function triggerAlarmFor(alarm: Alarm): void {
  if (typeof document !== "undefined") {
    showAlarmPopup(alarm);
  }
  void notifyNative("Alarm: " + alarm.title, alarm.note || "Time to wake up!");
  void playAlarmTone(alarm.tone, alarm.volume);
    patchFocusClock({
    alarms: state.alarms.map((a) => (a.id === alarm.id ? { ...a, enabled: false } : a)),
  });
  if (alarm.time === state.alarmTime) {
    patchFocusClock({ alarmEnabled: false, alarmTime: "" });
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch {
    return false;
  }
}

/**
 * Show alarm popup in browser
 */
export function showAlarmPopup(alarm: Alarm): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.querySelector(".studyos-alarm-popup");
  if (existing) document.body.removeChild(existing as Node);
  const popup = document.createElement("div");
  popup.className = "studyos-alarm-popup";
  const noteHtml = alarm.note
    ? '<p class="text-gray-300 mb-4">' + alarm.note + '</p>'
    : '<p class="text-gray-400 mb-4 text-sm">Time to wake up!</p>';
  popup.innerHTML = '<div class="fixed inset-0 flex items-center justify-center z-[10000] bg-black/80 backdrop-blur-sm">' +
    '<div class="relative rounded-2xl border-2 border-violet-400/50 bg-gradient-to-br from-violet-900/90 to-slate-900/95 p-8 max-w-md w-full mx-4 shadow-2xl">' +
    '<div class="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-violet-500/30 to-emerald-500/30 blur-xl"></div>' +
    '<div class="relative text-center">' +
    '<div class="text-5xl mb-4">🔔</div>' +
    '<h2 class="text-2xl font-bold text-white mb-2">Alarm: ' + (alarm.title || "Wake Up!") + '</h2>' +
    noteHtml +
    '<div class="mt-6 flex justify-center gap-3">' +
    '<button id="studyos-alarm-snooze" class="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 transition-colors">Snooze 5 min</button>' +
    '<button id="studyos-alarm-dismiss" class="px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-400/30 text-violet-300 hover:bg-violet-500/30 transition-colors">Dismiss</button>' +
    '</div>' +
    '</div></div></div>';
  document.body.appendChild(popup);
  const snoozeBtn = popup.querySelector("#studyos-alarm-snooze");
  const dismissBtn = popup.querySelector("#studyos-alarm-dismiss");
  if (snoozeBtn) {
    snoozeBtn.addEventListener("click", () => {
      stopAlarmTone();
      patchFocusClock({ alarmEnabled: false });
      setTimeout(() => {
        patchFocusClock({ alarmEnabled: true });
        showAlarmPopup(alarm);
      }, 5 * 60 * 1000);
      if (popup.parentNode) document.body.removeChild(popup);
    });
  }
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      stopAlarmTone();
      patchFocusClock({ alarmEnabled: false });
      if (popup.parentNode) document.body.removeChild(popup);
    });
  }
  setTimeout(() => {
    if (popup.parentNode) document.body.removeChild(popup);
  }, 30000);
  return popup;
}

/**
 * Check for due alarms and show popups
 */
export function checkAndShowAlarms(): void {
  if (!state.alarmEnabled || !state.alarmTime) return;
  checkDueAlarms(state);
}

/** Restore all alarm schedules on app startup */
export async function restoreAlarmSchedule(): Promise<void> {
  for (const alarm of state.alarms) {
    if (alarm.enabled && alarm.time) {
      void scheduleAlarm({
        ...state,
        alarmTime: alarm.time,
        alarmEnabled: true,
        note: alarm.note,
      });
    }
  }
}

// Initialize on module load
if (typeof window !== "undefined") {
  void requestNotificationPermission();
  void restoreAlarmSchedule();
  setInterval(() => {
    checkAndShowAlarms();
  }, 30000);
}
