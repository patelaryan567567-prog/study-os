import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  Clock3,
  Coins,
  Flame,
  Sparkles,
  Timer,
  Trophy,
} from "lucide-react";
import { Button, Card, PageContainer, SkeletonCard } from "@/components";
import { useAppStore } from "@/store";
import { formatStudyHours } from "./dashboardMetrics";
import { useDashboardMetrics } from "./useDashboardMetrics";

type TaskSummary = {
  id: string;
  title: string;
  completed?: boolean;
  dueDate?: string | null;
  frequency?: string;
};

type NoteSummary = {
  id: string;
  title: string;
  updatedAt?: string;
};

type EventSummary = {
  id: string;
  title: string;
  start: string;
};

function readLocalStorageJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function Dashboard() {
  const { metrics, isLoading, error } = useDashboardMetrics();
  const weeklyGoalSeconds = 12 * 60 * 60;
  const weeklyGoalPercent = Math.min(
    100,
    Math.round((metrics.weekSeconds / weeklyGoalSeconds) * 100),
  );

  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const [localTasks, setLocalTasks] = useState<TaskSummary[]>([]);
  const [localNotes, setLocalNotes] = useState<NoteSummary[]>([]);
  const [localEvents, setLocalEvents] = useState<EventSummary[]>([]);

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayTasks = localTasks.filter(
    (task) => !task.completed && (!task.dueDate || task.dueDate === todayDate),
  );
  const recentNotes = localNotes
    .slice()
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 4);
  const upcomingEvents = localEvents
    .slice()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4);

  const stats = [
    {
      label: "Today’s study",
      value: formatStudyHours(metrics.todaySeconds),
      detail: "Live session total",
      icon: Clock3,
      accent: "#7c6af7",
      badge: "Live",
    },
    {
      label: "Weekly hours",
      value: formatStudyHours(metrics.weekSeconds),
      detail: "Monday through today",
      icon: CalendarDays,
      accent: "#38bdf8",
      badge: "Weekly",
    },
    {
      label: "Monthly hours",
      value: formatStudyHours(metrics.monthSeconds),
      detail: "This calendar month",
      icon: Timer,
      accent: "#22d3a0",
      badge: "Monthly",
    },
    {
      label: "Total XP",
      value: metrics.xp.toLocaleString(),
      detail: "Synced from your profile",
      icon: Sparkles,
      accent: "#a78bfa",
      badge: "XP",
    },
    {
      label: "Coins",
      value: metrics.coins.toLocaleString(),
      detail: "Synced from your profile",
      icon: Coins,
      accent: "#f59e0b",
      badge: "Wallet",
    },
    {
      label: "Study streak",
      value: `${metrics.streakDays} days`,
      detail: "Consecutive days studied",
      icon: Flame,
      accent: "#fb7185",
      badge: "Streak",
    },
  ];

  const timelineItems = [
    {
      title: "Completed deep focus session",
      time: "2h ago",
      description: "Finished a 90-minute uninterrupted study block.",
      icon: Activity,
      accent: "#38bdf8",
    },
    {
      title: "Streak extended",
      time: "Yesterday",
      description: "You kept your learning streak alive for another day.",
      icon: Flame,
      accent: "#fb7185",
    },
    {
      title: "Reached weekly high",
      time: "3d ago",
      description: "Your weekly total hours hit a new personal best.",
      icon: Trophy,
      accent: "#a78bfa",
    },
  ];

  useEffect(() => {
    const tasksData = readLocalStorageJSON<unknown>("studyos_tasks_v1");
    const notesData = readLocalStorageJSON<unknown>("studyos_notes_v1");
    const eventsData = readLocalStorageJSON<unknown>("studyos_calendar_v1");

    const tasks = Array.isArray(tasksData) ? tasksData : [];
    const notes = Array.isArray(notesData) ? notesData : [];
    const events = Array.isArray(eventsData) ? eventsData : [];

    setLocalTasks(tasks.slice(0, 5) as TaskSummary[]);
    setLocalNotes(notes.slice(0, 3) as NoteSummary[]);
    setLocalEvents(events.slice(0, 4) as EventSummary[]);
  }, []);

  return (
    <PageContainer className="space-y-8 pb-10">
      <section className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-6 shadow-[0_26px_70px_rgba(7,11,29,0.18)] backdrop-blur-[20px] transition-all duration-250">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-[var(--color-accent-hover)]">
              <Sparkles size={16} />
              Your learning space
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
              Welcome {user?.name ?? "Student"} 👋
            </h1>
            <p className="mt-4 max-w-3xl text-base text-[rgba(255,255,255,0.68)] sm:text-lg">
              Good morning — everything you need to stay in flow is laid out
              clearly across tasks, notes, and study goals.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate("/tasks")}
            >
              New Task
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate("/focus")}
            >
              Study Timer
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="h-40" />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.85fr)]">
            <SkeletonCard className="h-[320px]" />
            <SkeletonCard className="h-[320px]" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-44" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="h-44" />
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard key={index} className="h-28" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(
              ({ label, value, detail, icon: Icon, accent, badge }) => (
                <Card
                  key={label}
                  hover
                  className="relative overflow-hidden border-white/10 bg-white/5 shadow-[0_28px_80px_rgba(7,11,29,0.18)] transition duration-250 hover:-translate-y-1 hover:scale-[1.01]"
                  padding="md"
                >
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-250 hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at top right, ${accent}, transparent 60%)`,
                    }}
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                        style={{
                          border: `1px solid ${accent}`,
                          background: "rgba(255,255,255,0.08)",
                          color: accent,
                          boxShadow: `0 0 16px ${accent}33, 0 0 24px ${accent}1a`,
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        {badge}
                      </div>
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {label}
                      </p>
                      <p className="mt-3 text-3xl font-extrabold text-[var(--color-text-primary)]">
                        {value}
                      </p>
                      <p className="mt-3 text-sm text-[rgba(255,255,255,0.65)]">
                        {detail}
                      </p>
                    </div>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                      style={{ color: accent }}
                    >
                      <Icon size={20} />
                    </div>
                  </div>
                </Card>
              ),
            )}
          </section>

          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats
              .slice(0, 4)
              .map(({ label, value, detail, icon: Icon, accent, badge }) => (
                <Card
                  key={label}
                  hover
                  className="relative overflow-hidden border-white/10 bg-white/5 shadow-[0_28px_80px_rgba(7,11,29,0.18)] transition duration-250 hover:-translate-y-1 hover:scale-[1.01]"
                  padding="md"
                >
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-250 hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at top right, ${accent}, transparent 60%)`,
                    }}
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                        style={{
                          border: `1px solid ${accent}`,
                          background: "rgba(255,255,255,0.08)",
                          color: accent,
                          boxShadow: `0 0 16px ${accent}33, 0 0 24px ${accent}1a`,
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        {badge}
                      </div>
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {label}
                      </p>
                      <p className="mt-3 text-3xl font-extrabold text-[var(--color-text-primary)]">
                        {value}
                      </p>
                      <p className="mt-3 text-sm text-[rgba(255,255,255,0.65)]">
                        {detail}
                      </p>
                    </div>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                      style={{ color: accent }}
                    >
                      <Icon size={20} />
                    </div>
                  </div>
                </Card>
              ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <Card padding="lg" className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Today’s Tasks
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                    Open tasks and priorities for today.
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  {todayTasks.length} tasks
                </span>
              </div>

              <div className="space-y-3">
                {todayTasks.length > 0 ? (
                  todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {task.title}
                        </p>
                        <p className="text-sm text-[rgba(255,255,255,0.65)]">
                          {task.frequency || "One-off"} •{" "}
                          {task.dueDate || "No due date"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[rgba(59,130,246,0.12)] px-3 py-1 text-xs font-semibold text-[var(--color-success)]">
                        {task.completed ? "Done" : "Pending"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[18px] border border-white/10 bg-white/5 p-6 text-sm text-[rgba(255,255,255,0.7)]">
                    No tasks scheduled for today. Create a fresh task to keep
                    your day on track.
                  </p>
                )}
              </div>
            </Card>

            <Card padding="lg" className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Study Timer
                </p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                  Start a focused study session and build momentum.
                </p>
              </div>
              <div className="rounded-[24px] bg-gradient-to-br from-[rgba(59,130,246,0.14)] to-[rgba(59,130,246,0.04)] p-6 text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-[rgba(255,255,255,0.65)]">
                  Next session
                </p>
                <p className="mt-4 text-5xl font-extrabold text-[var(--color-text-primary)]">
                  25:00
                </p>
                <p className="mt-3 text-sm text-[rgba(255,255,255,0.72)]">
                  Ready to begin your next focus interval.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Button variant="primary" onClick={() => navigate("/focus")}>
                    Start
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/focus")}
                  >
                    Resume
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <Card padding="lg" className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Recent Notes
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                    Quick access to the latest notes you captured.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => navigate("/notes")}>
                  View all
                </Button>
              </div>

              <div className="space-y-3">
                {recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-[18px] border border-white/10 bg-white/5 p-4"
                    >
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {note.title || "Untitled note"}
                      </p>
                      <p className="mt-2 text-sm text-[rgba(255,255,255,0.65)]">
                        Updated {note.updatedAt?.slice(0, 10) || "recently"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[18px] border border-white/10 bg-white/5 p-6 text-sm text-[rgba(255,255,255,0.7)]">
                    No recent notes yet. Capture your ideas and review them
                    here.
                  </p>
                )}
              </div>
            </Card>

            <Card padding="lg" className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Calendar
                </p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                  Upcoming events and scheduled study plans.
                </p>
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[18px] border border-white/10 bg-white/5 p-4"
                    >
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {event.title}
                      </p>
                      <p className="mt-2 text-sm text-[rgba(255,255,255,0.65)]">
                        {new Date(event.start).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[18px] border border-white/10 bg-white/5 p-6 text-sm text-[rgba(255,255,255,0.7)]">
                    Your calendar is empty. Add events to stay on schedule.
                  </p>
                )}
              </div>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <Card padding="lg" className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Progress
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                    How far you’ve come this week.
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  {weeklyGoalPercent}% complete
                </span>
              </div>
              <div className="space-y-4">
                <div className="rounded-[18px] bg-white/5 p-4">
                  <p className="text-sm text-[rgba(255,255,255,0.72)]">
                    Study hours
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[var(--color-text-primary)]">
                    {formatStudyHours(metrics.weekSeconds)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white/5 p-4">
                  <p className="text-sm text-[rgba(255,255,255,0.72)]">
                    XP earned
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[var(--color-text-primary)]">
                    {metrics.xp}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Activity
                </p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                  Timeline of your latest study wins.
                </p>
              </div>
              <div className="space-y-4">
                {timelineItems.map(
                  ({ title, time, description, icon: Icon, accent }) => (
                    <div
                      key={title}
                      className="rounded-[18px] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {title}
                          </p>
                          <p className="mt-2 text-sm text-[rgba(255,255,255,0.65)]">
                            {description}
                          </p>
                        </div>
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/10"
                          style={{ color: accent }}
                        >
                          <Icon size={18} />
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.55)]">
                        {time}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </Card>
          </section>

          <section className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Recent activity
              </p>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                A quick timeline of your latest study updates.
              </p>
            </div>
            <div className="relative border-l border-white/10 pl-6">
              {timelineItems.map(
                ({ title, time, description, icon: Icon, accent }) => (
                  <div key={title} className="group relative mb-8 last:mb-0">
                    <span
                      className="absolute -left-[10px] top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0b1224] ring-1 ring-white/10"
                      style={{ color: accent }}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] transition duration-250 group-hover:-translate-y-1 group-hover:shadow-[0_24px_70px_rgba(59,130,246,0.15)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {title}
                        </p>
                        <span className="text-xs uppercase tracking-[0.16em] text-[rgba(255,255,255,0.55)]">
                          {time}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[rgba(255,255,255,0.72)]">
                        {description}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}
