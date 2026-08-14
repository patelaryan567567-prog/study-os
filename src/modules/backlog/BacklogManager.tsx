import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CircularProgress } from "@/components/ui/Progress";
import { Plus, Check, Clock, Trash, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { readStoredJson, writeStoredJson } from "@/utils/storage";

type BacklogItem = {
  id: string;
  chapter?: string;
  title: string;
  dueDate?: string | null; // ISO
  type?: string; // e.g., Lecture, Revision, Module
  status: "pending" | "completed" | "missed" | "skipped";
  priority?: number; // 1-5
  reminder?: string | null;
  notes?: string;
};

const STORAGE_KEY = "studyos_backlog_v1";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function BacklogManager() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [chapter, setChapter] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Lecture");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(3);
  const [notesOpen, setNotesOpen] = useState<{ id: string } | null>(null);
  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    setItems(readStoredJson<BacklogItem[]>(STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    writeStoredJson(STORAGE_KEY, items);
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
    const missed = items.filter(
      (i) => i.status === "pending" && i.dueDate && i.dueDate < todayISO,
    ).length;
    const todaysPending = items.filter(
      (i) => i.status === "pending" && i.dueDate === todayISO,
    ).length;
    const tomorrowsPending = items.filter(
      (i) => i.status === "pending" && i.dueDate === tomorrowISO,
    ).length;
    const pendingModules = new Set(
      items
        .filter((i) => i.status === "pending" && i.chapter)
        .map((i) => i.chapter),
    ).size;
    const pendingRevision = items.filter(
      (i) =>
        i.status === "pending" && i.type?.toLowerCase().includes("revision"),
    ).length;
    const prioritized = items
      .filter((i) => i.status === "pending")
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
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
      pendingModules,
      pendingRevision,
      prioritized,
      estCompletion,
    };
  }, [items, todayISO, tomorrowISO]);

  return (
    <div className="space-y-6">
      <Card padding="lg" className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Backlog</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage lectures without external connections. Local-only backlog and
            reminders.
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
        <div className="grid md:grid-cols-4 gap-3">
          <Input
            placeholder="Chapter (optional)"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
          <Input
            placeholder="Title (e.g. Lecture 1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="glass rounded-xl px-3 py-2.5"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Lecture</option>
            <option>Revision</option>
            <option>Module</option>
            <option>Assignment</option>
          </select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <select
              className="glass rounded-xl px-3 py-2.5"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
              <option value={4}>P4</option>
              <option value={5}>P5</option>
            </select>
            <Button variant="primary" onClick={addItem}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md">
          <h4 className="font-semibold">Today's Pending</h4>
          <p className="text-sm text-[var(--color-text-muted)]">
            {metrics.todaysPending} items due today
          </p>
        </Card>
        <Card padding="md">
          <h4 className="font-semibold">Tomorrow's Pending</h4>
          <p className="text-sm text-[var(--color-text-muted)]">
            {metrics.tomorrowsPending} items due tomorrow
          </p>
        </Card>
        <Card padding="md">
          <h4 className="font-semibold">Pending Revision</h4>
          <p className="text-sm text-[var(--color-text-muted)]">
            {metrics.pendingRevision} revision items
          </p>
        </Card>
      </div>

      <div className="space-y-3">
        {metrics.prioritized.map((it) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 flex items-start justify-between"
          >
            <div>
              <div className="flex items-center gap-3">
                <h5 className="font-semibold">{it.title}</h5>
                {it.chapter && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {it.chapter}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                  {it.type}
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">
                Due: {it.dueDate ?? "—"} • Priority: P{it.priority}
              </div>
              {it.notes && <p className="mt-2 text-sm">{it.notes}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-xs text-[var(--color-text-muted)]">
                Status: {it.status}
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="success"
                  onClick={() => updateItem(it.id, { status: "completed" })}
                >
                  <Check size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => updateItem(it.id, { status: "skipped" })}
                >
                  <Clock size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setNotesOpen({ id: it.id });
                    setNotesValue(it.notes || "");
                  }}
                >
                  <Edit size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="danger"
                  onClick={() => removeItem(it.id)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
    </div>
  );
}

export default BacklogManager;
