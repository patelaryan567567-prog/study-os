import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import {
  Plus,
  Check,
  Calendar as CalendarIcon,
  Search,
  Pencil,
  Trash2,
  Repeat,
  Flag,
  AlertTriangle,
  ListTodo,
  ClipboardList,
  CircleCheckBig,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui";
import { showToast } from "@/components/ui/Toast";
import { cn, formatDate } from "@/utils";
import { useAppStore, TASK_COMPLETION_XP, TASK_COMPLETION_COINS } from "@/store";
import { useAuth } from "@/providers/AuthProvider";
import type { Task } from "@/types";
import {
  addTask as addTaskToFirestore,
  deleteTask as deleteTaskFromFirestore,
  getTasksForUser,
  updateTask as updateTaskInFirestore,
} from "@/services/firestoreService";

type Filter = "all" | "today" | "upcoming" | "overdue" | "completed";

interface TaskFormState {
  title: string;
  description: string;
  priority: Task["priority"];
  status: Task["status"];
  dueDate: string;
  tags: string;
  repeating: Task["repeating"];
  estimatedMinutes: number;
  subtasks: string;
}

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
  tags: "",
  repeating: undefined,
  estimatedMinutes: 0,
  subtasks: "",
};

const PRIORITY_META: Record<
  Task["priority"],
  { label: string; className: string }
> = {
  urgent: {
    label: "Urgent",
    className:
      "text-rose-400 bg-rose-500/10 border border-rose-500/20",
  },
  high: {
    label: "High",
    className: "text-error bg-error/10 border border-red-500/20",
  },
  medium: {
    label: "Medium",
    className: "text-warning bg-warning/10 border border-amber-500/20",
  },
  low: {
    label: "Low",
    className: "text-info bg-info/10 border border-cyan-500/20",
  },
};

const STATUS_META: Record<
  Task["status"],
  { label: string; className: string }
> = {
  todo: {
    label: "To Do",
    className: "text-slate-300 bg-white/5 border border-white/10",
  },
  "in-progress": {
    label: "In Progress",
    className:
      "text-sky-300 bg-sky-500/10 border border-sky-500/20",
  },
  completed: {
    label: "Completed",
    className:
      "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20",
  },
};

const selectBase =
  "w-full h-[50px] rounded-[14px] px-4 text-sm text-[var(--color-text-primary)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-blue-400 transition-all duration-200";

/** Map a Firestore task back to the local store shape (used to restore cloud
 *  tasks into the offline store when logging in on a new device). */
function fromFirestoreTask(remote: {
  id: string;
  title: string;
  notes?: string;
  dueAt?: Timestamp | null;
  completed?: boolean;
  completedAt?: Timestamp | null;
  priority?: Task["priority"];
  tags?: string[];
  repeat?: Task["repeating"] | null;
  estimatedMinutes?: number;
  subtasks?: Task["subtasks"];
}): Omit<Task, "id" | "createdAt"> {
  return {
    title: remote.title,
    description: remote.notes || undefined,
    priority: remote.priority ?? "medium",
    status: remote.completed ? "completed" : "todo",
    dueDate: remote.dueAt?.toDate()
      ? remote.dueAt.toDate().toISOString().slice(0, 10)
      : undefined,
    tags: remote.tags ?? [],
    repeating: remote.repeat ?? undefined,
    estimatedMinutes: remote.estimatedMinutes,
    subtasks: remote.subtasks,
    completedAt: remote.completedAt?.toDate()?.toISOString() ?? undefined,
    userId: "",
  };
}

function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function TaskManager() {
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const uncompleteTask = useAppStore((s) => s.uncompleteTask);

  const { firebaseUser } = useAuth();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Restore cloud tasks into the local store when a signed-in user opens the
  // module on a fresh device and the local store is still empty.
  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    let active = true;

    getTasksForUser(uid)
      .then((remote) => {
        if (!active) return;
        if (useAppStore.getState().tasks.length === 0 && remote.length > 0) {
          for (const remoteTask of remote) {
            addTask({ ...fromFirestoreTask(remoteTask as any), userId: uid });
          }
        }
      })
      .catch(() => {
        /* offline / Firestore unreachable — local store remains the source */
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ?? "",
      tags: task.tags.join(", "),
      repeating: task.repeating ?? undefined,
      estimatedMinutes: task.estimatedMinutes ?? 0,
      subtasks: (task.subtasks || []).map((s) => s.title).join("\n"),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const saveTask = async () => {
    const title = form.title.trim();
    if (!title) {
      setFormError("Task title is required.");
      return;
    }
    setFormError(null);

    const dueDate = form.dueDate || undefined;
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const localPatch = {
      title,
      description: form.description.trim() || undefined,
      priority: form.priority,
      status: form.status,
      dueDate,
      tags,
      repeating: form.repeating,
      estimatedMinutes: Math.max(0, Number(form.estimatedMinutes) || 0) || undefined,
      subtasks: form.subtasks.split("\n").map((title) => title.trim()).filter(Boolean).map((title, index) => ({ id: `${Date.now()}_${index}`, title, completed: editing?.subtasks?.[index]?.completed || false })),
    };

    if (editing) {
      updateTask(editing.id, localPatch);
      if (firebaseUser) {
        updateTaskInFirestore(firebaseUser.uid, editing.id, {
          title,
          notes: form.description.trim() || "",
          dueAt: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
          completed: form.status === "completed",
          completedAt:
            form.status === "completed" && !editing.completedAt
              ? Timestamp.now()
              : editing.completedAt
                ? Timestamp.fromDate(new Date(editing.completedAt))
                : null,
          priority: form.priority,
          tags,
          repeat: form.repeating ?? null,
          estimatedMinutes: localPatch.estimatedMinutes,
          subtasks: localPatch.subtasks,
        }).catch(() => {});
      }
      showToast("Task updated", "success");
    } else {
      const uid = firebaseUser?.uid ?? "local";
      const newTask = {
        ...localPatch,
        completedAt:
          form.status === "completed" ? new Date().toISOString() : undefined,
        userId: uid,
      };
      addTask(newTask as any);
      if (firebaseUser) {
        addTaskToFirestore({
          userId: uid,
          title,
          notes: form.description.trim() || "",
          dueAt: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
          completed: form.status === "completed",
          completedAt:
            form.status === "completed" ? Timestamp.now() : null,
          priority: form.priority,
          tags,
          repeat: form.repeating ?? null,
          estimatedMinutes: localPatch.estimatedMinutes,
          subtasks: localPatch.subtasks,
        }).catch(() => {});
      }
      showToast("Task added", "success");
    }

    setFormOpen(false);
  };

  const toggleComplete = async (task: Task) => {
    if (task.status === "completed") {
      // Revert the task AND take back the +10 XP / +5 coins it granted, so a
      // tick → untick cycle always nets out to zero (no XP farming).
      uncompleteTask(task.id);
      if (firebaseUser) {
        updateTaskInFirestore(firebaseUser.uid, task.id, {
          completed: false,
          completedAt: null,
        }).catch(() => {});
        import("@/services/firestoreService")
          .then(({ awardUserRewards }) =>
            awardUserRewards(firebaseUser.uid, -TASK_COMPLETION_XP, -TASK_COMPLETION_COINS),
          )
          .catch(() => {});
      }
      showToast("Task reopened (-10 XP)", "info");
    } else {
      completeTask(task.id);
      if (firebaseUser) {
        updateTaskInFirestore(firebaseUser.uid, task.id, {
          completed: true,
          completedAt: Timestamp.now(),
        }).catch(() => {});
        import("@/services/firestoreService")
          .then(({ awardUserRewards }) =>
            awardUserRewards(firebaseUser.uid, TASK_COMPLETION_XP, TASK_COMPLETION_COINS),
          )
          .catch(() => {});
      }
      showToast("Nice! Task completed (+10 XP)", "success");
    }
  };

  const toggleSubtask = (task: Task, subtaskId: string) => {
    const subtasks = (task.subtasks ?? []).map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, completed: !subtask.completed }
        : subtask,
    );
    updateTask(task.id, { subtasks });
    if (firebaseUser) {
      updateTaskInFirestore(firebaseUser.uid, task.id, { subtasks }).catch(
        () => {},
      );
    }
  };

  const removeTask = async (task: Task) => {
    deleteTask(task.id);
    if (firebaseUser) {
      deleteTaskFromFirestore(firebaseUser.uid, task.id).catch(() => {});
    }
    setConfirmDeleteId(null);
    showToast("Task deleted", "info");
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status !== "completed").length,
      completedToday: tasks.filter(
        (t) =>
          t.status === "completed" &&
          t.completedAt &&
          new Date(t.completedAt).getTime() >= todayStart,
      ).length,
      overdue: tasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.dueDate &&
          new Date(t.dueDate).getTime() < todayStart,
      ).length,
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    return tasks
      .filter((task) => {
        if (filter === "completed" && task.status !== "completed") return false;
        if (filter === "today") {
          if (task.status === "completed") return false;
          if (task.dueDate) {
            const d = new Date(task.dueDate);
            const dayStart = new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate(),
            ).getTime();
            if (dayStart !== todayStart) return false;
          } else return false;
        }
        if (filter === "upcoming") {
          if (task.status === "completed" || !task.dueDate) return false;
          if (new Date(task.dueDate).getTime() < todayStart) return false;
        }
        if (filter === "overdue") {
          if (task.status === "completed" || !task.dueDate) return false;
          if (new Date(task.dueDate).getTime() >= todayStart) return false;
        }
        if (q) {
          const haystack = `${task.title} ${task.description ?? ""} ${task.tags.join(" ")}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === "completed" !== (b.status === "completed")) {
          return a.status === "completed" ? 1 : -1;
        }
        const da = a.dueDate
          ? new Date(a.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        const db = b.dueDate
          ? new Date(b.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [tasks, filter, query]);

  const isOverdue = (task: Task) =>
    task.status !== "completed" &&
    !!task.dueDate &&
    new Date(task.dueDate).getTime() <
      new Date(new Date().setHours(0, 0, 0, 0)).getTime();

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "overdue", label: "Overdue" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/25 to-accent-500/15 border border-primary-500/20 text-primary-300">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                Task Manager
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)] truncate">
                Plan your day, track deadlines and earn rewards
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={openAdd}>
            <Plus size={16} /> Add Task
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <GlassCard className="p-4" hover={false}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <ListTodo size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {stats.total}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Total</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <CircleCheckBig size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {stats.pending}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Pending
                </p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Check size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {stats.completedToday}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Done Today
                </p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-400">
                  {stats.overdue}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Overdue
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filters + search */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border",
                  filter === f.key
                    ? "bg-primary-500/20 text-primary-300 border-primary-500/30 shadow-[0_0_16px_rgba(139,92,246,0.2)]"
                    : "bg-white/5 text-[var(--color-text-muted)] border-white/10 hover:bg-white/10 hover:text-[var(--color-text-primary)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <Input
              placeholder="Search tasks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9"
              style={{ height: 40 }}
            />
          </div>
        </div>

  {/* Task list */}
        {visibleTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title={
              query || filter !== "all"
                ? "No tasks match this view"
                : "No tasks yet"
            }
            description={
              query || filter !== "all"
                ? "Try a different filter or search term"
                : "Add your first task to start tracking your study plan"
            }
            primaryLabel="Add Task"
            onPrimary={openAdd}
          />
        ) : (
          <div className="space-y-3">
            {visibleTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.2) }}
              >
                <GlassCard className="p-4" hover={false}>
                  <div className="flex flex-wrap items-start gap-3">
                    <button
                      onClick={() => toggleComplete(task)}
                      aria-label={
                        task.status === "completed"
                          ? "Mark as not done"
                          : "Mark as done"
                      }
                      className={cn(
                        "mt-0.5 h-6 w-6 shrink-0 rounded-lg border-2 transition-all flex items-center justify-center",
                        task.status === "completed"
                          ? "border-emerald-500 bg-emerald-500/90 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                          : "border-white/25 bg-white/5 hover:border-emerald-400",
                      )}
                    >
                      {task.status === "completed" && <Check size={14} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[15px] font-semibold break-words",
                          task.status === "completed"
                            ? "line-through text-[var(--color-text-muted)]"
                            : "text-[var(--color-text-primary)]",
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)] line-clamp-2 break-words">
                          {task.description}
                        </p>
                      )}

                      {(task.subtasks?.length ?? 0) > 0 && (
                        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.025] p-2">
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                            {task.subtasks!.filter((subtask) => subtask.completed).length}/{task.subtasks!.length} subtasks
                          </div>
                          <div className="space-y-1">
                            {task.subtasks!.map((subtask) => (
                              <button
                                key={subtask.id}
                                type="button"
                                onClick={() => toggleSubtask(task, subtask.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-white/5"
                                aria-label={`${subtask.completed ? "Mark incomplete" : "Mark complete"}: ${subtask.title}`}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    subtask.completed
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-white/30",
                                  )}
                                >
                                  {subtask.completed && <Check size={10} />}
                                </span>
                                <span className={cn(subtask.completed && "text-[var(--color-text-muted)] line-through")}>
                                  {subtask.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            PRIORITY_META[task.priority].className,
                          )}
                        >
                          <Flag size={10} className="inline mr-1 -mt-0.5" />
                          {PRIORITY_META[task.priority].label}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                            STATUS_META[task.status].className,
                          )}
                        >
                          {STATUS_META[task.status].label}
                        </span>
                        {task.dueDate && (
                          <span
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                              isOverdue(task)
                                ? "text-rose-300 bg-rose-500/10 border-rose-500/25"
                                : "text-[var(--color-text-muted)] bg-white/5 border-white/10",
                            )}
                          >
                            <CalendarIcon size={10} />
                            {formatDate(task.dueDate)}
                            {isToday(task.dueDate) && !isOverdue(task) && (
                              <span className="ml-1 text-emerald-300">
                                Today
                              </span>
                            )}
                          </span>
                        )}
                        {task.repeating && (
                          <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/25">
                            <Repeat size={10} /> {task.repeating}
                          </span>
                        )}
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full px-2 py-0.5 text-[11px] text-primary-300 bg-primary-500/10 border border-primary-500/20"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {confirmDeleteId === task.id ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => removeTask(task)}
                            className="!h-[32px] !px-3 text-xs"
                          >
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                            className="!h-[32px] !px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(task)}
                            title="Edit task"
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-primary-300 transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(task.id)}
                            title="Delete task"
                            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-rose-400 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Task" : "Add Task"}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            placeholder="e.g. Solve 20 Maths problems"
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
              Description{" "}
              <span className="font-normal text-[var(--color-text-muted)]">
                (optional)
              </span>
            </label>
            <textarea
              rows={3}
              placeholder="Add extra details about this task…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full rounded-[14px] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-blue-400 transition-all duration-200"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as Task["priority"],
                  }))
                }
                className={selectBase}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as Task["status"],
                  }))
                }
                className={selectBase}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                className={cn(selectBase, "[color-scheme:dark]")}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                Repeat
              </label>
              <select
                value={form.repeating ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    repeating: (e.target.value ||
                      undefined) as Task["repeating"],
                  }))
                }
                className={selectBase}
              >
                <option value="">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <Input
              label="Estimated time (minutes)"
              type="number"
              min="0"
              value={form.estimatedMinutes || ""}
              onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: Number(e.target.value) || 0 }))}
            />
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Subtasks <span className="font-normal text-[var(--color-text-muted)]">(one per line)</span></label>
              <textarea rows={3} value={form.subtasks} onChange={(e) => setForm((f) => ({ ...f, subtasks: e.target.value }))} placeholder="Read chapter 1&#10;Solve practice questions" className="w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm" />
            </div>
          </div>

          <Input
            label="Tags"
            placeholder="e.g. Maths, Homework, Important"
            value={form.tags}
            onChange={(e) =>
              setForm((f) => ({ ...f, tags: e.target.value }))
            }
            helperText="Separate tags with commas"
          />

          {formError && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-400 border border-rose-500/20">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveTask}>
              {editing ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TaskManager;
