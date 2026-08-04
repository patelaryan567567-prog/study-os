import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CircularProgress } from "@/components/ui/Progress";
import { PageContainer } from "@/components/layout/PageContainer";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash, Repeat, Bell, Calendar, CheckSquare } from "lucide-react";

type Frequency = "Daily" | "Weekly" | "One-off" | "Monthly";

type Task = {
  id: string;
  title: string;
  notes?: string;
  completed?: boolean;
  priority?: number; // 1-5
  tags?: string[];
  frequency?: Frequency;
  dueDate?: string | null; // YYYY-MM-DD
  reminder?: string | null; // ISO datetime
  recurring?: string | null; // simple rule placeholder
  createdAt: string;
};

const STORAGE_KEY = "studyos_tasks_v1";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState(3);
  const [tags, setTags] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("One-off");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  const addTask = () => {
    if (!title.trim()) return;
    const t: Task = {
      id: uid("t_"),
      title: title.trim(),
      notes: notes.trim() || undefined,
      completed: false,
      priority,
      tags: tags
        ? tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      frequency,
      dueDate: dueDate || null,
      reminder: null,
      recurring: null,
      createdAt: new Date().toISOString(),
    };
    setTasks((s) => [t, ...s]);
    setTitle("");
    setNotes("");
    setPriority(3);
    setTags("");
    setFrequency("One-off");
    setDueDate("");
  };

  const toggleComplete = (id: string) =>
    setTasks((s) =>
      s.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  const removeTask = (id: string) =>
    setTasks((s) => s.filter((t) => t.id !== id));
  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((s) => s.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const metrics = useMemo(() => {
    const daily = tasks.filter(
      (t) => t.frequency === "Daily" || (t.dueDate === today && !t.completed),
    );
    const weekly = tasks.filter(
      (t) =>
        t.frequency === "Weekly" ||
        (t.dueDate && t.dueDate >= today && t.dueDate <= weekAhead),
    );
    const pending = tasks.filter((t) => !t.completed);
    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < today && !t.completed,
    );
    return { daily, weekly, pending, overdue };
  }, [tasks, today, weekAhead]);

  return (
    <PageContainer className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)]">
            <CheckSquare size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Task Manager</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Daily, weekly & recurring tasks</p>
          </div>
        </div>
        <CircularProgress
          value={
            tasks.length
              ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
              : 0
          }
          size={64}
          strokeWidth={5}
        >
          <div className="text-xs font-bold">
            {tasks.length ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100) : 0}%
          </div>
        </CircularProgress>
      </div>

      <Card padding="md">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Add new task</p>
        <div className="grid md:grid-cols-3 gap-3">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            <option>One-off</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <Input
            type="date"
            value={dueDate}
            onChange={(e: any) => setDueDate(e.target.value)}
          />
          <select value={priority} onChange={(e: any) => setPriority(Number(e.target.value))}>
            <option value={1}>P1 — Critical</option>
            <option value={2}>P2 — High</option>
            <option value={3}>P3 — Medium</option>
            <option value={4}>P4 — Low</option>
            <option value={5}>P5 — Minimal</option>
          </select>
          <div className="flex gap-2">
            <Button variant="primary" onClick={addTask}>
              <Plus size={14} /> Add Task
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md">
          <h4 className="font-semibold">Daily Tasks</h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            {metrics.daily.length} items
          </p>
          <div className="mt-3 space-y-2">
            <AnimatePresence>
              {metrics.daily.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between glass rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant={t.completed ? "success" : "ghost"}
                      onClick={() => toggleComplete(t.id)}
                    >
                      <Check size={14} />
                    </Button>
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {t.tags
                          ?.slice(0, 3)
                          .map((tag) => `#${tag}`)
                          .join(" ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-[var(--color-text-muted)]">
                      P{t.priority}
                    </div>
                    <Button
                      size="icon"
                      variant="danger"
                      onClick={() => removeTask(t.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Weekly Tasks</h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            {metrics.weekly.length} items
          </p>
          <div className="mt-3 space-y-2">
            <AnimatePresence>
              {metrics.weekly.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between glass rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant={t.completed ? "success" : "ghost"}
                      onClick={() => toggleComplete(t.id)}
                    >
                      <Check size={14} />
                    </Button>
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {t.dueDate ? (
                          <>
                            <Calendar size={12} /> {t.dueDate}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-[var(--color-text-muted)]">
                      P{t.priority}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        updateTask(t.id, {
                          frequency:
                            t.frequency === "Weekly" ? "One-off" : "Weekly",
                        })
                      }
                    >
                      <Repeat size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      onClick={() => removeTask(t.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Pending / Upcoming</h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            {metrics.pending.length} pending, {metrics.overdue.length} overdue
          </p>
          <div className="mt-3 space-y-2">
            <AnimatePresence>
              {metrics.pending.slice(0, 8).map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between glass rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {t.dueDate ? `${t.dueDate}` : t.frequency}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        updateTask(t.id, { reminder: new Date().toISOString() })
                      }
                    >
                      <Bell size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      onClick={() => removeTask(t.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      <Card padding="md">
        <h4 className="font-semibold">Tags</h4>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Array.from(new Set(tasks.flatMap((t) => t.tags || []))).map(
            (tag) => (
              <div key={tag} className="glass rounded-full px-3 py-1 text-sm">
                #{tag}
              </div>
            ),
          )}
        </div>
      </Card>
    </PageContainer>
  );
}

export default TaskManager;
