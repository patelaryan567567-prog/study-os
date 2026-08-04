import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Reminder = {
  id: string;
  type: "lecture" | "module" | "task" | "revision" | "custom";
  title: string;
  targetId?: string | null;
  time: string; // ISO
  repeat?: "none" | "daily" | "weekly" | "custom";
  repeatDays?: number[]; // for weekly/custom as day indexes
  notified?: boolean;
};

const STORAGE_KEY = "studyos_reminders_v1";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function readJSON(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SmartReminder() {
  const [reminders, setReminders] = useState<Reminder[]>(
    () => readJSON(STORAGE_KEY) || [],
  );
  const [type, setType] = useState<Reminder["type"]>("lecture");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState<Reminder["repeat"]>("none");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch {}
  }, [reminders]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Poll every 30 seconds for due reminders
  useEffect(() => {
    const interval = setInterval(() => checkDue(), 30_000);
    checkDue();
    return () => clearInterval(interval);
  }, [reminders]);

  function saveReminder() {
    if (!time) return;
    const r: Reminder = {
      id: uid("r_"),
      type,
      title: title || `${type} reminder`,
      time: new Date(time).toISOString(),
      repeat,
      repeatDays: [],
    };
    setReminders((prev) => [r, ...prev]);
    setTitle("");
    setTime("");
    setRepeat("none");
  }

  function removeReminder(id: string) {
    setReminders((r) => r.filter((x) => x.id !== id));
  }

  function showNotification(r: Reminder) {
    const text = `${r.title} — ${r.type}`;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("StudyOS Reminder", { body: text });
    } else {
      // fallback
      alert(text);
    }
  }

  function checkDue() {
    const now = new Date();
    setReminders((prev) =>
      prev.map((r) => {
        try {
          const t = new Date(r.time);
          // tolerance: due if within past 60s and not notified
          if (!r.notified && Math.abs(now.getTime() - t.getTime()) < 60_000) {
            showNotification(r);
            if (r.repeat && r.repeat !== "none") {
              // schedule next
              if (r.repeat === "daily") {
                const next = new Date(t);
                next.setDate(next.getDate() + 1);
                return { ...r, time: next.toISOString() };
              }
              if (r.repeat === "weekly") {
                const next = new Date(t);
                next.setDate(next.getDate() + 7);
                return { ...r, time: next.toISOString() };
              }
              return { ...r, notified: true };
            } else {
              return { ...r, notified: true };
            }
          }
        } catch (e) {}
        return r;
      }),
    );
  }

  // aggregate possible targets from other modules (lecture/module/task)
  const lectures = useMemo(
    () => readJSON("studyos_lecture_tracker_v1") || [],
    [],
  );
  const modules = useMemo(
    () => readJSON("studyos_module_tracker_v1") || [],
    [],
  );
  const tasks = useMemo(() => readJSON("studyos_tasks_v1") || [], []);

  return (
    <div className="space-y-6">
      <Card padding="lg" className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Smart Reminders</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Create lecture/module/task/revision reminders with repeating and
            desktop notifications.
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md">
          <h4 className="font-semibold">Create Reminder</h4>
          <div className="mt-3 space-y-2">
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="glass p-2 rounded"
            >
              <option value="lecture">Lecture Reminder</option>
              <option value="module">Module Reminder</option>
              <option value="task">Task Reminder</option>
              <option value="revision">Revision Reminder</option>
              <option value="custom">Custom</option>
            </select>
            <Input
              placeholder="Reminder title"
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={time}
              onChange={(e: any) => setTime(e.target.value)}
            />
            <select
              value={repeat}
              onChange={(e: any) => setRepeat(e.target.value)}
              className="glass p-2 rounded"
            >
              <option value="none">No Repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={saveReminder}>
                Save Reminder
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Quick Targets</h4>
          <div className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
            <div>Lectures: {(lectures || []).length}</div>
            <div>Modules: {(modules || []).length}</div>
            <div>Tasks: {(tasks || []).length}</div>
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Notifications</h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Desktop notifications use the browser Notification API (works on
            Android in supported browsers/PWA).
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => {
                if ("Notification" in window) Notification.requestPermission();
              }}
            >
              Request Permission
            </Button>
          </div>
        </Card>
      </div>

      <Card padding="md">
        <h4 className="font-semibold">Scheduled Reminders</h4>
        <div className="mt-3 space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2 rounded bg-white/5"
            >
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {r.type} • {new Date(r.time).toLocaleString()} • {r.repeat}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeReminder(r.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default SmartReminder;
