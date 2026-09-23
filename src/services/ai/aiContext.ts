/**
 * Builds a compact snapshot of everything the user has in StudyOS so the
 * AI assistant can personalize answers: tasks, backlog, notes, module
 * tracker, lectures, focus stats and app-blocker rules.
 * Everything is read from the same localStorage stores the modules use,
 * so it works offline and needs no extra bookkeeping.
 */

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface StudyContext {
  /** compact text summary injected into the AI system prompt */
  summary: string;
  stats: {
    backlogPending: number;
    backlogOverdue: number;
    notesCount: number;
    modulePercent: number;
    moduleRemaining: number;
    focusMinutesToday: number;
    streakDays: number;
  };
}

export function buildStudyContext(): StudyContext {
  const today = new Date().toISOString().slice(0, 10);

  // ---- backlog ----
  type BacklogItem = {
    title: string;
    chapter?: string;
    dueDate?: string | null;
    type?: string;
    status: string;
    priority?: number;
  };
  const backlog = readLS<BacklogItem[]>("studyos_backlog_v1", []);
  const pending = backlog.filter((b) => b.status === "pending");
  const overdue = pending.filter(
    (b) => b.dueDate && b.dueDate < today,
  );

  // ---- notes ----
  const notesStore = readLS<{ notes?: any[] }>("studyos_notes_v1", {});
  const notes = notesStore.notes || [];

  // ---- module tracker ----
  type Chapter = { name: string; items: { status: string; title: string; type: string }[] };
  const chapters = readLS<Chapter[]>("studyos_module_tracker_v1", []);
  const allItems = chapters.flatMap((c) => c.items);
  const moduleTotal = allItems.length;
  const moduleDone = allItems.filter((i) => i.status === "completed").length;
  const modulePercent = moduleTotal
    ? Math.round((moduleDone / moduleTotal) * 100)
    : 0;

  // ---- focus ----
  const focus = readLS<any>("studyos_focus_v1", {});
  const focusMinutesToday = Math.round(Number(focus?.minutesToday || focus?.todayMinutes || 0));
  const streakDays = Number(focus?.streak || focus?.streakDays || 0);

  // ---- blocker ----
  type Rule = { name: string; kind: string; target: string; dailyLimitMin: number; enabled: boolean };
  const rules = readLS<Rule[]>("studyos_blocker_rules_v1", []).filter((r) => r.enabled);

  // ---- summary text ----
  const lines: string[] = [];
  lines.push(`Today's date: ${today}`);
  lines.push(
    `Focus: ${focusMinutesToday} min studied today, streak ${streakDays} days.`,
  );
  lines.push(
    `Module tracker: ${moduleDone}/${moduleTotal} items done (${modulePercent}%), ${moduleTotal - moduleDone} remaining across ${chapters.length} chapters.`,
  );
  if (pending.length) {
    lines.push(
      `Backlog: ${pending.length} pending (${overdue.length} overdue). Top items by priority:`,
    );
    [...pending]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 8)
      .forEach((b) =>
        lines.push(
          `- [${b.type || "Lecture"}] ${b.title}${b.chapter ? ` (${b.chapter})` : ""} — due ${b.dueDate || "none"}, P${b.priority || 3}${b.dueDate && b.dueDate < today ? ", OVERDUE" : ""}`,
        ),
      );
  } else {
    lines.push("Backlog: empty.");
  }
  if (notes.length) {
    lines.push(
      `Notes: ${notes.length} total. Recent: ${notes
        .slice(0, 5)
        .map((n: any) => n.title)
        .join(", ")}.`,
    );
  }
  if (chapters.length) {
    lines.push(
      `Chapters: ${chapters
        .map(
          (c) =>
            `${c.name} (${c.items.filter((i) => i.status === "completed").length}/${c.items.length})`,
        )
        .join(", ")}.`,
    );
  }
  if (rules.length) {
    lines.push(
      `App blocker active on: ${rules
        .map(
          (r) =>
            `${r.name} (${r.kind}, ${r.dailyLimitMin === 0 ? "always blocked" : r.dailyLimitMin + "min/day"})`,
        )
        .join(", ")}.`,
    );
  }

  return {
    summary: lines.join("\n"),
    stats: {
      backlogPending: pending.length,
      backlogOverdue: overdue.length,
      notesCount: notes.length,
      modulePercent,
      moduleRemaining: moduleTotal - moduleDone,
      focusMinutesToday,
      streakDays,
    },
  };
}
