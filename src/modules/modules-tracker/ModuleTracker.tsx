import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { CircularProgress } from "@/components/ui/Progress";
import {
  Plus,
  Check,
  Star,
  Clock,
  Trash,
  Edit,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStore, persistStore } from "@/services/appDataSync";

type ItemType = "Exercise" | "DPP" | "PYQ" | "Revision" | "Assignment";
type ItemStatus = "pending" | "completed" | "skipped";
type ItemFilter = "all" | "pending" | "completed" | "bookmarked";

type ModuleItem = {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  notes?: string;
  reminder?: string | null;
  bookmarked?: boolean;
};

type Chapter = {
  id: string;
  name: string;
  items: ModuleItem[];
};

const STORAGE_KEY = "studyos_module_tracker_v1";

const TYPE_COLORS: Record<ItemType, string> = {
  Exercise: "bg-blue-500/15 text-blue-400",
  DPP: "bg-cyan-500/15 text-cyan-400",
  PYQ: "bg-orange-500/15 text-orange-400",
  Revision: "bg-purple-500/15 text-purple-400",
  Assignment: "bg-amber-500/15 text-amber-400",
};

// each chapter card gets its own glow color, cycling
const CHAPTER_GLOWS = [
  { border: "glow-border-blue", bar: "from-blue-500 to-cyan-400", label: "text-blue-400" },
  { border: "glow-border-purple", bar: "from-purple-500 to-pink-400", label: "text-purple-400" },
  { border: "glow-border-green", bar: "from-emerald-500 to-lime-400", label: "text-emerald-400" },
  { border: "glow-border-amber", bar: "from-amber-500 to-orange-400", label: "text-amber-400" },
  { border: "glow-border-cyan", bar: "from-cyan-500 to-blue-400", label: "text-cyan-400" },
  { border: "glow-border-red", bar: "from-red-500 to-pink-400", label: "text-red-400" },
];

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function ModuleTracker() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapter, setNewChapter] = useState("");
  const [activeNotes, setActiveNotes] = useState<{
    chapterId: string;
    itemId: string;
  } | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [reminderEditing, setReminderEditing] = useState<{
    chapterId: string;
    itemId: string;
  } | null>(null);

  // Viewing state
  const [query, setQuery] = useState("");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadStore<Chapter[]>(STORAGE_KEY, []).then((data) => {
      if (data.length) setChapters(data);
    });
  }, []);

  useEffect(() => {
    persistStore(STORAGE_KEY, chapters);
  }, [chapters]);

  const addChapter = () => {
    if (!newChapter.trim()) return;
    setChapters((s) => [
      ...s,
      { id: uid("chap_"), name: newChapter.trim(), items: [] },
    ]);
    setNewChapter("");
  };

  const removeChapter = (chapterId: string) =>
    setChapters((s) => s.filter((c) => c.id !== chapterId));

  const addItem = (chapterId: string, title: string, type: ItemType) => {
    if (!title.trim()) return;
    setChapters((s) =>
      s.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              items: [
                ...c.items,
                {
                  id: uid("itm_"),
                  title: title.trim(),
                  type,
                  status: "pending",
                },
              ],
            }
          : c,
      ),
    );
  };

  const updateItem = (
    chapterId: string,
    itemId: string,
    patch: Partial<ModuleItem>,
  ) => {
    setChapters((s) =>
      s.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              items: c.items.map((it) =>
                it.id === itemId ? { ...it, ...patch } : it,
              ),
            }
          : c,
      ),
    );
  };

  const removeItem = (chapterId: string, itemId: string) => {
    setChapters((s) =>
      s.map((c) =>
        c.id === chapterId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c,
      ),
    );
  };

  const stats = useMemo(() => {
    const byChapter = chapters.map((c) => {
      const total = c.items.length;
      const completed = c.items.filter((i) => i.status === "completed").length;
      const remaining = total - completed;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      return { chapterId: c.id, total, completed, remaining, percent };
    });
    const globalTotal = byChapter.reduce((a, b) => a + b.total, 0);
    const globalCompleted = byChapter.reduce((a, b) => a + b.completed, 0);
    const globalRemaining = globalTotal - globalCompleted;
    const globalPercent = globalTotal
      ? Math.round((globalCompleted / globalTotal) * 100)
      : 0;
    return {
      byChapter,
      globalTotal,
      globalCompleted,
      globalRemaining,
      globalPercent,
    };
  }, [chapters]);

  const matchesView = (it: ModuleItem) => {
    if (itemFilter === "bookmarked") return !!it.bookmarked;
    if (itemFilter === "all") return true;
    return it.status === itemFilter;
  };

  const q = query.trim().toLowerCase();
  const visibleChapters = chapters
    .map((c) => ({
      ...c,
      items: c.items.filter(
        (it) =>
          matchesView(it) &&
          (!q ||
            it.title.toLowerCase().includes(q) ||
            (it.notes || "").toLowerCase().includes(q)),
      ),
    }))
    .filter((c) => !q || c.items.length > 0 || c.name.toLowerCase().includes(q));

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-3xl flex items-center justify-center shrink-0 bg-gradient-to-br from-primary-500/25 to-accent-500/15 border border-primary-500/25">
          <Layers size={22} className="text-primary-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Module Tracker
          </h2>
          <p className="mt-0.5 text-sm lg:text-base text-[var(--color-text-secondary)]">
            Track chapters, exercises and revision items in one place
          </p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="New chapter name (e.g. CHAPTER)"
            value={newChapter}
            onChange={(e) => setNewChapter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addChapter()}
            className="w-full"
          />
        </div>
        <Button variant="primary" onClick={addChapter} className="sm:shrink-0">
          <Plus size={14} /> Add Chapter
        </Button>
      </div>

      <Card padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-4 glow-border-purple">
        <div className="min-w-0">
          <h3 className="text-2xl font-bold gradient-title">Module Tracker Overview</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Auto-calculated progress, completion and remaining counts across
            module items.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-28">
            <CircularProgress
              value={stats.globalPercent}
              size={72}
              strokeWidth={6}
            >
              <div className="text-xs text-[var(--color-text-muted)]">
                {stats.globalPercent}%
              </div>
            </CircularProgress>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            <div>Completed: {stats.globalCompleted}</div>
            <div>Remaining: {stats.globalRemaining}</div>
            <div>Total: {stats.globalTotal}</div>
          </div>
        </div>
      </Card>

      {/* Viewing controls */}
      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
            />
            <input
              className="glass rounded-xl pl-9 pr-3 py-2 w-full bg-transparent outline-none"
              placeholder="Search items and chapters..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl overflow-hidden glass">
            {(["all", "pending", "completed", "bookmarked"] as ItemFilter[]).map(
              (f) => (
                <button
                  key={f}
                  className={`px-3 py-2 text-xs capitalize transition-colors ${
                    itemFilter === f
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-muted)] hover:bg-white/5"
                  }`}
                  onClick={() => setItemFilter(f)}
                >
                  {f}
                </button>
              ),
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {chapters.length === 0 && (
          <Card padding="md">
            <EmptyState
              title="No chapters yet"
              description="Add your first chapter to start tracking"
              primaryLabel="Add Chapter"
              onPrimary={addChapter}
            />
          </Card>
        )}
        <AnimatePresence>
          {visibleChapters.map((chap) => {
            const s = stats.byChapter.find((b) => b.chapterId === chap.id) || {
              percent: 0,
              total: 0,
              completed: 0,
              remaining: 0,
            };
            const isCollapsed = !!collapsed[chap.id];
            return (
              <motion.div
                key={chap.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card padding="lg" className={`space-y-4 ${CHAPTER_GLOWS[chapters.findIndex((c) => c.id === chap.id) % CHAPTER_GLOWS.length].border}`}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      className="flex items-center gap-2 text-left min-w-0"
                      onClick={() => toggleCollapse(chap.id)}
                      title={isCollapsed ? "Expand chapter" : "Collapse chapter"}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                      ) : (
                        <ChevronDown size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                      )}
                      <div className="min-w-0">
                        <h4 className={`font-semibold truncate ${CHAPTER_GLOWS[chapters.findIndex((c) => c.id === chap.id) % CHAPTER_GLOWS.length].label}`}>{chap.name}</h4>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {s.completed}/{s.total} completed • {s.remaining}{" "}
                          remaining
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-20">
                        <CircularProgress
                          value={s.percent}
                          size={56}
                          strokeWidth={6}
                        >
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {s.percent}%
                          </div>
                        </CircularProgress>
                      </div>
                      <Button
                        size="icon"
                        variant="danger"
                        title="Delete chapter"
                        onClick={() => removeChapter(chap.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Linear progress bar */}
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${CHAPTER_GLOWS[chapters.findIndex((c) => c.id === chap.id) % CHAPTER_GLOWS.length].bar} transition-all duration-500 shadow-[0_0_10px_rgba(96,165,250,0.5)]`}
                      style={{ width: `${s.percent}%` }}
                    />
                  </div>

                  {!isCollapsed && (
                    <ChapterItems
                      chapter={chap}
                      onAddItem={(title, type) => addItem(chap.id, title, type)}
                      onToggleBookmark={(itemId, next) =>
                        updateItem(chap.id, itemId, { bookmarked: next })
                      }
                      onSetStatus={(itemId, status) =>
                        updateItem(chap.id, itemId, { status })
                      }
                      onRemoveItem={(itemId) => removeItem(chap.id, itemId)}
                      onOpenNotes={(itemId) => {
                        setActiveNotes({ chapterId: chap.id, itemId });
                        const it = chap.items.find((x) => x.id === itemId);
                        setNotesValue(it?.notes || "");
                      }}
                      onSaveNotes={(itemId, notes) =>
                        updateItem(chap.id, itemId, { notes })
                      }
                      onOpenReminder={(itemId) =>
                        setReminderEditing({ chapterId: chap.id, itemId })
                      }
                      onComplete={(itemId) =>
                        updateItem(chap.id, itemId, { status: "completed" })
                      }
                    />
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Modal
        open={!!activeNotes}
        onClose={() => setActiveNotes(null)}
        title="Item Notes"
      >
        <Textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setActiveNotes(null)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (activeNotes)
                updateItem(activeNotes.chapterId, activeNotes.itemId, {
                  notes: notesValue,
                });
              setActiveNotes(null);
            }}
          >
            Save Notes
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!reminderEditing}
        onClose={() => setReminderEditing(null)}
        title="Set Reminder"
      >
        <div className="flex flex-col gap-3">
          <Input
            type="datetime-local"
            value={
              reminderEditing
                ? (chapters
                    .find((c) => c.id === reminderEditing.chapterId)
                    ?.items.find((i) => i.id === reminderEditing.itemId)
                    ?.reminder ?? "")
                : ""
            }
            onChange={(e) => {
              if (!reminderEditing) return;
              updateItem(reminderEditing.chapterId, reminderEditing.itemId, {
                reminder: e.target.value || null,
              });
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setReminderEditing(null)}
            >
              Close
            </Button>
            <Button variant="primary" onClick={() => setReminderEditing(null)}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChapterItems({
  chapter,
  onAddItem,
  onToggleBookmark,
  onSetStatus,
  onRemoveItem,
  onOpenNotes,
  onOpenReminder,
  onComplete,
}: any) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("Exercise");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Item title (e.g. Exercise 1)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddItem(title, type);
              setTitle("");
            }
          }}
        />
        <select
          className="glass rounded-xl px-3 py-2.5"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
        >
          <option>Exercise</option>
          <option>DPP</option>
          <option>PYQ</option>
          <option>Revision</option>
          <option>Assignment</option>
        </select>
        <Button
          onClick={() => {
            onAddItem(title, type);
            setTitle("");
          }}
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {chapter.items.length === 0 && (
          <div className="py-4">
            <EmptyState
              title="No items yet"
              description="Add your first module item"
              primaryLabel="Add Item"
              onPrimary={() => onAddItem("New Item", "Exercise")}
            />
          </div>
        )}
        {chapter.items.map((it: ModuleItem) => (
          <div
            key={it.id}
            className={`flex items-center justify-between glass rounded-xl p-3 accent-left hover-glow ${
              it.status === "completed" ? "opacity-60" : ""
            }`}
            style={{
              ["--accent-top" as string]: it.bookmarked
                ? "#fbbf24"
                : it.status === "completed"
                  ? "#34d399"
                  : "#60a5fa",
              ["--accent-bottom" as string]: it.bookmarked
                ? "#f472b6"
                : "#34d399",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {it.status === "completed" && (
                    <Check size={13} className="text-[var(--color-success)]" />
                  )}
                  <h5
                    className={`font-medium ${
                      it.status === "completed" ? "line-through" : ""
                    }`}
                  >
                    {it.title}
                  </h5>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[it.type] || "bg-white/5 text-[var(--color-text-muted)]"}`}
                  >
                    {it.type}
                  </span>
                  {it.status !== "completed" && it.status !== "pending" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                      {it.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {it.notes ? "Notes saved" : "No notes"}
                  {it.reminder
                    ? ` • Reminder: ${new Date(it.reminder).toLocaleString()}`
                    : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant={it.status === "completed" ? "ghost" : "success"}
                title={it.status === "completed" ? "Mark pending" : "Mark complete"}
                onClick={() =>
                  it.status === "completed"
                    ? onSetStatus(it.id, "pending")
                    : onComplete(it.id)
                }
              >
                <Check size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onToggleBookmark(it.id, !it.bookmarked)}
                title="Bookmark"
              >
                <Star
                  size={14}
                  className={it.bookmarked ? "fill-current text-amber-400" : ""}
                />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenNotes(it.id)}
                title="Notes"
              >
                <Edit size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenReminder(it.id)}
                title="Reminder"
              >
                <Clock size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSetStatus(it.id, "skipped")}
                title="Mark skipped"
              >
                <Trash size={14} />
              </Button>
              <Button
                size="icon"
                variant="danger"
                onClick={() => onRemoveItem(it.id)}
                title="Delete"
              >
                <Trash size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ModuleTracker;
