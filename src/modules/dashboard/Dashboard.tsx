import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Activity,
  CalendarDays,
  Clock3,
  Zap,
  Coins,
  Flame,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { Card, CircularProgress, PageContainer, Progress } from "@/components";
import { useAppStore } from "@/store";
import { formatStudyHours } from "./dashboardMetrics";
import { useDashboardMetrics } from "./useDashboardMetrics";

ChartJS.register(
  ArcElement,
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
);

const WEEKLY_STUDY_OPTIONS: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      backgroundColor: "#1a1a2e",
      borderColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      padding: 10,
      titleColor: "#f0f0ff",
      bodyColor: "#a9a9c0",
      callbacks: { label: (context) => `${context.parsed.y} hours` },
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { color: "#696981", font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "rgba(255,255,255,0.05)" },
      ticks: { color: "#696981", font: { size: 11 } },
    },
  },
};

const WEEKLY_GOAL_OPTIONS: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
};

function createWeeklyStudyData(
  labels: string[],
  hours: number[],
): ChartData<"line"> {
  return {
    labels,
    datasets: [
      {
        data: hours,
        borderColor: "#9580ff",
        backgroundColor: "rgba(124, 106, 247, 0.18)",
        fill: true,
        tension: 0.42,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#f0f0ff",
        pointHoverBorderColor: "#7c6af7",
      },
    ],
  };
}

function createWeeklyGoalData(percent: number): ChartData<"doughnut"> {
  return {
    labels: ["Complete", "Remaining"],
    datasets: [
      {
        data: [percent, 100 - percent],
        backgroundColor: ["#7c6af7", "rgba(255, 255, 255, 0.08)"],
        borderWidth: 0,
        borderRadius: 8,
        spacing: 3,
      },
    ],
  };
}

export function Dashboard() {
  const user = useAppStore((state) => state.user);
  const { metrics, isLoading, error } = useDashboardMetrics();
  const weeklyGoalSeconds = 12 * 60 * 60;
  const weeklyGoalPercent = Math.min(
    100,
    Math.round((metrics.weekSeconds / weeklyGoalSeconds) * 100),
  );
  const weeklyData = useMemo(
    () => createWeeklyStudyData(metrics.weeklyLabels, metrics.weeklyHours),
    [metrics.weeklyLabels, metrics.weeklyHours],
  );
  const weeklyGoalData = useMemo(
    () => createWeeklyGoalData(weeklyGoalPercent),
    [weeklyGoalPercent],
  );

  const stats = [
    {
      label: "Today’s study",
      value: formatStudyHours(metrics.todaySeconds),
      detail: "Live session total",
      icon: Clock3,
      accent: "#7c6af7",
    },
    {
      label: "Weekly hours",
      value: formatStudyHours(metrics.weekSeconds),
      detail: "Monday through today",
      icon: CalendarDays,
      accent: "#38bdf8",
    },
    {
      label: "Monthly hours",
      value: formatStudyHours(metrics.monthSeconds),
      detail: "This calendar month",
      icon: Timer,
      accent: "#22d3a0",
    },
    {
      label: "Total XP",
      value: metrics.xp.toLocaleString(),
      detail: "Synced from your profile",
      icon: Zap,
      accent: "#a78bfa",
    },
    {
      label: "Coins",
      value: metrics.coins.toLocaleString(),
      detail: "Synced from your profile",
      icon: Coins,
      accent: "#f59e0b",
    },
    {
      label: "Study streak",
      value: `${metrics.streakDays} days`,
      detail: "Consecutive days studied",
      icon: Flame,
      accent: "#fb7185",
    },
  ];

  return (
    <PageContainer className="space-y-6 pb-10">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--color-accent-hover)]">
            <Sparkles size={15} />
            Your learning space
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Welcome back, {user?.name ?? "Student"}.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-text-secondary)]">
            Your study time, rewards, and progress update automatically from
            Firestore.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          <span
            className={`flex h-2 w-2 rounded-full ${error ? "bg-[var(--color-danger)]" : "bg-[var(--color-success)]"} shadow-[0_0_10px_currentColor]`}
          />
          {isLoading
            ? "Syncing dashboard…"
            : error
              ? "Sync needs attention"
              : "Live Firestore sync"}
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, detail, icon: Icon, accent }) => (
          <Card
            key={label}
            hover
            className="relative overflow-hidden"
            padding="md"
          >
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                background: `radial-gradient(circle at top right, ${accent}, transparent 58%)`,
              }}
            />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
                  {value}
                </p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {detail}
                </p>
              </div>
              <div
                className="rounded-xl p-2.5"
                style={{ backgroundColor: `${accent}20`, color: accent }}
              >
                <Icon size={18} />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.85fr)]">
        <Card padding="lg" className="overflow-hidden">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Weekly study activity
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Hours recorded in your live study sessions
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-success)]">
              <Activity size={14} />
              Real time
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <Line data={weeklyData} options={WEEKLY_STUDY_OPTIONS} />
          </div>
        </Card>

        <Card padding="lg" className="relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Weekly study goal
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Progress toward your 12-hour target
            </p>
            <div className="relative mx-auto mt-4 h-48 max-w-[220px]">
              <Doughnut data={weeklyGoalData} options={WEEKLY_GOAL_OPTIONS} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {weeklyGoalPercent}%
                </span>
                <span className="mt-1 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  complete
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>{formatStudyHours(metrics.weekSeconds)} studied</span>
              <span>
                {formatStudyHours(
                  Math.max(0, weeklyGoalSeconds - metrics.weekSeconds),
                )}{" "}
                remaining
              </span>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-2">
            <Trophy size={17} className="text-[var(--color-warning)]" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Study goal
            </p>
          </div>
          <p className="text-3xl font-bold text-[var(--color-text-primary)]">
            {formatStudyHours(metrics.weekSeconds)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            of 12h planned study time this week
          </p>
          <Progress
            value={weeklyGoalPercent}
            color="var(--color-warning)"
            className="mt-5"
          />
          <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Target size={14} />
            {formatStudyHours(
              Math.max(0, weeklyGoalSeconds - metrics.weekSeconds),
            )}{" "}
            left to reach the target
          </div>
        </Card>

        <Card padding="lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Streak status
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Calculated from consecutive session days
              </p>
            </div>
            <CircularProgress
              value={Math.min(100, metrics.streakDays * 10)}
              size={58}
              strokeWidth={5}
              color="var(--color-danger)"
            >
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                {metrics.streakDays}
              </span>
            </CircularProgress>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            {metrics.streakDays > 0
              ? "Keep today’s study session going."
              : "Complete a session today to begin your streak."}
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}
