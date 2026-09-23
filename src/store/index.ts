import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Subject, Task, StudySession, Note, Flashcard, CalendarEvent, Lecture } from '@/types';
import { generateId, getLevelFromXP } from '@/utils';

/** Rewards granted once per task completion (and taken back when un-completing). */
export const TASK_COMPLETION_XP = 10;
export const TASK_COMPLETION_COINS = 5;

/** The gamification module persists its own progress under this key; the store
 *  mirrors every XP/coin change into it so the Dashboard and the Achievements
 *  page always show identical numbers. */
const GAMIFICATION_LEDGER_KEY = 'studyos_gamification_v1';

/** Keep the gamification module's saved ledger in sync with the store values.
 *  Only the XP/coins fields are touched — achievements, challenges etc. that
 *  the module owns remain untouched. */
function mirrorRewardsToGamificationLedger(xp: number, coins: number) {
  try {
    const raw = localStorage.getItem(GAMIFICATION_LEDGER_KEY);
    const ledger = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      GAMIFICATION_LEDGER_KEY,
      JSON.stringify({
        ...ledger,
        xp,
        totalXp: Math.max(xp, ledger?.totalXp ?? 0),
        coins,
        level: getLevelFromXP(xp),
      }),
    );
  } catch {
    /* ledger mirror is best-effort only */
  }
}

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // UI
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  activeModule: string;
  setActiveModule: (m: string) => void;

  // Data
  subjects: Subject[];
  tasks: Task[];
  sessions: StudySession[];
  notes: Note[];
  flashcards: Flashcard[];
  events: CalendarEvent[];
  lectures: Lecture[];

  // Subject actions
  addSubject: (s: Omit<Subject, 'id' | 'createdAt'>) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Task actions
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, t: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  /** Revert a completed task back to "todo" and take back the rewards that
   *  were granted for it, so toggling a task can never farm extra XP. */
  uncompleteTask: (id: string) => void;

  // Session actions
  addSession: (s: Omit<StudySession, 'id'>) => void;

  // Note actions
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, n: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Flashcard actions
  addFlashcard: (f: Omit<Flashcard, 'id' | 'createdAt'>) => void;
  updateFlashcard: (id: string, f: Partial<Flashcard>) => void;

  // Lecture actions
  addLecture: (l: Omit<Lecture, 'id' | 'createdAt'>) => void;
  updateLecture: (id: string, l: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;

  // Event actions
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;

  // Gamification
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;

  // Computed helpers
  getTodayStudyMinutes: () => number;
  getWeekStudyMinutes: () => number;
  getTodayTasks: () => Task[];
  getSubjectProgress: (subjectId: string) => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      focusMode: false,
      setFocusMode: (v) => set({ focusMode: v }),
      activeModule: 'dashboard',
      setActiveModule: (m) => set({ activeModule: m }),

      subjects: [],
      tasks: [],
      sessions: [],
      notes: [],
      flashcards: [],
      events: [],
      lectures: [],

      addSubject: (s) => set((state) => ({
        subjects: [...state.subjects, { ...s, id: generateId(), createdAt: new Date().toISOString() }],
      })),
      updateSubject: (id, s) => set((state) => ({
        subjects: state.subjects.map((x) => x.id === id ? { ...x, ...s } : x),
      })),
      deleteSubject: (id) => set((state) => ({
        subjects: state.subjects.filter((x) => x.id !== id),
      })),

      addTask: (t) => set((state) => ({
        tasks: [...state.tasks, { ...t, id: generateId(), createdAt: new Date().toISOString() }],
      })),
      updateTask: (id, t) => set((state) => ({
        tasks: state.tasks.map((x) => x.id === id ? { ...x, ...t } : x),
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((x) => x.id !== id),
      })),
      completeTask: (id) => {
        // Idempotent: rewards are granted exactly once, only on the transition
        // into "completed". Re-ticking an already completed task is a no-op.
        const task = get().tasks.find((x) => x.id === id);
        if (!task || task.status === 'completed') return;
        set((state) => ({
          tasks: state.tasks.map((x) =>
            x.id === id ? { ...x, status: 'completed', completedAt: new Date().toISOString() } : x
          ),
        }));
        get().addXP(TASK_COMPLETION_XP);
        get().addCoins(TASK_COMPLETION_COINS);
      },
      uncompleteTask: (id) => {
        const task = get().tasks.find((x) => x.id === id);
        if (!task || task.status !== 'completed') return;
        set((state) => ({
          tasks: state.tasks.map((x) =>
            x.id === id ? { ...x, status: 'todo', completedAt: undefined } : x
          ),
        }));
        // Take the completion reward back — but only when this task actually
        // earned it (completedAt is set by completeTask; tasks that were marked
        // completed through other paths never received XP, so nothing to claw back).
        if (task.completedAt) {
          get().addXP(-TASK_COMPLETION_XP);
          get().addCoins(-TASK_COMPLETION_COINS);
        }
      },

      addSession: (s) => {
        set((state) => ({
          sessions: [...state.sessions, { ...s, id: generateId() }],
        }));
        get().addXP(Math.floor(s.duration / 60) * 2);
      },

      addNote: (n) => set((state) => ({
        notes: [...state.notes, {
          ...n, id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      })),
      updateNote: (id, n) => set((state) => ({
        notes: state.notes.map((x) => x.id === id ? { ...x, ...n, updatedAt: new Date().toISOString() } : x),
      })),
      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter((x) => x.id !== id),
      })),

      addFlashcard: (f) => set((state) => ({
        flashcards: [...state.flashcards, { ...f, id: generateId(), createdAt: new Date().toISOString() }],
      })),
      updateFlashcard: (id, f) => set((state) => ({
        flashcards: state.flashcards.map((x) => x.id === id ? { ...x, ...f } : x),
      })),

      addLecture: (l) => set((state) => ({
        lectures: [...state.lectures, { ...l, id: generateId(), createdAt: new Date().toISOString() }],
      })),
      updateLecture: (id, l) => set((state) => ({
        lectures: state.lectures.map((x) => x.id === id ? { ...x, ...l } : x),
      })),
      deleteLecture: (id) => set((state) => ({
        lectures: state.lectures.filter((x) => x.id !== id),
      })),

      addEvent: (e) => set((state) => ({
        events: [...state.events, { ...e, id: generateId() }],
      })),
      deleteEvent: (id) => set((state) => ({
        events: state.events.filter((x) => x.id !== id),
      })),

      addXP: (amount) => set((state) => {
        if (!state.user) return {};
        const newXP = Math.max(0, state.user.xp + amount);
        mirrorRewardsToGamificationLedger(newXP, state.user.coins);
        return { user: { ...state.user, xp: newXP, level: getLevelFromXP(newXP) } };
      }),
      addCoins: (amount) => set((state) => {
        if (!state.user) return {};
        const newCoins = Math.max(0, state.user.coins + amount);
        mirrorRewardsToGamificationLedger(state.user.xp, newCoins);
        return { user: { ...state.user, coins: newCoins } };
      }),

      getTodayStudyMinutes: () => {
        const today = new Date().toDateString();
        return get().sessions
          .filter((s) => new Date(s.startTime).toDateString() === today)
          .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
      },

      getWeekStudyMinutes: () => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return get().sessions
          .filter((s) => new Date(s.startTime).getTime() > weekAgo)
          .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
      },

      getTodayTasks: () => {
        const today = new Date().toDateString();
        return get().tasks.filter((t) =>
          t.status !== 'completed' &&
          (!t.dueDate || new Date(t.dueDate).toDateString() === today)
        );
      },

      getSubjectProgress: (subjectId) => {
        const lectures = get().lectures.filter((l) => l.subjectId === subjectId);
        if (!lectures.length) return 0;
        const completed = lectures.filter((l) => l.status === 'completed').length;
        return Math.round((completed / lectures.length) * 100);
      },
    }),
    {
      name: 'studyos-store',
      partialize: (state) => ({
        user: state.user,
        subjects: state.subjects,
        tasks: state.tasks,
        sessions: state.sessions,
        notes: state.notes,
        flashcards: state.flashcards,
        events: state.events,
        lectures: state.lectures,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
