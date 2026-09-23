import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CircularProgress } from "@/components/ui/Progress";
import {
  Plus,
  Check,
  Clock,
  Trash,
  Edit,
  Search,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStore, persistStore } from "@/services/appDataSync";

type BacklogItem = {
  id: string;
  chapter?: string;
  title: string;
  dueDate?: string | null; // ISO date (yyyy-mm-dd)
  type?: string; // e.g., Lecture, Revision, Module
  status: "pending" | "completed" | "missed" | "skipped";
  priority?: number; // 1-5
  reminder?: string | null;
  notes?: string;
};

type StatusFilter = "all" | "pending" | "completed" | "skipped";
type SortMode = "priority" | "due" | "recent";

const STORAGE_KEY = "studyos_backlog_v1";

const TYPES = ["Lecture", "Revision", "Module", "Assignment"] as const;

const TYPE_COLORS: Record<string, string> = {
  Lecture: "bg-blue-500/15 text-blue-400",
  Revision: "bg-purple-500/15 text-purple-400",
  Module: "bg-emerald-500/15 text-emerald-400",
  Assignment: "bg-amber-500/15 text-amber-400",
};

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function daysUntil(due: string | null | undefined) {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function formatDue(due: string | null | undefined) {
  if (!due) return "No due date";
  const diff = daysUntil(due)!;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff <= 7) return `In ${diff} days`;
  return new Date(due + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(it: BacklogItem) {
  return (
    it.status === "pending" &&
    daysUntil(it.dueDate) !== null &&
    daysUntil(it.dueDate)! < 0
  );
}

const GROUP_COLORS: Record<string, string> = {
  overdue: "text-red-400",
  today: "text-emerald-400",
  tomorrow: "text-cyan-400",
  upcoming: "text-purple-400",
  nodate: "text-[var(--color-text-muted)]",
};

const GROUP_CHIP: Record<string, string> = {
  overdue: "bg-red-500/15 text-red-400",
  today: "bg-emerald-500/15 text-emerald-400",
  tomorrow: "bg-cyan-500/15 text-cyan-400",
  upcoming: "bg-purple-500/15 text-purple-400",
};

export function BacklogManager() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [chapter, setChapter] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Lecture");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(3);

  // Viewing state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [notesOpen, setNotesOpen] = useState<{ id: string } | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [editOpen, setEditOpen] = useState<BacklogItem | null>(null);

  useEffect(() => {
    loadStore<BacklogItem[]>(STORAGE_KEY, []).then((data) => {
      if (data.length) setItems(data);
    });
  }, []);

  // AI additions write to storage directly — reload when they land.
  useEffect(() => {
    const reload = () => {
      loadStore<BacklogItem[]>(STORAGE_KEY, []).then((data) => {
        if (data.length) setItems(data);
      });
    };
    window.addEventListener("studyos-data-changed", reload);
    return () => window.removeEventListener("studyos-data-changed", reload);
  }, []);

  useEffect(() => {
    persistStore(STORAGE_KEY, items);
  }, [items]);

  const addItem = () => {
    if (!title.trim()) return;
    const it: BacklogItem = {
      id: uid("b_"),
      chapter: chapter.trim() || undefined,
      title: title.trim(),
      dueDate: dueDate || null,
      type: type || "Lecture",
      status: "pending",
      priority: Math.max(1, Math.min(5, Number(priority) || 3)),
      reminder: null,
    };
    setItems((s) => [it, ...s]);
    setTitle("");
    setChapter("");
    setDueDate("");
    setPriority(3);
  };

  const updateItem = (id: string, patch: Partial<BacklogItem>) =>
    setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) =>
    setItems((s) => s.filter((i) => i.id !== id));

  const todayISO = new Date().toISOString().slice(0, 10);
  const tomorrowISO = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const metrics = useMemo(() => {
    const remaining = items.filter((i) => i.status === "pending").length;
    const missed = items.filter(isOverdue).length;
    const todaysPending = items.filter(
      (i) => i.status === "pending" && i.dueDate === todayISO,
    ).length;
    const tomorrowsPending = items.filter(
      (i) => i.status === "pending" && i.dueDate === tomorrowISO,
    ).length;
    const pendingRevision = items.filter(
      (i) =>
        i.status === "pending" && i.type?.toLowerCase().includes("revision"),
    ).length;
    const estimatedDays = remaining; // naive: 1 per day
    const estCompletion = (() => {
      if (remaining === 0) return todayISO;
      const d = new Date();
      d.setDate(d.getDate() + estimatedDays);
      return d.toISOString().slice(0, 10);
    })();
    return {
      remaining,
      missed,
      todaysPending,
      tomorrowsPending,
      pendingRevision,
      estCompletion,
    };
  }, [items, todayISO, tomorrowISO]);

  // Filter + search + sort
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => {
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (statusFilter === "pending" && it.status === "missed") return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (
        q &&
        !(
          it.title.toLowerCase().includes(q) ||
          (it.chapter || "").toLowerCase().includes(q) ||
          (it.notes || "").toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortMode === "priority") return (b.priority || 0) - (a.priority || 0);
      if (sortMode === "due") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.id.localeCompare(a.id); // recent
    });
    return list;
  }, [items, query, statusFilter, typeFilter, sortMode]);

  // Group pending items by bucket for a scannable view
  const groups = useMemo(() => {
    if (statusFilter !== "pending" || sortMode === "priority") {
      return [{ key: "items", label: "", list: visible }];
    }
    const overdue: BacklogItem[] = [];
    const today: BacklogItem[] = [];
    const tomorrow: BacklogItem[] = [];
    const upcoming: BacklogItem[] = [];
    const noDate: BacklogItem[] = [];
    for (const it of visible) {
      const d = daysUntil(it.dueDate);
      if (d === null) noDate.push(it);
      else if (d < 0) overdue.push(it);
      else if (d === 0) today.push(it);
      else if (d === 1) tomorrow.push(it);
      else upcoming.push(it);
    }
    return [
      { key: "overdue", label: "Overdue", list: overdue },
      { key: "today", label: "Today", list: today },
      { key: "tomorrow", label: "Tomorrow", list: tomorrow },
      { key: "upcoming", label: "Upcoming", list: upcoming },
      { key: "nodate", label: "No due date", list: noDate },
    ].filter((g) => g.list.length > 0);
  }, [visible, statusFilter, sortMode]);

  const toggleGroup = (key: string) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  const editItem = editOpen ? items.find((i) => i.id === editOpen.id) : null;

  return (
    <div className="space-y-6">
      <Card
        padding="lg"
        className="flex flex-wrap items-center justify-between gap-4 glow-border-blue"
      >
        <div>
          <h3 className="text-2xl font-bold gradient-title">Backlog</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage lectures, modules & tasks
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-20">
            <CircularProgress
              value={
                items.length
                  ? Math.round(
                      ((items.length - metrics.remaining) / items.length) * 100,
                    )
                  : 0
              }
              size={72}
              strokeWidth={6}
            >
              <div className="text-xs text-[var(--color-text-muted)]">
                {items.length
                  ? Math.round(
                      ((items.length - metrics.remaining) / items.length) * 100,
                    )
                  : 0}
                %
              </div>
            </CircularProgress>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            <div>Remaining: {metrics.remaining}</div>
            <div>Missed: {metrics.missed}</div>
            <div>Est. done: {metrics.estCompletion}</div>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Chapter (optional)"
            className="min-w-0 w-full"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
          <Input
            placeholder="Title (e.g. Lecture 1)"
            className="min-w-0 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <select
            className="glass w-full min-w-0 rounded-xl px-3 py-2.5"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-1">
            <Input
              type="date"
              className="min-w-0 flex-1 basis-28"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <select
              className="glass shrink-0 rounded-xl px-3 py-2.5"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
              <option value={4}>P4</option>
              <option value={5}>P5</option>
            </select>
            <Button variant="primary" className="shrink-0" onClick={addItem}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card
          padding="md"
          className="glow-border-green accent-left flex flex-col gap-1"
          style={{
            ["--accent-top" as string]: "#34d399",
            ["--accent-bottom" as string]: "#22d3ee",
          }}
        >
          <h4 className="text-sm font-semibold text-emerald-400">
            Today's Pending
          </h4>
          <p className="text-3xl font-bold text-emerald-300">
            {metrics.todaysPending}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            items due today
          </p>
        </Card>
        <Card
          padding="md"
          className="glow-border-cyan accent-left flex flex-col gap-1"
          style={{
            ["--accent-top" as string]: "#22d3ee",
            ["--accent-bottom" as string]: "#60a5fa",
          }}
        >
          <h4 className="text-sm font-semibold text-cyan-400">
            Tomorrow's Pending
          </h4>
          <p className="text-3xl font-bold text-cyan-300">
            {metrics.tomorrowsPending}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            items due tomorrow
          </p>
        </Card>
        <Card
          padding="md"
          className="glow-border-purple accent-left flex flex-col gap-1"
          style={{
            ["--accent-top" as string]: "#c084fc",
            ["--accent-bottom" as string]: "#f472b6",
          }}
        >
          <h4 className="text-sm font-semibold text-purple-400">
            Pending Revision
          </h4>
          <p className="text-3xl font-bold text-purple-300">
            {metrics.pendingRevision}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            revision items
          </p>
        </Card>
      </div>

      {/* Viewing controls: search, filters, sort */}
      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            />
            <input
              className="glass rounded-xl pl-9 pr-3 py-2 w-full bg-transparent outline-none"
              placeholder="Search backlog (title, chapter, notes)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl overflow-hidden glass">
            {(["pending", "completed", "skipped", "all"] as StatusFilter[]).map(
              (s) => (
                <button
                  key={s}
                  className={`px-3 py-2 text-xs capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-muted)] hover:bg-white/5"
                  }`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ),
            )}
          </div>
          <select
            className="glass rounded-xl px-3 py-2 text-xs"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="glass rounded-xl px-3 py-2 text-xs"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="priority">Sort: Priority</option>
            <option value="due">Sort: Due date</option>
            <option value="recent">Sort: Recently added</option>
          </select>
        </div>
      </Card>

      <div className="space-y-6">
        {visible.length === 0 && (
          <Card padding="md">
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
              No items match the current filters.
            </p>
          </Card>
        )}
        {groups.map((g) => (
          <div key={g.key}>
            {g.label && (
              <button
                className="flex items-center gap-2 w-full text-left mb-2 group"
                onClick={() => toggleGroup(g.key)}
              >
                {g.key === "overdue" && (
                  <AlertTriangle size={14} className="text-red-400" />
                )}
                <span
                  className={`text-sm font-semibold ${GROUP_COLORS[g.key] || ""}`}
                >
                  {g.label}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${GROUP_CHIP[g.key] || "bg-white/5 text-[var(--color-text-muted)]"}`}
                >
                  {g.list.length}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
                  {collapsed[g.key] ? "Show ▸" : "Hide ▾"}
                </span>
              </button>
            )}
            <AnimatePresence>
              {!collapsed[g.key] && (
                <div className="space-y-3">
                  {g.list.map((it) => {
                    const overdue = isOverdue(it);
                    return (
                      <motion.div
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`glass rounded-xl p-4 flex items-start justify-between gap-3 accent-left hover-glow ${
                          overdue ? "glow-border-red" : "glow-border-blue"
                        } ${it.status === "completed" ? "opacity-60" : ""}`}
                        style={{
                          ["--accent-top" as string]: overdue
                            ? "#f87171"
                            : it.type === "Revision"
                              ? "#c084fc"
                              : it.type === "Assignment"
                                ? "#fbbf24"
                                : "#60a5fa",
                          ["--accent-bottom" as string]: overdue
                            ? "#fb923c"
                            : "#34d399",
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            {it.status === "completed" && (
                              <Check
                                size={14}
                                className="text-[var(--color-success)]"
                              />
                            )}
                            <h5
                              className={`font-semibold ${
                                it.status === "completed" ? "line-through" : ""
                              }`}
                            >
                              {it.title}
                            </h5>
                            {it.chapter && (
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {it.chapter}
                              </span>
                            )}
                            {it.type && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  TYPE_COLORS[it.type] ||
                                  "bg-white/5 text-[var(--color-text-muted)]"
                                }`}
                              >
                                {it.type}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-xs mt-1 flex items-center gap-2 ${
                              overdue
                                ? "text-[var(--color-danger)]"
                                : "text-[var(--color-text-muted)]"
                            }`}
                          >
                            <span>Due: {formatDue(it.dueDate)}</span>
                            <span>• P{it.priority}</span>
                            {it.status !== "pending" && (
                              <span className="capitalize">• {it.status}</span>
                            )}
                          </div>
                          {it.notes && (
                            <p className="mt-2 text-sm text-[var(--color-text-muted)] line-clamp-2">
                              {it.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {it.status !== "completed" ? (
                            <Button
                              size="icon"
                              variant="success"
                              title="Mark complete"
                              onClick={() =>
                                updateItem(it.id, { status: "completed" })
                              }
                            >
                              <Check size={14} />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Mark pending again"
                              onClick={() =>
                                updateItem(it.id, { status: "pending" })
                              }
                            >
                              <RotateCcw size={14} />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Skip"
                            onClick={() =>
                              updateItem(it.id, { status: "skipped" })
                            }
                          >
                            <Clock size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Edit item"
                            onClick={() => setEditOpen(it)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="danger"
                            title="Delete"
                            onClick={() => removeItem(it.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Quick notes modal */}
      <Modal
        open={!!notesOpen}
        onClose={() => setNotesOpen(null)}
        title="Notes"
      >
        <Textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setNotesOpen(null)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (notesOpen) updateItem(notesOpen.id, { notes: notesValue });
              setNotesOpen(null);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>

      {/* Edit item modal */}
      <Modal
        open={!!editOpen}
        onClose={() => setEditOpen(null)}
        title="Edit Backlog Item"
      >
        {editItem && (
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={editItem.title}
              onChange={(e) =>
                setEditOpen({ ...editItem, title: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Chapter"
                value={editItem.chapter || ""}
                onChange={(e) =>
                  setEditOpen({ ...editItem, chapter: e.target.value })
                }
              />
              <select
                className="glass rounded-xl px-3 py-2.5"
                value={editItem.type}
                onChange={(e) =>
                  setEditOpen({ ...editItem, type: e.target.value })
                }
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={editItem.dueDate || ""}
                onChange={(e) =>
                  setEditOpen({ ...editItem, dueDate: e.target.value || null })
                }
              />
              <select
                className="glass rounded-xl px-3 py-2.5"
                value={editItem.priority || 3}
                onChange={(e) =>
                  setEditOpen({
                    ...editItem,
                    priority: Number(e.target.value),
                  })
                }
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    Priority {p}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="Notes"
              value={editItem.notes || ""}
              onChange={(e) =>
                setEditOpen({ ...editItem, notes: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  updateItem(editItem.id, {
                    title: editItem.title.trim() || editItem.title,
                    chapter: editItem.chapter?.trim() || undefined,
                    type: editItem.type,
                    dueDate: editItem.dueDate || null,
                    priority: editItem.priority,
                    notes: editItem.notes,
                  });
                  setEditOpen(null);
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BacklogManager;
