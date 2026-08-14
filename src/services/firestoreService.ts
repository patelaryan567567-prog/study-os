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
  type DocumentData,
  type QuerySnapshot,
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
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  repeat?: "daily" | "weekly" | "monthly" | null;
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
  profilePatch: Pick<UserProfile, "displayName">,
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

type Entity = { userId: string };

interface SubcollectionOptions {
  orderByField?: string;
  trackUpdatedAt?: boolean;
}

function subcollection<T extends Entity>(
  name: string,
  {
    orderByField = "createdAt",
    trackUpdatedAt = true,
  }: SubcollectionOptions = {},
) {
  const ref = (userId: string) => collection(getDB(), "users", userId, name);
  const ordered = (userId: string) =>
    query(ref(userId), orderBy(orderByField, "desc"));
  const mapDocs = (snapshots: QuerySnapshot<DocumentData>) =>
    snapshots.docs.map((snapshot) => withId(snapshot.id, snapshot.data() as T));

  return {
    ref,
    async add(
      value: Omit<T, "id" | "createdAt" | "updatedAt">,
    ): Promise<string> {
      const now = Timestamp.now();
      const created = await addDoc(ref((value as Entity).userId), {
        ...value,
        createdAt: now,
        ...(trackUpdatedAt ? { updatedAt: now } : {}),
      });
      return created.id;
    },
    async update(
      userId: string,
      id: string,
      patch: Partial<Omit<T, "id" | "userId">>,
    ): Promise<void> {
      await updateDoc(doc(ref(userId), id), {
        ...patch,
        ...(trackUpdatedAt ? { updatedAt: Timestamp.now() } : {}),
      });
    },
    async remove(userId: string, id: string): Promise<void> {
      await deleteDoc(doc(ref(userId), id));
    },
    async list(userId: string): Promise<(T & { id: string })[]> {
      return mapDocs(await getDocs(ordered(userId)));
    },
    subscribe(
      userId: string,
      callback: (values: (T & { id: string })[]) => void,
      onError?: (error: Error) => void,
    ): Unsubscribe {
      return onSnapshot(
        ordered(userId),
        (snapshots) => callback(mapDocs(snapshots)),
        onError,
      );
    },
  };
}

const tasks = subcollection<Task>("tasks");
const lectures = subcollection<Lecture>("lectures");
const studySessions = subcollection<StudySession>("studySessions", {
  orderByField: "startedAt",
  trackUpdatedAt: false,
});
const analytics = subcollection<Entity & Record<string, unknown>>("analytics", {
  trackUpdatedAt: false,
});

export const tasksCollectionRef = tasks.ref;
export const lecturesCollectionRef = lectures.ref;
export const studySessionsCollectionRef = studySessions.ref;

export const addTask = tasks.add;
export const updateTask = tasks.update;
export const deleteTask = tasks.remove;
export const getTasksForUser = tasks.list;
export const subscribeToTasks = tasks.subscribe;

export const addLecture = lectures.add;
export const updateLecture = lectures.update;
export const getLecturesForUser = lectures.list;

export const addStudySession = studySessions.add;
export const subscribeToStudySessions = studySessions.subscribe;

export async function addAnalyticsEvent(
  userId: string,
  event: Record<string, unknown>,
): Promise<string> {
  return analytics.add({ ...event, userId });
}
