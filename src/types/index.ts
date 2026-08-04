// Core domain types for StudyOS

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  lastStudyDate?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string;
  userId: string;
  totalChapters: number;
  completedChapters: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  order: number;
  completed: boolean;
  createdAt: string;
}

export interface Lecture {
  id: string;
  subjectId: string;
  chapterId: string;
  title: string;
  duration?: number; // minutes
  teacher?: string;
  platform?: string;
  status: 'pending' | 'watching' | 'completed' | 'skipped';
  notes?: string;
  bookmarked: boolean;
  order: number;
  createdAt: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'completed';
  dueDate?: string;
  tags: string[];
  repeating?: 'daily' | 'weekly' | 'monthly';
  userId: string;
  createdAt: string;
  completedAt?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId?: string;
  type: 'pomodoro' | 'custom' | 'stopwatch';
  duration: number; // seconds
  startTime: string;
  endTime: string;
  pomodoroCount?: number;
  notes?: string;
  xpEarned: number;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string; // markdown
  subjectId?: string;
  chapterId?: string;
  tags: string[];
  folderId?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  userId: string;
  subjectId?: string;
  front: string;
  back: string;
  confidence: 0 | 1 | 2 | 3 | 4 | 5;
  nextReview: string;
  reviewCount: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  coinReward: number;
  condition: string;
  unlockedAt?: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string;
  type: 'exam' | 'mock' | 'assignment' | 'reminder' | 'birthday' | 'other';
  description?: string;
  color?: string;
}

export interface DailyGoal {
  userId: string;
  date: string;
  targetHours: number;
  completedHours: number;
  tasksTarget: number;
  tasksCompleted: number;
}

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
};

export type Theme = 'dark' | 'midnight' | 'aurora' | 'ocean';
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'pink';
