import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseInstances } from "./initFirebase";

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  createdAt: Timestamp;
  xp: number;
  coins: number;
  settings: Record<string, unknown>;
}

export interface Task {
  id?: string;
  userId: string;
  title: string;
  notes?: string;
  dueAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  completed: boolean;
  completedAt?: Timestamp | null;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  repeat?: "daily" | "weekly" | "monthly" | null;
  estimatedMinutes?: number;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

export interface Lecture {
  id?: string;
  userId: string;
  subjectId?: string;
  chapterId?: string;
  title: string;
  durationSeconds?: number;
  watched: boolean;
  notes?: string;
  teacher?: string;
  platform?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StudySession {
  id?: string;
  userId: string;
  durationSeconds: number;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  subjectId?: string;
  type: "pomodoro" | "custom" | "stopwatch";
  xpEarned?: number;
  createdAt?: Timestamp;
}

type NewUser = {
  uid: string;
  displayName?: string;
  email?: string;
};

function getDB() {
  return getFirebaseInstances().db;
}

function withId<T>(id: string, value: T): T & { id: string } {
  return { ...value, id };
}

export function userDocRef(userId: string) {
  return doc(getDB(), "users", userId);
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const snapshot = await getDoc(userDocRef(userId));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

export async function createUserProfileIfNotExists(
  user: NewUser,
): Promise<UserProfile> {
  const ref = userDocRef(user.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) return existing.data() as UserProfile;

  const profile: UserProfile = {
    id: user.uid,
    displayName: user.displayName,
    email: user.email,
    createdAt: Timestamp.now(),
    xp: 0,
    coins: 0,
    settings: {},
  };

  await setDoc(ref, profile);
  return profile;
}

export async function updateUserSettings(
  userId: string,
  settingsPatch: Record<string, unknown>,
): Promise<void> {
  await setDoc(
    userDocRef(userId),
    { settings: settingsPatch },
    { merge: true },
  );
}

export async function updateUserProfile(
  userId: string,
  profilePatch: Partial<UserProfile>,
): Promise<void> {
  await setDoc(userDocRef(userId), profilePatch, { merge: true });
}

export async function awardUserRewards(
  userId: string,
  xp: number,
  coins: number,
): Promise<void> {
  await updateDoc(userDocRef(userId), {
    xp: increment(xp),
    coins: increment(coins),
  });
}

export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDocRef(userId),
    (snapshot) =>
      callback(snapshot.exists() ? (snapshot.data() as UserProfile) : null),
    onError,
  );
}

export function tasksCollectionRef(userId: string) {
  return collection(getDB(), "users", userId, "tasks");
}

export async function addTask(
  task: Omit<Task, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Timestamp.now();
  const reference = await addDoc(tasksCollectionRef(task.userId), {
    ...task,
    createdAt: now,
    updatedAt: now,
  });
  return reference.id;
}

export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<Omit<Task, "id" | "userId">>,
): Promise<void> {
  await updateDoc(doc(tasksCollectionRef(userId), taskId), {
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<void> {
  await deleteDoc(doc(tasksCollectionRef(userId), taskId));
}

export async function getTasksForUser(userId: string): Promise<Task[]> {
  const snapshots = await getDocs(
    query(tasksCollectionRef(userId), orderBy("createdAt", "desc")),
  );
  return snapshots.docs.map((snapshot) =>
    withId(snapshot.id, snapshot.data() as Task),
  );
}

export function subscribeToTasks(
  userId: string,
  callback: (tasks: Task[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(tasksCollectionRef(userId), orderBy("createdAt", "desc")),
    (snapshots) => {
      callback(
        snapshots.docs.map((snapshot) =>
          withId(snapshot.id, snapshot.data() as Task),
        ),
      );
    },
  );
}

export function lecturesCollectionRef(userId: string) {
  return collection(getDB(), "users", userId, "lectures");
}

export function studySessionsCollectionRef(userId: string) {
  return collection(getDB(), "users", userId, "studySessions");
}

export async function addStudySession(
  session: Omit<StudySession, "id" | "createdAt">,
): Promise<string> {
  const reference = await addDoc(studySessionsCollectionRef(session.userId), {
    ...session,
    createdAt: Timestamp.now(),
  });
  return reference.id;
}

export function subscribeToStudySessions(
  userId: string,
  callback: (sessions: StudySession[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(studySessionsCollectionRef(userId), orderBy("startedAt", "desc")),
    (snapshots) =>
      callback(
        snapshots.docs.map((snapshot) =>
          withId(snapshot.id, snapshot.data() as StudySession),
        ),
      ),
    onError,
  );
}

export async function addLecture(
  lecture: Omit<Lecture, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = Timestamp.now();
  const reference = await addDoc(lecturesCollectionRef(lecture.userId), {
    ...lecture,
    createdAt: now,
    updatedAt: now,
  });
  return reference.id;
}

export async function updateLecture(
  userId: string,
  lectureId: string,
  patch: Partial<Omit<Lecture, "id" | "userId">>,
): Promise<void> {
  await updateDoc(doc(lecturesCollectionRef(userId), lectureId), {
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

export async function getLecturesForUser(userId: string): Promise<Lecture[]> {
  const snapshots = await getDocs(
    query(lecturesCollectionRef(userId), orderBy("createdAt", "desc")),
  );
  return snapshots.docs.map((snapshot) =>
    withId(snapshot.id, snapshot.data() as Lecture),
  );
}

export async function addAnalyticsEvent(
  userId: string,
  event: Record<string, unknown>,
): Promise<string> {
  const reference = await addDoc(
    collection(getDB(), "users", userId, "analytics"),
    {
      ...event,
      createdAt: Timestamp.now(),
    },
  );
  return reference.id;
}
