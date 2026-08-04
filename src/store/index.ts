import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Subject, Task, StudySession, Note, Flashcard, CalendarEvent, Lecture } from '@/types';
import { generateId, getLevelFromXP } from '@/utils';

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
        set((state) => ({
          tasks: state.tasks.map((x) =>
            x.id === id ? { ...x, status: 'completed', completedAt: new Date().toISOString() } : x
          ),
        }));
        get().addXP(10);
        get().addCoins(5);
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
        const newXP = state.user.xp + amount;
        return { user: { ...state.user, xp: newXP, level: getLevelFromXP(newXP) } };
      }),
      addCoins: (amount) => set((state) => {
        if (!state.user) return {};
        return { user: { ...state.user, coins: state.user.coins + amount } };
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
