import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { CircularProgress } from "@/components/ui/Progress";
import { Plus, Check, Star, Clock, Trash, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createId, readJSON, writeJSON } from "@/utils";

type ItemType = "Exercise" | "DPP" | "PYQ" | "Revision" | "Assignment";
type ItemStatus = "pending" | "completed" | "skipped";

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

  useEffect(() => {
    setChapters(readJSON<Chapter[]>(STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    writeJSON(STORAGE_KEY, chapters);
  }, [chapters]);

  const addChapter = () => {
    if (!newChapter.trim()) return;
    setChapters((s) => [
      ...s,
      { id: createId("chap_"), name: newChapter.trim(), items: [] },
    ]);
    setNewChapter("");
  };

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
                  id: createId("itm_"),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Input
          placeholder="New chapter name (e.g. CHAPTER)"
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
        />
        <Button variant="primary" onClick={addChapter}>
          <Plus size={14} /> Add Chapter
        </Button>
      </div>

      <Card padding="lg" className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Module Tracker Overview</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Auto-calculated progress, completion and remaining counts across
            module items.
          </p>
        </div>
        <div className="flex items-center gap-4">
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

      <div className="space-y-4">
        <AnimatePresence>
          {chapters.map((chap) => {
            const s = stats.byChapter.find((b) => b.chapterId === chap.id) || {
              percent: 0,
              total: 0,
              completed: 0,
              remaining: 0,
            };
            return (
              <motion.div
                key={chap.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card padding="lg" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{chap.name}</h4>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {s.completed}/{s.total} completed • {s.remaining}{" "}
                        remaining
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
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
                    </div>
                  </div>

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
            className="flex items-center justify-between glass rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-medium">{it.title}</h5>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                    {it.type}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${it.status === "completed" ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" : it.status === "skipped" ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]" : "bg-white/5 text-[var(--color-text-muted)]"}`}
                  >
                    {it.status}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {it.notes ? "Notes saved" : "No notes"}
                  {it.reminder
                    ? ` • Reminder: ${new Date(it.reminder).toLocaleString()}`
                    : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="success"
                onClick={() => onComplete(it.id)}
                title="Mark complete"
              >
                <Check size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onToggleBookmark(it.id, !it.bookmarked)}
                title="Bookmark"
              >
                <Star size={14} />
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
                variant="danger"
                onClick={() => onSetStatus(it.id, "skipped")}
                title="Mark skipped"
              >
                <Trash size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
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
