import { useAppStore } from "@/store";
import { persistStore } from "@/services/appDataSync";

export type AIAction =
  | { type: "task"; title: string; description?: string; priority?: "low" | "medium" | "high" | "urgent"; dueDate?: string; tags?: string[]; estimatedMinutes?: number; subtasks?: string[] }
  | { type: "flashcard"; front: string; back: string; subject?: string }
  | { type: "backlog"; title: string; chapter?: string; dueDate?: string; itemType?: string; priority?: number; notes?: string }
  | { type: "note"; title: string; content: string; folder?: string; tags?: string[] }
  | { type: "calendar"; title: string; date: string; eventType?: "exam" | "lecture" | "revision" | "other"; reminder?: number; location?: string; notes?: string }
  | { type: "lecture"; title: string; subject?: string; chapter?: string }
  | { type: "mistake"; question: string; myAnswer?: string; correction?: string; subject?: string }
  | { type: "formula"; title: string; formula: string; note?: string; subject?: string }
  | { type: "delete"; target: DeleteTarget; title: string; subject?: string; chapter?: string };

export type DeleteTarget = "task" | "backlog" | "note" | "flashcard" | "mistake" | "formula" | "lecture" | "chapter" | "event";

const ACTION_BLOCK = /```studyos-actions\s*([\s\S]*?)```/i;
const uid = (prefix: string) => `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const text = (value: unknown, max = 5000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const date = (value: unknown) => {
  const valueText = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : undefined;
};
const list = (value: unknown) => Array.isArray(value) ? value.map((item) => text(item, 120)).filter(Boolean).slice(0, 30) : [];
const DELETE_TARGETS: DeleteTarget[] = ["task", "backlog", "note", "flashcard", "mistake", "formula", "lecture", "chapter", "event"];

function normalizeAction(value: unknown): AIAction | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const type = text(raw.type, 24).toLowerCase();
  const title = text(raw.title, 240);
  if (type === "task" && title) {
    const priority = text(raw.priority, 16);
    return { type, title, description: text(raw.description), priority: ["low", "medium", "high", "urgent"].includes(priority) ? priority as "low" | "medium" | "high" | "urgent" : "medium", dueDate: date(raw.dueDate), tags: list(raw.tags), estimatedMinutes: Math.max(0, Math.min(1440, Number(raw.estimatedMinutes) || 0)) || undefined, subtasks: list(raw.subtasks) };
  }
  if (type === "flashcard") {
    const front = text(raw.front), back = text(raw.back);
    return front && back ? { type, front, back, subject: text(raw.subject, 120) || undefined } : null;
  }
  if (type === "backlog" && title) return { type, title, chapter: text(raw.chapter, 180) || undefined, dueDate: date(raw.dueDate), itemType: text(raw.itemType, 30) || "Lecture", priority: Math.max(1, Math.min(5, Number(raw.priority) || 3)), notes: text(raw.notes) || undefined };
  if (type === "note" && title) return { type, title, content: text(raw.content) || "", folder: text(raw.folder, 120) || undefined, tags: list(raw.tags) };
  if (type === "calendar" && title && date(raw.date)) {
    const eventType = text(raw.eventType, 20);
    return { type, title, date: date(raw.date)!, eventType: ["exam", "lecture", "revision", "other"].includes(eventType) ? eventType as "exam" | "lecture" | "revision" | "other" : "other", reminder: Math.max(0, Math.min(10080, Number(raw.reminder) || 15)), location: text(raw.location, 300) || undefined, notes: text(raw.notes) || undefined };
  }
  if (type === "lecture" && title) return { type, title, subject: text(raw.subject, 120) || undefined, chapter: text(raw.chapter, 180) || undefined };
  if (type === "mistake" && (title || text(raw.question, 240))) {
    const question = text(raw.question, 240) || title;
    return { type, question, myAnswer: text(raw.myAnswer) || undefined, correction: text(raw.correction, 5000) || undefined, subject: text(raw.subject, 120) || undefined };
  }
  if (type === "formula" && title) {
    const formula = text(raw.formula, 2000) || text(raw.content, 2000);
    return formula ? { type, title, formula, note: text(raw.note, 2000) || undefined, subject: text(raw.subject, 120) || undefined } : null;
  }
  if (type === "delete" && title) {
    const target = text(raw.target, 24).toLowerCase() as DeleteTarget;
    return DELETE_TARGETS.includes(target) ? { type, target, title, subject: text(raw.subject, 120) || undefined, chapter: text(raw.chapter, 180) || undefined } : null;
  }
  return null;
}

export function parseAIActions(reply: string): { message: string; actions: AIAction[] } {
  const match = reply.match(ACTION_BLOCK);
  if (!match) return { message: reply, actions: [] };
  try {
    const parsed = JSON.parse(match[1]) as { actions?: unknown[] };
    const actions = Array.isArray(parsed.actions) ? parsed.actions.map(normalizeAction).filter((action): action is AIAction => !!action).slice(0, 20) : [];
    return { message: reply.replace(ACTION_BLOCK, "").trim(), actions };
  } catch {
    return { message: reply, actions: [] };
  }
}

export function actionLabel(action: AIAction): string {
  if (action.type === "flashcard") return `Flashcard: ${action.front}`;
  if (action.type === "calendar") return `Calendar: ${action.title} — ${action.date}`;
  if (action.type === "backlog") return `Backlog: ${action.title}`;
  if (action.type === "note") return `Note: ${action.title}`;
  if (action.type === "lecture") return `Lecture: ${action.title}${action.chapter ? ` (${action.chapter})` : ""}`;
  if (action.type === "mistake") return `Mistake: ${action.question}`;
  if (action.type === "formula") return `Formula: ${action.title} — ${action.formula}`;
  if (action.type === "delete") return `Delete ${action.target}: ${action.title}`;
  return `Task: ${action.title}`;
}

const eq = (a: unknown, b: string) => typeof a === "string" && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Apply only the actions the user explicitly approved in the AI preview. */
export function applyAIActions(actions: AIAction[]): number {
  let applied = 0;
  const store = useAppStore.getState();
  for (const action of actions) {
    if (action.type === "task") {
      store.addTask({ title: action.title, description: action.description, priority: action.priority || "medium", status: "todo", dueDate: action.dueDate, tags: action.tags || [], estimatedMinutes: action.estimatedMinutes, subtasks: (action.subtasks || []).map((title) => ({ id: uid("st_"), title, completed: false })), userId: store.user?.id || "local" });
    } else if (action.type === "flashcard") {
      const existing = readArray("studyos_revision_flashcards_v1");
      persistStore("studyos_revision_flashcards_v1", [{ id: uid("fc_"), front: action.front, back: action.back, subject: action.subject, step: 0, nextReview: new Date().toISOString(), reviewCount: 0, createdAt: new Date().toISOString() }, ...existing]);
    } else if (action.type === "backlog") {
      const existing = readArray("studyos_backlog_v1");
      persistStore("studyos_backlog_v1", [{ id: uid("b_"), title: action.title, chapter: action.chapter, dueDate: action.dueDate || null, type: action.itemType || "Lecture", status: "pending", priority: action.priority || 3, reminder: null, notes: action.notes }, ...existing]);
    } else if (action.type === "note") {
      const current = readObject("studyos_notes_v1");
      const notes = Array.isArray(current.notes) ? current.notes : [];
      const folders = Array.isArray(current.folders) ? current.folders : [];
      if (action.folder && !folders.includes(action.folder)) folders.unshift(action.folder);
      persistStore("studyos_notes_v1", { ...current, notes: [{ id: uid("n_"), title: action.title, content: action.content, mode: "markdown", folder: action.folder, tags: action.tags || [], bookmarked: false, attachments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...notes], folders });
    } else if (action.type === "calendar") {
      const events = readArray("studyos_calendar_events_v1");
      persistStore("studyos_calendar_events_v1", [{ id: uid("event_"), title: action.title, date: action.date, type: action.eventType || "other", color: "primary", reminder: action.reminder ?? 15, location: action.location, notes: action.notes }, ...events]);
    } else if (action.type === "lecture") {
      applyLectureAction(action);
    } else if (action.type === "mistake") {
      const existing = readArray("studyos_revision_mistakes_v1");
      persistStore("studyos_revision_mistakes_v1", [{ id: uid("m_"), question: action.question, myAnswer: action.myAnswer, correction: action.correction || "", subject: action.subject, resolved: false, createdAt: new Date().toISOString() }, ...existing]);
    } else if (action.type === "formula") {
      const existing = readArray("studyos_revision_formulas_v1");
      persistStore("studyos_revision_formulas_v1", [{ id: uid("f_"), title: action.title, formula: action.formula, note: action.note, subject: action.subject, bookmarked: false, createdAt: new Date().toISOString() }, ...existing]);
    } else if (action.type === "delete") {
      if (!applyDeleteAction(action)) continue; // nothing matched — don't count it
    }
    applied += 1;
  }
  if (applied) {
    window.dispatchEvent(
      new CustomEvent("studyos-data-changed", { detail: { source: "ai", count: applied } }),
    );
  }
  return applied;
}

/** Add a lecture to the Lecture Tracker, creating its chapter/subject when new. */
function applyLectureAction(action: Extract<AIAction, { type: "lecture" }>) {
  const subject = action.subject || "General";
  const chapterName = action.chapter || "Untitled chapter";
  const chapters = readArray("studyos_lecture_tracker_v1");
  let chapter = chapters.find((c) => eq(c?.subject, subject) && eq(c?.name, chapterName));
  if (!chapter) {
    chapter = { id: uid("chapter_"), subject, name: chapterName, lectures: [] };
    chapters.push(chapter);
  }
  chapter.lectures = Array.isArray(chapter.lectures) ? chapter.lectures : [];
  chapter.lectures.push({ id: uid("lecture_"), title: action.title, status: "pending", bookmarked: false, notes: "" });
  persistStore("studyos_lecture_tracker_v1", chapters);
  const subjects = readArray("studyos_lecture_subjects_v1").filter((s) => typeof s === "string");
  if (!subjects.some((s) => eq(s, subject))) subjects.push(subject);
  persistStore("studyos_lecture_subjects_v1", subjects);
}

/** Delete items that match the action's title exactly (case-insensitive).
 *  Returns true when at least one item was removed. */
function applyDeleteAction(action: Extract<AIAction, { type: "delete" }>): boolean {
  const title = action.title;
  const store = useAppStore.getState();
  const filterArray = (key: string, match: (item: any) => boolean) => {
    const existing = readArray(key);
    const kept = existing.filter((item) => !match(item));
    const removed = kept.length !== existing.length;
    if (removed) persistStore(key, kept);
    return removed;
  };
  switch (action.target) {
    case "task": {
      const ids = store.tasks.filter((task) => eq(task.title, title)).map((task) => task.id);
      ids.forEach((id) => store.deleteTask(id));
      return ids.length > 0;
    }
    case "backlog":
      return filterArray("studyos_backlog_v1", (item) => eq(item?.title, title));
    case "note":
      return filterArray("studyos_notes_v1", (item) => eq(item?.title, title)) || (() => {
        // notes live inside an object, not a bare array
        const current = readObject("studyos_notes_v1");
        const notes = Array.isArray(current.notes) ? current.notes : [];
        const kept = notes.filter((note) => !eq(note?.title, title));
        if (kept.length === notes.length) return false;
        persistStore("studyos_notes_v1", { ...current, notes: kept });
        return true;
      })();
    case "flashcard":
      return filterArray("studyos_revision_flashcards_v1", (item) => eq(item?.front, title));
    case "mistake":
      return filterArray("studyos_revision_mistakes_v1", (item) => eq(item?.question, title));
    case "formula":
      return filterArray("studyos_revision_formulas_v1", (item) => eq(item?.title, title));
    case "event":
      return filterArray("studyos_calendar_events_v1", (item) => eq(item?.title, title));
    case "lecture": {
      const chapters = readArray("studyos_lecture_tracker_v1");
      let removed = false;
      for (const chapter of chapters) {
        if (action.chapter && !eq(chapter?.name, action.chapter)) continue;
        if (action.subject && !eq(chapter?.subject, action.subject)) continue;
        const lectures = Array.isArray(chapter?.lectures) ? chapter.lectures : [];
        const kept = lectures.filter((lecture: any) => !eq(lecture?.title, title));
        if (kept.length !== lectures.length) {
          chapter.lectures = kept;
          removed = true;
        }
      }
      if (removed) persistStore("studyos_lecture_tracker_v1", chapters);
      return removed;
    }
    case "chapter": {
      const chapters = readArray("studyos_lecture_tracker_v1");
      const kept = chapters.filter((chapter) => !(eq(chapter?.name, title) && (!action.subject || eq(chapter?.subject, action.subject))));
      if (kept.length === chapters.length) return false;
      persistStore("studyos_lecture_tracker_v1", kept);
      return true;
    }
    default:
      return false;
  }
}

function readArray(key: string): any[] {
  try { const parsed = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function readObject(key: string): Record<string, any> {
  try { const parsed = JSON.parse(localStorage.getItem(key) || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}
