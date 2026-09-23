/**
 * Real notification engine for StudyOS.
 *
 * Derives the notification-center feed from the actual data every module
 * stores (tasks, backlog, planner, lectures, revision flashcards, focus
 * stats, smart reminders) instead of hardcoded samples. Also builds one
 * AI study recommendation per day via Gemini when an API key is saved,
 * with a local heuristic fallback when AI is unavailable.
 *
 * Dismissed notifications are remembered per day so "Clear all" sticks
 * until the underlying data changes or the next day begins.
 */

export type NotifKind = "success" | "warning" | "info" | "reminder" | "ai";

export interface StudyNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  /** ISO timestamp shown in the feed */
  at: string;
  /** deep link when the notification maps to a page */
  path?: string;
}

const DISMISS_KEY = "studyos_notifications_dismissed_v1";
const AI_CACHE_KEY = "studyos_ai_recommendation_v1";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function relativeAt(iso?: string | null): string {
  if (iso) {
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) return new Date(Math.max(t, Date.now() - 86_400_000)).toISOString();
  }
  return new Date().toISOString();
}

function daysBetween(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const now = new Date(todayStr() + "T00:00:00").getTime();
  if (Number.isNaN(d)) return 0;
  return Math.round((now - d) / 86_400_000);
}

function loadDismissed(): Record<string, string> {
  return readLS<Record<string, string>>(DISMISS_KEY, {});
}

export function dismissNotifications(ids: string[]): void {
  const map = loadDismissed();
  const today = todayStr();
  for (const id of ids) map[id] = today;
  // prune entries older than a week
  for (const [id, day] of Object.entries(map)) {
    if (daysBetween(day) > 7) delete map[id];
  }
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {}
}

/** Stable per-day id suffix so auto-dismissed feed items return next day. */
function dayStamp(): string {
  return todayStr().replace(/-/g, "");
}

/**
 * Collects every live notification from module data. Pure + synchronous;
 * call it on an interval or after data changes.
 */
export function collectNotifications(): StudyNotification[] {
  const out: StudyNotification[] = [];
  const today = todayStr();
  const now = new Date();
  const push = (n: Omit<StudyNotification, "at"> & { at?: string }) =>
    out.push({ at: relativeAt(null), ...n });

  // ---- Tasks (zustand-persisted store) ----
  type TaskLike = {
    id: string;
    title: string;
    status: string;
    dueDate?: string;
    priority?: string;
  };
  let tasks: TaskLike[] = [];
  try {
    const store = readLS<{ state?: { tasks?: TaskLike[] } }>("studyos-store", {});
    tasks = store?.state?.tasks ?? readLS<TaskLike[]>("studyos_tasks_v1", []);
  } catch {}
  const open = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = open.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = open.filter((t) => t.dueDate === today);
  if (overdueTasks.length) {
    push({
      id: `tasks_overdue_${dayStamp()}`,
      kind: "warning",
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      body: `Oldest: “${overdueTasks[0].title}”. Clear them to reduce backlog pressure.`,
      at: overdueTasks[0].dueDate,
      path: "/tasks",
    });
  }
  if (dueToday.length) {
    push({
      id: `tasks_today_${dayStamp()}`,
      kind: "info",
      title: `${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due today`,
      body: dueToday.slice(0, 3).map((t) => t.title).join(" • "),
      path: "/tasks",
    });
  }

  // ---- Backlog ----
  type BacklogItem = {
    id?: string;
    title: string;
    dueDate?: string | null;
    status: string;
    priority?: number;
  };
  const backlog = readLS<BacklogItem[]>("studyos_backlog_v1", []);
  const pendingBacklog = backlog.filter((b) => b.status === "pending");
  const overdueBacklog = pendingBacklog.filter((b) => b.dueDate && b.dueDate < today);
  if (overdueBacklog.length) {
    push({
      id: `backlog_overdue_${dayStamp()}`,
      kind: "warning",
      title: "Backlog reminder",
      body: `${overdueBacklog.length} backlog item${overdueBacklog.length > 1 ? "s" : ""} past due — start with “${overdueBacklog[0].title}”.`,
      at: overdueBacklog[0].dueDate,
      path: "/backlog",
    });
  } else if (pendingBacklog.length >= 5) {
    push({
      id: `backlog_pending_${dayStamp()}`,
      kind: "info",
      title: "Backlog building up",
      body: `${pendingBacklog.length} pending backlog items. Pick two for today.`,
      path: "/backlog",
    });
  }

  // ---- Planner (today's plan) ----
  type PlanItem = {
    id: string;
    title: string;
    type: string;
    date: string;
    time?: string;
    status: string;
  };
  const plans = readLS<PlanItem[]>("studyos_planner_v1", []);
  const todayPlans = plans.filter((p) => p.date === today && p.status === "pending");
  if (todayPlans.length) {
    const next = todayPlans
      .filter((p) => p.time)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))[0];
    push({
      id: `planner_today_${dayStamp()}`,
      kind: "reminder",
      title: `Today's plan: ${todayPlans.length} session${todayPlans.length > 1 ? "s" : ""}`,
      body: next
        ? `Next up “${next.title}” at ${next.time}.`
        : `Start with “${todayPlans[0].title}”.`,
      path: "/planner",
    });
  }

  // ---- Lectures ----
  type LectureChapter = {
    name: string;
    lectures: { title: string; status: string; reminder?: string }[];
  };
  const chapters = readLS<LectureChapter[]>("studyos_lecture_tracker_v1", []);
  const pendingLectures = chapters.flatMap((c) =>
    c.lectures
      .filter((l) => l.status === "pending")
      .map((l) => ({ ...l, chapter: c.name })),
  );
  if (pendingLectures.length) {
    const withReminder = pendingLectures
      .filter((l) => l.reminder)
      .sort((a, b) => (a.reminder || "").localeCompare(b.reminder || ""))[0];
    if (withReminder) {
      push({
        id: `lecture_reminder_${dayStamp()}`,
        kind: "reminder",
        title: "Lecture reminder",
        body: `“${withReminder.title}” (${withReminder.chapter}) — ${new Date(withReminder.reminder!).toLocaleString()}`,
        at: withReminder.reminder,
        path: "/lectures",
      });
    } else {
      push({
        id: `lecture_pending_${dayStamp()}`,
        kind: "info",
        title: `${pendingLectures.length} lectures pending`,
        body: `Continue with “${pendingLectures[0].title}”.`,
        path: "/lectures",
      });
    }
  }

  // ---- Revision (spaced repetition) ----
  type Flashcard = { id: string; front: string; nextReview: string };
  const cards = readLS<Flashcard[]>("studyos_revision_flashcards_v1", []);
  const dueCards = cards.filter((c) => c.nextReview && new Date(c.nextReview) <= now);
  if (dueCards.length) {
    push({
      id: `revision_due_${dayStamp()}`,
      kind: "reminder",
      title: `${dueCards.length} flashcard${dueCards.length > 1 ? "s" : ""} due for revision`,
      body: "Spaced repetition works best when reviews happen on schedule.",
      at: dueCards[0].nextReview,
      path: "/revision",
    });
  }

  // ---- Smart reminders (manual, from the Reminders module) ----
  type Reminder = { id: string; title: string; time: string; notified?: boolean };
  const reminders = readLS<Reminder[]>("studyos_reminders_v1", []);
  const dueReminders = reminders
    .filter((r) => !r.notified && new Date(r.time).getTime() <= now.getTime() + 3_600_000)
    .sort((a, b) => a.time.localeCompare(b.time));
  if (dueReminders.length) {
    push({
      id: `reminder_due_${dueReminders[0].id}`,
      kind: "reminder",
      title: "Reminder",
      body: `${dueReminders[0].title} — ${new Date(dueReminders[0].time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      at: dueReminders[0].time,
    });
  }

  // ---- Focus: daily goal + streak ----
  const focus = readLS<{ minutesToday?: number; streak?: number }>("studyos_focus_v1", {});
  const goalHours = Number(readLS<number | string>("studyos_daily_goal_hours_v1", 4)) || 4;
  const goalMin = goalHours * 60;
  const minutesToday = Number(focus?.minutesToday || 0);
  const streak = Number(focus?.streak || 0);
  if (goalMin > 0 && minutesToday >= goalMin) {
    push({
      id: `focus_goal_done_${dayStamp()}`,
      kind: "success",
      title: "Daily goal complete! 🎉",
      body: `${Math.round(minutesToday / 60 * 10) / 10}h studied today — goal was ${goalHours}h. Streak: ${streak} day${streak === 1 ? "" : "s"}.`,
      path: "/focus",
    });
  } else if (minutesToday > 0) {
    push({
      id: `focus_progress_${dayStamp()}`,
      kind: "info",
      title: "Focus progress",
      body: `${minutesToday} min today — ${Math.max(0, goalMin - minutesToday)} min left to hit your ${goalHours}h goal.`,
      path: "/focus",
    });
  } else if (now.getHours() >= 18) {
    push({
      id: `focus_none_${dayStamp()}`,
      kind: "warning",
      title: "No focus session today",
      body: streak > 0
        ? `Your ${streak}-day streak is at risk! A short pomodoro keeps it alive.`
        : "Even 25 minutes today builds the habit. Start a quick session.",
      path: "/focus",
    });
  }

  // ---- AI recommendation (cached; refreshed by refreshAiRecommendation) ----
  const aiCache = readLS<{ date?: string; text?: string }>(AI_CACHE_KEY, {});
  if (aiCache?.date === today && aiCache.text) {
    push({
      id: `ai_reco_${dayStamp()}`,
      kind: "ai",
      title: "AI recommendation",
      body: aiCache.text,
    });
  } else {
    const fallback = localRecommendation({
      overdue: overdueTasks.length + overdueBacklog.length,
      dueCards: dueCards.length,
      minutesToday,
      goalMin,
      streak,
    });
    if (fallback) {
      push({ id: `ai_reco_${dayStamp()}`, kind: "ai", title: "Study tip", body: fallback });
    }
  }

  // filter out dismissed-for-today entries, newest first
  const dismissed = loadDismissed();
  return out
    .filter((n) => dismissed[n.id] !== today)
    .sort((a, b) => b.at.localeCompare(a.at));
}

function localRecommendation(s: {
  overdue: number;
  dueCards: number;
  minutesToday: number;
  goalMin: number;
  streak: number;
}): string | null {
  if (s.overdue > 0)
    return `You have ${s.overdue} overdue item${s.overdue > 1 ? "s" : ""}. Do the oldest one first — 25 minutes, no phone.`;
  if (s.dueCards > 0)
    return `${s.dueCards} flashcard${s.dueCards > 1 ? "s are" : " is"} due. Revision beats fresh reading for retention.`;
  if (s.minutesToday === 0)
    return "Start with one pomodoro now — starting is the hardest part, momentum does the rest.";
  if (s.goalMin - s.minutesToday <= 25)
    return `Only ${s.goalMin - s.minutesToday} min left for today's goal. One short session and you're done!`;
  if (s.streak >= 3)
    return `${s.streak}-day streak! Protect it — schedule tomorrow's first session tonight.`;
  return null;
}

/**
 * Fetches one AI recommendation per day using the user's Gemini key and the
 * real study context. Silently keeps the local fallback when AI is not
 * configured or fails.
 */
export async function refreshAiRecommendation(): Promise<void> {
  const today = todayStr();
  const cache = readLS<{ date?: string; text?: string }>(AI_CACHE_KEY, {});
  if (cache?.date === today && cache.text) return;

  const { hasApiKey, askGemini } = await import("@/services/gemini/geminiService");
  if (!hasApiKey()) return;

  const { buildStudyContext } = await import("@/services/ai/aiContext");
  const ctx = buildStudyContext();
  const prompt =
    `You are StudyOS's study coach. Based on this real student data, give ONE concrete, ` +
    `actionable recommendation for today (max 35 words, no greeting, no quotes):\n\n${ctx.summary}`;
  try {
    const text = (await askGemini(prompt)).trim();
    if (text) {
      try {
        localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ date: today, text }));
      } catch {}
    }
  } catch {
    // keep local heuristic fallback
  }
}
