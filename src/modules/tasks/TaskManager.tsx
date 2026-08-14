import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Check,
  Clock,
  Tag,
  Calendar as CalendarIcon,
  Filter,
  Search,
  AlertCircle,
  ArrowUp,
  MoreVertical,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ModuleShell } from "@/components/layout/ModuleShell";
import { cn, priorityToneClass } from "@/utils";
import { useAuth } from "@/providers/AuthProvider";
import { updateTask, awardUserRewards } from "@/services/firestoreService";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  dueDate: string;
  tags: string[];
  type: "daily" | "weekly" | "one-off";
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Complete Math Assignment",
      completed: false,
      priority: "high",
      dueDate: "2026-08-06",
      tags: ["Math", "Homework"],
      type: "daily",
    },
    {
      id: "2",
      title: "Review Physics Chapter 3",
      completed: false,
      priority: "medium",
      dueDate: "2026-08-07",
      tags: ["Physics", "Review"],
      type: "weekly",
    },
    {
      id: "3",
      title: "Submit Research Paper",
      completed: true,
      priority: "high",
      dueDate: "2026-08-04",
      tags: ["Research", "Important"],
      type: "one-off",
    },
  ]);

  const [newTask, setNewTask] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "daily" | "weekly" | "one-off"
  >("all");

  const filteredTasks = tasks.filter(
    (task) => selectedType === "all" || task.type === selectedType,
  );

  const { firebaseUser } = useAuth();

  const toggleTask = async (id: string) => {
    const nextTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task,
    );
    setTasks(nextTasks);

    const updatedTask = nextTasks.find((task) => task.id === id);
    if (!updatedTask || !firebaseUser) return;

    try {
      await updateTask(firebaseUser.uid, id, {
        completed: updatedTask.completed,
        completedAt: updatedTask.completed
          ? new Date().toISOString()
          : undefined,
      });

      if (updatedTask.completed) {
        await awardUserRewards(firebaseUser.uid, 10, 0);
      }
    } catch (error) {
      console.error("Failed to persist task completion:", error);
    }
  };

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    pending: tasks.filter((t) => !t.completed).length,
    overdue: tasks.filter(
      (t) => !t.completed && new Date(t.dueDate) < new Date(),
    ).length,
  };

  return (
    <ModuleShell
      title="Task Manager"
      subtitle={`${taskStats.pending} tasks pending - ${taskStats.overdue} overdue`}
      headerClassName="flex-row items-center justify-between"
      actions={
        <AnimatedButton>
          <Plus className="h-4 w-4" />
          Add New Task
        </AnimatedButton>
      }
    >
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Tasks", value: taskStats.total, color: "primary" },
          {
            label: "Completed",
            value: taskStats.completed,
            color: "success",
          },
          { label: "Pending", value: taskStats.pending, color: "warning" },
          { label: "Overdue", value: taskStats.overdue, color: "error" },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
            <p className={cn("text-2xl font-bold", `text-${stat.color}-500`)}>
              {stat.value}
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {["all", "daily", "weekly", "one-off"].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type as any)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all",
              selectedType === type
                ? "bg-primary-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <GlassCard className="p-4 hover:scale-[1.01]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "h-6 w-6 shrink-0 rounded-lg border-2 transition-all",
                    task.completed
                      ? "border-primary-500 bg-primary-500"
                      : "border-gray-300 dark:border-gray-600",
                  )}
                >
                  {task.completed && <Check className="h-4 w-4 text-white" />}
                </button>

                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium text-gray-900 dark:text-white",
                      task.completed &&
                        "line-through text-gray-400 dark:text-gray-500",
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        priorityToneClass(task.priority),
                      )}
                    >
                      {task.priority}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="h-3 w-3" />
                      {task.dueDate}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {task.type}
                    </span>
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-primary-500/10 px-2 py-0.5 text-xs text-primary-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <MoreVertical className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4">
            <Check className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
            All tasks completed! ??
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Great job! Add new tasks to keep the momentum going
          </p>
        </div>
      )}
    </ModuleShell>
  );
}

export default TaskManager;
