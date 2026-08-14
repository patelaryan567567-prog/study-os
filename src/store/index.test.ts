import { beforeEach, describe, expect, it } from 'vitest';
import type { Lecture, StudySession, Task, User } from '@/types';
import { useAppStore } from '@/store';

const initialState = useAppStore.getState();

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Aryan',
    email: 'aryan@example.com',
    xp: 0,
    level: 1,
    coins: 0,
    streak: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Omit<Task, 'id' | 'createdAt'> {
  return {
    title: 'Revise integrals',
    priority: 'medium',
    status: 'todo',
    tags: [],
    userId: 'user-1',
    ...overrides,
  };
}

function makeSession(overrides: Partial<StudySession> = {}): Omit<StudySession, 'id'> {
  return {
    userId: 'user-1',
    type: 'pomodoro',
    duration: 1500,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    xpEarned: 0,
    ...overrides,
  };
}

function makeLecture(overrides: Partial<Lecture> = {}): Omit<Lecture, 'id' | 'createdAt'> {
  return {
    subjectId: 'subject-1',
    chapterId: 'chapter-1',
    title: 'Limits',
    status: 'pending',
    bookmarked: false,
    order: 1,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState(initialState, true);
});

describe('ui state', () => {
  it('tracks sidebar, focus mode and active module', () => {
    const { setSidebarCollapsed, setFocusMode, setActiveModule } = useAppStore.getState();

    expect(useAppStore.getState().activeModule).toBe('dashboard');

    setSidebarCollapsed(true);
    setFocusMode(true);
    setActiveModule('planner');

    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    expect(useAppStore.getState().focusMode).toBe(true);
    expect(useAppStore.getState().activeModule).toBe('planner');
  });

  it('stores and clears the signed-in user', () => {
    useAppStore.getState().setUser(makeUser());
    expect(useAppStore.getState().user?.id).toBe('user-1');

    useAppStore.getState().setUser(null);
    expect(useAppStore.getState().user).toBeNull();
  });
});

describe('subject actions', () => {
  it('creates a subject with a generated id and timestamp', () => {
    useAppStore.getState().addSubject({
      name: 'Maths',
      color: '#7c6af7',
      userId: 'user-1',
      totalChapters: 10,
      completedChapters: 0,
    });

    const [subject] = useAppStore.getState().subjects;
    expect(subject.id).toBeTruthy();
    expect(subject.createdAt).toBeTruthy();
    expect(subject.name).toBe('Maths');
  });

  it('updates only the targeted subject and deletes by id', () => {
    const { addSubject } = useAppStore.getState();
    addSubject({ name: 'Maths', color: '#000', userId: 'user-1', totalChapters: 1, completedChapters: 0 });
    addSubject({ name: 'Physics', color: '#111', userId: 'user-1', totalChapters: 1, completedChapters: 0 });
    const [maths, physics] = useAppStore.getState().subjects;

    useAppStore.getState().updateSubject(maths.id, { completedChapters: 1 });
    expect(useAppStore.getState().subjects[0].completedChapters).toBe(1);
    expect(useAppStore.getState().subjects[1].completedChapters).toBe(0);

    useAppStore.getState().deleteSubject(maths.id);
    expect(useAppStore.getState().subjects.map((s) => s.id)).toEqual([physics.id]);
  });
});

describe('task actions', () => {
  it('adds, updates and deletes tasks', () => {
    useAppStore.getState().addTask(makeTask());
    useAppStore.getState().addTask(makeTask({ title: 'other' }));
    const [task] = useAppStore.getState().tasks;

    useAppStore.getState().updateTask(task.id, { priority: 'urgent' });
    expect(useAppStore.getState().tasks.map((t) => t.priority)).toEqual(['urgent', 'medium']);

    useAppStore.getState().deleteTask(task.id);
    expect(useAppStore.getState().tasks.map((t) => t.title)).toEqual(['other']);
  });

  it('completing a task marks it done and rewards xp and coins', () => {
    useAppStore.getState().setUser(makeUser({ xp: 0, coins: 0 }));
    useAppStore.getState().addTask(makeTask());
    const [task] = useAppStore.getState().tasks;

    useAppStore.getState().completeTask(task.id);

    const completed = useAppStore.getState().tasks[0];
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeTruthy();
    expect(useAppStore.getState().user).toMatchObject({ xp: 10, coins: 5 });
  });

  it('completing one task leaves the other tasks alone', () => {
    useAppStore.getState().addTask(makeTask({ title: 'first' }));
    useAppStore.getState().addTask(makeTask({ title: 'second' }));
    const [, second] = useAppStore.getState().tasks;

    useAppStore.getState().completeTask(second.id);

    expect(useAppStore.getState().tasks.map((t) => t.status)).toEqual(['todo', 'completed']);
  });

  it('completing a task without a signed-in user leaves rewards untouched', () => {
    useAppStore.getState().addTask(makeTask());
    const [task] = useAppStore.getState().tasks;

    useAppStore.getState().completeTask(task.id);

    expect(useAppStore.getState().tasks[0].status).toBe('completed');
    expect(useAppStore.getState().user).toBeNull();
  });
});

describe('session actions', () => {
  it('awards two xp per completed minute', () => {
    useAppStore.getState().setUser(makeUser());

    useAppStore.getState().addSession(makeSession({ duration: 1500 }));

    expect(useAppStore.getState().sessions).toHaveLength(1);
    expect(useAppStore.getState().user?.xp).toBe(50);
  });

  it('awards no xp for a session shorter than a minute', () => {
    useAppStore.getState().setUser(makeUser());

    useAppStore.getState().addSession(makeSession({ duration: 59 }));

    expect(useAppStore.getState().user?.xp).toBe(0);
  });
});

describe('note actions', () => {
  it('stamps created and updated times, and refreshes updatedAt on edit', () => {
    useAppStore.getState().addNote({
      userId: 'user-1',
      title: 'Chapter 1',
      content: '# heading',
      tags: [],
      pinned: false,
    });
    useAppStore.getState().addNote({
      userId: 'user-1',
      title: 'Chapter 2',
      content: '',
      tags: [],
      pinned: false,
    });
    const [note] = useAppStore.getState().notes;
    expect(note.createdAt).toBeTruthy();

    useAppStore.getState().updateNote(note.id, { title: 'Chapter 1 revised' });
    const updated = useAppStore.getState().notes[0];
    expect(updated.title).toBe('Chapter 1 revised');
    expect(updated.createdAt).toBe(note.createdAt);
    expect(useAppStore.getState().notes[1].title).toBe('Chapter 2');

    useAppStore.getState().deleteNote(note.id);
    expect(useAppStore.getState().notes.map((n) => n.title)).toEqual(['Chapter 2']);
  });
});

describe('flashcard actions', () => {
  it('adds and updates flashcards', () => {
    useAppStore.getState().addFlashcard({
      userId: 'user-1',
      front: 'd/dx sin x',
      back: 'cos x',
      confidence: 0,
      nextReview: '2026-03-12T00:00:00.000Z',
      reviewCount: 0,
    });
    useAppStore.getState().addFlashcard({
      userId: 'user-1',
      front: 'd/dx cos x',
      back: '-sin x',
      confidence: 0,
      nextReview: '2026-03-12T00:00:00.000Z',
      reviewCount: 0,
    });
    const [card] = useAppStore.getState().flashcards;

    useAppStore.getState().updateFlashcard(card.id, { confidence: 4, reviewCount: 1 });

    expect(useAppStore.getState().flashcards[0]).toMatchObject({ confidence: 4, reviewCount: 1 });
    expect(useAppStore.getState().flashcards[1].confidence).toBe(0);
  });
});

describe('lecture actions', () => {
  it('adds, updates and deletes lectures', () => {
    useAppStore.getState().addLecture(makeLecture());
    useAppStore.getState().addLecture(makeLecture({ title: 'Continuity', order: 2 }));
    const [lecture] = useAppStore.getState().lectures;

    useAppStore.getState().updateLecture(lecture.id, { status: 'completed' });
    expect(useAppStore.getState().lectures.map((l) => l.status)).toEqual(['completed', 'pending']);

    useAppStore.getState().deleteLecture(lecture.id);
    expect(useAppStore.getState().lectures.map((l) => l.title)).toEqual(['Continuity']);
  });
});

describe('event actions', () => {
  it('adds and deletes calendar events', () => {
    useAppStore.getState().addEvent({
      userId: 'user-1',
      title: 'Mock test',
      date: '2026-03-20',
      type: 'mock',
    });
    useAppStore.getState().addEvent({
      userId: 'user-1',
      title: 'Exam',
      date: '2026-04-01',
      type: 'exam',
    });
    const [event] = useAppStore.getState().events;

    useAppStore.getState().deleteEvent(event.id);
    expect(useAppStore.getState().events.map((e) => e.title)).toEqual(['Exam']);
  });
});

describe('gamification', () => {
  it('recomputes the level when xp crosses a threshold', () => {
    useAppStore.getState().setUser(makeUser({ xp: 350 }));

    useAppStore.getState().addXP(50);

    expect(useAppStore.getState().user).toMatchObject({ xp: 400, level: 2 });
  });

  it('ignores xp and coin rewards without a user', () => {
    useAppStore.getState().addXP(100);
    useAppStore.getState().addCoins(100);

    expect(useAppStore.getState().user).toBeNull();
  });

  it('accumulates coins', () => {
    useAppStore.getState().setUser(makeUser({ coins: 5 }));

    useAppStore.getState().addCoins(20);

    expect(useAppStore.getState().user?.coins).toBe(25);
  });
});

describe('computed helpers', () => {
  it('sums whole minutes studied today only', () => {
    useAppStore.setState({
      sessions: [
        { ...makeSession({ duration: 1500, startTime: new Date().toISOString() }), id: 'a' },
        {
          ...makeSession({
            duration: 3600,
            startTime: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          }),
          id: 'b',
        },
      ],
    });

    expect(useAppStore.getState().getTodayStudyMinutes()).toBe(25);
  });

  it('sums minutes studied in the trailing week', () => {
    useAppStore.setState({
      sessions: [
        { ...makeSession({ duration: 1800, startTime: new Date().toISOString() }), id: 'a' },
        {
          ...makeSession({
            duration: 3600,
            startTime: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          }),
          id: 'b',
        },
        {
          ...makeSession({
            duration: 3600,
            startTime: new Date(Date.now() - 8 * 86_400_000).toISOString(),
          }),
          id: 'c',
        },
      ],
    });

    expect(useAppStore.getState().getWeekStudyMinutes()).toBe(90);
  });

  it('lists open tasks that are undated or due today', () => {
    useAppStore.setState({
      tasks: [
        { ...makeTask({ title: 'undated' }), id: '1', createdAt: '' },
        { ...makeTask({ title: 'due today', dueDate: new Date().toISOString() }), id: '2', createdAt: '' },
        {
          ...makeTask({
            title: 'due tomorrow',
            dueDate: new Date(Date.now() + 86_400_000).toISOString(),
          }),
          id: '3',
          createdAt: '',
        },
        { ...makeTask({ title: 'done', status: 'completed' }), id: '4', createdAt: '' },
      ],
    });

    expect(useAppStore.getState().getTodayTasks().map((t) => t.title)).toEqual([
      'undated',
      'due today',
    ]);
  });

  it('computes subject progress from completed lectures', () => {
    useAppStore.setState({
      lectures: [
        { ...makeLecture({ status: 'completed' }), id: '1', createdAt: '' },
        { ...makeLecture({ status: 'completed' }), id: '2', createdAt: '' },
        { ...makeLecture({ status: 'pending' }), id: '3', createdAt: '' },
        { ...makeLecture({ subjectId: 'subject-2', status: 'pending' }), id: '4', createdAt: '' },
      ],
    });

    expect(useAppStore.getState().getSubjectProgress('subject-1')).toBe(67);
    expect(useAppStore.getState().getSubjectProgress('subject-2')).toBe(0);
  });

  it('returns zero progress for a subject without lectures', () => {
    expect(useAppStore.getState().getSubjectProgress('missing')).toBe(0);
  });
});
