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
import {
  Card,
  CircularProgress,
  PageContainer,
  SkeletonCard,
} from "@/components";
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
  animation: {
    duration: 800,
    easing: "easeInOutQuart",
    delay: (context) => {
      let delay = 0;
      if (context.type === "data" && context.mode === "default") {
        delay = context.dataIndex * 50 + context.datasetIndex * 100;
      }
      return delay;
    },
  },
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: {
      display: true,
      position: "top",
      labels: {
        color: "rgba(255, 255, 255, 0.7)",
        font: { size: 12, weight: "bold" },
        padding: 16,
        usePointStyle: true,
        pointStyle: "circle",
      },
    },
    tooltip: {
      displayColors: true,
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderColor: "rgba(59, 130, 246, 0.5)",
      borderWidth: 1,
      padding: 12,
      titleColor: "rgb(241, 245, 249)",
      bodyColor: "rgba(241, 245, 249, 0.9)",
      titleFont: { size: 13, weight: "bold" },
      bodyFont: { size: 12 },
      titleMarginBottom: 8,
      callbacks: {
        label: (context) => `Study Time: ${context.parsed.y.toFixed(1)} hours`,
        title: (context) => context[0]?.label || "",
      },
      cornerRadius: 10,
      boxPadding: 8,
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: {
        color: "rgba(255, 255, 255, 0.5)",
        font: { size: 11, weight: "normal" },
        padding: 8,
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: {
        color: "rgba(255, 255, 255, 0.06)",
        lineWidth: 1,
      },
      ticks: {
        color: "rgba(255, 255, 255, 0.5)",
        font: { size: 11, weight: "normal" },
        padding: 8,
        callback: (value) => `${value}h`,
      },
    },
  },
};

const WEEKLY_GOAL_OPTIONS: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  animation: {
    duration: 1000,
    easing: "easeInOutCubic",
    animateRotate: true,
    animateScale: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderColor: "rgba(59, 130, 246, 0.5)",
      borderWidth: 1,
      padding: 10,
      titleColor: "rgb(241, 245, 249)",
      bodyColor: "rgba(241, 245, 249, 0.9)",
      displayColors: true,
      cornerRadius: 8,
      callbacks: {
        label: (context) => `${context.label}: ${context.parsed}%`,
      },
    },
  },
};

function createWeeklyStudyData(
  labels: string[],
  hours: number[],
): ChartData<"line"> {
  return {
    labels,
    datasets: [
      {
        label: "Study Hours",
        data: hours,
        borderColor: "#3b82f6",
        backgroundColor: (context: any) => {
          try {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return "rgba(59, 130, 246, 0.1)";

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.bottom,
              0,
              chartArea.top,
            );
            gradient.addColorStop(0, "rgba(59, 130, 246, 0)");
            gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.15)");
            gradient.addColorStop(1, "rgba(59, 130, 246, 0.35)");
            return gradient;
          } catch {
            return "rgba(59, 130, 246, 0.1)";
          }
        },
        fill: true,
        tension: 0.5,
        borderWidth: 3,
        borderCapStyle: "round" as any,
        borderJoinStyle: "round" as any,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#3b82f6",
        pointHoverBorderWidth: 3,
      },
    ],
  };
}

function createWeeklyGoalData(percent: number): ChartData<"doughnut"> {
  return {
    labels: ["Complete", "Remaining"],
    datasets: [
      {
        label: "Weekly Goal",
        data: [percent, 100 - percent],
        backgroundColor: [
          "rgba(59, 130, 246, 0.9)",
          "rgba(255, 255, 255, 0.08)",
        ],
        borderColor: ["rgba(59, 130, 246, 1)", "rgba(255, 255, 255, 0.12)"],
        borderWidth: 2,
        borderRadius: 12,
        spacing: 3,
        hoverOffset: 8,
      },
    ],
  };
}

export function Dashboard() {
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
      icon: Zap,
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

  const quickActions = [
    {
      title: "Start session",
      description: "Launch a focused study timer.",
      icon: Timer,
      accent: "#38bdf8",
    },
    {
      title: "Set goal",
      description: "Adjust your weekly study target.",
      icon: Target,
      accent: "#7c6af7",
    },
    {
      title: "Claim rewards",
      description: "Unlock achievements and coins.",
      icon: Trophy,
      accent: "#f59e0b",
    },
    {
      title: "Review notes",
      description: "Open your latest study notes.",
      icon: Sparkles,
      accent: "#22d3a0",
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

  return (
    <PageContainer className="space-y-8 pb-10">
      <section className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-6 shadow-[0_26px_70px_rgba(7,11,29,0.18)] backdrop-blur-[20px] transition-all duration-250">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-[var(--color-accent-hover)]">
              <Sparkles size={16} />
              Your learning space
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
              Ready to unlock your next study streak?
            </h1>
            <p className="mt-4 max-w-3xl text-base text-[rgba(255,255,255,0.68)] sm:text-lg">
              Track your progress, manage goals, and stay in the zone with
              real-time metrics built for focused learners.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button className="inline-flex items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition duration-250 hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/10 hover:shadow-[0_18px_40px_rgba(56,189,248,0.16)]">
              <Clock3 size={16} className="mr-2" />
              Start session
            </button>
            <button className="inline-flex items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition duration-250 hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/10 hover:shadow-[0_18px_40px_rgba(124,106,247,0.16)]">
              <Target size={16} className="mr-2" />
              Set a goal
            </button>
            <button className="inline-flex items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition duration-250 hover:-translate-y-1 hover:scale-[1.02] hover:bg-white/10 hover:shadow-[0_18px_40px_rgba(245,158,11,0.16)]">
              <Sparkles size={16} className="mr-2" />
              Claim rewards
            </button>
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
                      <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
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

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.85fr)]">
            <Card padding="lg" className="overflow-hidden">
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Weekly study activity
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">
                    Hours recorded in your live study sessions
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[var(--color-success)] shadow-[0_10px_24px_rgba(34,197,94,0.12)]">
                  <Activity size={14} />
                  Real time
                </div>
              </div>
              <div className="h-72 rounded-[14px] bg-gradient-to-b from-[rgba(59,130,246,0.05)] to-transparent p-4">
                <Line data={weeklyData} options={WEEKLY_STUDY_OPTIONS} />
              </div>
            </Card>

            <Card padding="lg" className="relative overflow-hidden">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[rgba(59,130,246,0.16)] blur-3xl" />
              <div className="relative">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Weekly study goal
                </p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">
                  Progress toward your 12-hour target
                </p>
                <div className="relative mx-auto mt-8 h-52 max-w-[240px] rounded-[14px] bg-gradient-to-br from-[rgba(59,130,246,0.1)] to-transparent p-4">
                  <Doughnut
                    data={weeklyGoalData}
                    options={WEEKLY_GOAL_OPTIONS}
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                      {weeklyGoalPercent}%
                    </span>
                    <span className="mt-1 text-[12px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.65)]">
                      complete
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-[rgba(59,130,246,0.08)] to-transparent px-4 py-3 text-sm text-[rgba(255,255,255,0.75)]">
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
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Study goal
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                    of 12h planned study time this week
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[var(--color-warning)] shadow-[0_10px_30px_rgba(245,158,11,0.14)]">
                  <Trophy size={16} />
                  On track
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-4xl font-extrabold text-[var(--color-text-primary)]">
                    {formatStudyHours(metrics.weekSeconds)}
                  </p>
                  <p className="mt-2 text-sm text-[rgba(255,255,255,0.7)]">
                    current total
                  </p>
                </div>
                <div className="flex-1">
                  <div className="h-4 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#fb923c] transition-all duration-250"
                      style={{ width: `${weeklyGoalPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[rgba(255,255,255,0.72)]">
                    <span>{weeklyGoalPercent}% complete</span>
                    <span>
                      {formatStudyHours(
                        Math.max(0, weeklyGoalSeconds - metrics.weekSeconds),
                      )}{" "}
                      left
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="overflow-hidden">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Streak status
                  </p>
                  <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                    Calculated from consecutive session days
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 p-3">
                  <CircularProgress
                    value={Math.min(100, metrics.streakDays * 10)}
                    size={62}
                    strokeWidth={5}
                    color="var(--color-danger)"
                  >
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      {metrics.streakDays}
                    </span>
                  </CircularProgress>
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-[rgba(255,255,255,0.75)]">
                {metrics.streakDays > 0
                  ? "Keep today’s study session going."
                  : "Complete a session today to begin your streak."}
              </div>
            </Card>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Quick actions
                </p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.72)]">
                  Jump into your most common tasks with one click.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map(
                ({ title, description, icon: Icon, accent }) => (
                  <button
                    key={title}
                    className="group rounded-[20px] border border-white/10 bg-white/5 p-5 text-left transition duration-250 hover:-translate-y-1 hover:scale-[1.01] hover:border-cyan-400/30 hover:shadow-[0_24px_70px_rgba(56,189,248,0.12)]"
                  >
                    <div
                      className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.08)]"
                      style={{ color: accent }}
                    >
                      <Icon size={20} />
                    </div>
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {title}
                    </p>
                    <p className="mt-2 text-sm text-[rgba(255,255,255,0.68)]">
                      {description}
                    </p>
                  </button>
                ),
              )}
            </div>
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
