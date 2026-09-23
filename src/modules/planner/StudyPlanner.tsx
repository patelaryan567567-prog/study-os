import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Check,
  Trash,
  Calendar,
  Clock,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils";
import { persistStore } from "@/services/appDataSync";

/**
 * Study Planner
 * ------------
 * Daily / Weekly / Monthly planning with subjects, chapters & topics, plus mock
 * test and PYQ scheduling. Overdue pending items are automatically rolled over
 * to today ("auto rescheduling"). Data persists to localStorage.
 */

type PlanType = "study" | "revision" | "mock" | "pyq" | "exam";

interface PlanItem {
  id: string;
  title: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  type: PlanType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  duration?: number; // minutes
  status: "pending" | "completed" | "skipped";
  rescheduled?: boolean;
  createdAt: string;
  completedAt?: string;
}

type View = "day" | "week" | "month";

const STORAGE_KEY = "studyos_planner_v1";

const TYPE_META: Record<PlanType, { label: string; color: string }> = {
  study: { label: "Study", color: "#8b5cf6" },
  revision: { label: "Revision", color: "#06b6d4" },
  mock: { label: "Mock Test", color: "#f59e0b" },
  pyq: { label: "PYQ", color: "#f472b6" },
  exam: { label: "Exam", color: "#ef4444" },
};

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function todayISO(): string {
  return toISODate(new Date());
}

/** Week start (Monday) of the week containing the given date. */
function weekStartISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(dateISO, diff);
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}


export function StudyPlanner() {
  const [items, setItems] = useState<PlanItem[]>(() => {
    // Hydrate synchronously so the persist effect below can never overwrite
    // saved plans with the empty initial state on mount.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      /* ignore corrupted storage */
      return [];
    }
  });
  const [view, setView] = useState<View>("day");
  const [baseDate, setBaseDate] = useState(todayISO());
  const [query, setQuery] = useState("");

  // New-item form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<PlanType>("study");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");

  // Auto-reschedule: roll overdue pending items into today (once per mount).
  const rescheduledRef = useRef(false);
  useEffect(() => {
    if (rescheduledRef.current) return;
    rescheduledRef.current = true;
    setItems((prev) => {
      const today = todayISO();
      let changed = false;
      const next = prev.map((it) => {
        if (it.status === "pending" && it.date < today) {
          changed = true;
          return { ...it, date: today, rescheduled: true };
        }
        return it;
      });
      return changed ? next : prev;
    });
  }, []);

  // Persist to localStorage + the cloud (debounced) so plans sync across devices.
  useEffect(() => {
    persistStore(STORAGE_KEY, items);
  }, [items]);

  // The login/periodic sync writes restored data straight to localStorage —
  // reload when it lands so a fresh device shows the account's plans without a
  // page refresh (the desktop shell never hard-reloads).
  useEffect(() => {
    const reload = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {
        /* ignore corrupted storage */
      }
    };
    window.addEventListener("studyos-data-changed", reload);
    return () => window.removeEventListener("studyos-data-changed", reload);
  }, []);

  const today = todayISO();

  const filtered = useMemo(() => {
    let list = items;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((it) =>
        [it.title, it.subject, it.chapter, it.topic]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [items, query]);

  const addItem = () => {
    if (!title.trim()) return;
    const it: PlanItem = {
      id: uid("p_"),
      title: title.trim(),
      subject: subject.trim() || undefined,
      chapter: chapter.trim() || undefined,
      topic: topic.trim() || undefined,
      type,
      date: date || today,
      time: time || undefined,
      duration: Number(duration) > 0 ? Number(duration) : undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setItems((s) => [it, ...s]);
    setTitle("");
    setSubject("");
    setChapter("");
    setTopic("");
    setTime("");
    setDuration("");
    setShowForm(false);
  };

  const setStatus = (id: string, status: PlanItem["status"]) =>
    setItems((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              completedAt:
                status === "completed" ? new Date().toISOString() : undefined,
            }
          : item,
      ),
    );

  const removeItem = (id: string) =>
    setItems((items) => items.filter((item) => item.id !== id));

// Metrics
  const todayItems = filtered.filter((it) => it.date === today);
  const completedToday = todayItems.filter(
    (it) => it.status === "completed",
  ).length;
  const pendingToday = todayItems.filter(
    (it) => it.status === "pending",
  ).length;
  const rescheduledCount = items.filter((it) => it.rescheduled).length;
  const weekRange = useMemo(() => {
    const start = weekStartISO(baseDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [baseDate]);
  const weekCompleted = weekRange.reduce(
    (acc, d) =>
      acc +
      items.filter((it) => isSameDay(it.date, d) && it.status === "completed")
        .length,
    0,
  );
  const weekTotal = weekRange.reduce(
    (acc, d) => acc + items.filter((it) => it.date === d).length,
    0,
  );
  const overallProgress =
    items.length === 0
      ? 0
      : Math.round(
          (items.filter((it) => it.status === "completed").length /
            items.length) *
            100,
        );

  const shiftDay = (dir: number) => setBaseDate((d) => addDays(d, dir));
  const shiftWeek = (dir: number) => setBaseDate((d) => addDays(d, dir * 7));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Study Planner</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Plan your day, week and month. Missed items auto-reschedule to
            today.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Add Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Today's Tasks
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {pendingToday}
            <span className="text-sm font-normal text-[var(--color-text-muted)]">
              {" "}
              pending
            </span>
          </p>
          <p className="text-xs text-[var(--color-success)]">
            {completedToday} completed
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Week Completion
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {weekTotal === 0
              ? "—"
              : `${Math.round((weekCompleted / weekTotal) * 100)}%`}
          </p>
          <div className="mt-2">
            <Progress
              value={
                weekTotal === 0 ? 0 : (weekCompleted / weekTotal) * 100
              }
              size="sm"
              color="var(--color-success)"
            />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Auto Rescheduled
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {rescheduledCount}
          </p>
          <p className="text-xs text-[var(--color-warning)]">missed → today</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Overall Progress
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {overallProgress}%
          </p>
          <div className="mt-2">
            <Progress value={overallProgress} size="sm" />
          </div>
        </GlassCard>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all",
                view === v
                  ? "bg-primary-500/20 text-primary-300"
                  : "text-[var(--color-text-muted)] hover:text-white",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (view === "week" ? shiftWeek(-1) : shiftDay(-1))}
          >
            ‹ Prev
          </Button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-white">
            {new Date(`${baseDate}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (view === "week" ? shiftWeek(1) : shiftDay(1))}
          >
            Next ›
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBaseDate(todayISO())}
          >
            Today
          </Button>
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plans..."
          className="ml-auto w-48"
        />
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Newton's Laws"
            />
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Physics"
            />
            <Input
              label="Chapter"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="Chapter 5"
            />
            <Input
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Friction"
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                Type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlanType)}
                className="h-[50px] rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-primary-500"
              >
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k} className="bg-gray-900">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              type="time"
              label="Time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <Input
              type="number"
              label="Duration (min)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addItem} disabled={!title.trim()}>
              <Plus size={16} /> Add
            </Button>
          </div>
        </motion.div>
      )}

{/* Content */}
      {view === "day" && (
        <DayView items={todayItems} onStatus={setStatus} onDelete={removeItem} />
      )}
      {view === "week" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
          {weekRange.map((d) => {
            const dayItems = items.filter((it) => it.date === d);
            const isToday = d === today;
            return (
              <GlassCard
                key={d}
                className={cn("p-3", isToday && "ring-1 ring-primary-500/40")}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {dayItems.filter((it) => it.status === "completed").length}/
                    {dayItems.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayItems.length === 0 && (
                    <p className="py-3 text-center text-xs text-[var(--color-text-muted)]">
                      —
                    </p>
                  )}
                  {dayItems.slice(0, 4).map((it) => (
                    <div
                      key={it.id}
                      className={cn(
                        "rounded-lg border border-white/5 bg-white/5 px-2 py-1.5 text-xs",
                        it.status === "completed" && "opacity-50",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: TYPE_META[it.type].color }}
                        />
                        <span className="truncate text-[var(--color-text-primary)]">
                          {it.title}
                        </span>
                      </div>
                      {it.time && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {it.time}
                        </span>
                      )}
                    </div>
                  ))}
                  {dayItems.length > 4 && (
                    <p className="text-center text-[10px] text-[var(--color-text-muted)]">
                      +{dayItems.length - 4} more
                    </p>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
      {view === "month" && (
        <MonthView items={items} onDateSelect={setBaseDate} />
      )}
    </div>
  );
}
/* ── Day view: full task list for the selected date ── */
function DayView({
  items,
  onStatus,
  onDelete,
}: {
  items: PlanItem[];
  onStatus: (id: string, s: PlanItem["status"]) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={40} />}
        title="Nothing scheduled"
        description="Add a study, revision, mock test or PYQ plan to get started."
      />
    );
  }

  // Sort: pending first, then by time
  const sorted = [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return (a.time || "").localeCompare(b.time || "");
  });

  return (
    <div className="space-y-3">
      {sorted.map((it) => {
        const meta = TYPE_META[it.type];
        return (
          <motion.div
            key={it.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4",
              it.status === "completed" && "opacity-60",
            )}
          >
            <div
              className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-md border"
              style={{ borderColor: meta.color }}
            >
              {it.status === "completed" && (
                <Check size={12} style={{ color: "var(--color-success)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  {meta.label}
                </span>
                {it.rescheduled && (
                  <span className="rounded bg-[rgba(245,158,11,0.15)] px-1.5 py-0.5 text-[10px] text-[var(--color-warning)]">
                    Rescheduled
                  </span>
                )}
                <h3
                  className={cn(
                    "text-sm font-semibold text-white",
                    it.status === "completed" && "line-through",
                  )}
                >
                  {it.title}
                </h3>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                {it.subject && <span>📚 {it.subject}</span>}
                {it.chapter && <span>📖 {it.chapter}</span>}
                {it.topic && <span>🔖 {it.topic}</span>}
                {it.time && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {it.time}
                  </span>
                )}
                {it.duration && <span>⏱ {it.duration} min</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant="success"
                size="icon"
                onClick={() => onStatus(it.id, "completed")}
                title="Complete"
              >
                <Check size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(it.id)}
                title="Delete"
              >
                <Trash size={15} />
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Month view: calendar grid with per-day completion counts ── */
function MonthView({
  items,
  onDateSelect,
}: {
  items: PlanItem[];
  onDateSelect: (date: string) => void;
}) {
  const base = todayISO();
  const first = new Date(`${base}T00:00:00`);
  first.setDate(1);
  const firstDayIndex = first.getDay(); // leading blanks for Monday-start
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  // Pad with nulls so Monday lands in the first column.
  const lead = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `date-${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(
        2,
        "0",
      )}`,
    );
  }

  const byDate = (cell: string) =>
    `${cell.slice(5, 9)}-${cell.slice(10, 12)}-${cell.slice(13, 15)}`;

  return (
    <GlassCard className="p-5">
      <h2 className="mb-3 text-lg font-bold text-white">
        {first.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </h2>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--color-text-muted)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, i) => {
          if (!c) return <div key={`blank-${i}`} />;
          const iso = byDate(c);
          const dayItems = items.filter((it) => it.date === iso);
          const day = Number(c.slice(13, 15));
          const isToday = iso === todayISO();
          return (
            <button
              key={c}
              onClick={() => onDateSelect(iso)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10",
                dayItems.length > 0 && "border-primary-500/30",
                isToday && "bg-primary-500/20",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  isToday ? "text-primary-300" : "text-white",
                )}
              >
                {day}
              </span>
              {dayItems.length > 0 && (
                <span className="mt-1 text-[10px] text-[var(--color-warning)]">
                  {dayItems.filter((it) => it.status === "completed").length}/
                  {dayItems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default StudyPlanner;
