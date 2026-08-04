import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/Progress";
import { PageContainer } from "@/components/layout/PageContainer";
import { BarChart3 } from "lucide-react";

type FocusSession = {
  id: string;
  mode: string;
  start: string;
  duration?: number;
};

function readJSON(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(2);
}

export function Analytics() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);

  useEffect(() => {
    const focus = readJSON("studyos_focus_v1");
    const history = focus && focus.history ? focus.history : [];
    setSessions(history || []);
  }, []);

  // aggregate time windows
  const now = new Date();
  const daySeconds = sessions.reduce(
    (acc, s) => acc + (s.duration || 25 * 60),
    0,
  );

  const monthlySeconds = sessions.reduce((acc, s) => {
    const d = new Date(s.start);
    if (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    )
      return acc + (s.duration || 25 * 60);
    return acc;
  }, 0);

  const weeklySeconds = sessions.reduce((acc, s) => {
    const d = new Date(s.start);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    if (d >= weekStart) return acc + (s.duration || 25 * 60);
    return acc;
  }, 0);

  const modeCounts = sessions.reduce((acc: Record<string, number>, s) => {
    acc[s.mode] = (acc[s.mode] || 0) + 1;
    return acc;
  }, {});

  // lecture completion percent
  const lectureCompletion = useMemo(() => {
    try {
      const raw = localStorage.getItem("studyos_lecture_tracker_v1");
      if (!raw) return { total: 0, completed: 0, percent: 0, byChapter: [] };
      const chapters = JSON.parse(raw) as any[];
      let total = 0,
        completed = 0;
      const byChapter = chapters.map((c: any) => {
        const t = c.lectures?.length || 0;
        const comp =
          c.lectures?.filter((l: any) => l.status === "completed").length || 0;
        total += t;
        completed += comp;
        return {
          name: c.name,
          total: t,
          completed: comp,
          percent: t ? Math.round((comp / t) * 100) : 0,
        };
      });
      return {
        total,
        completed,
        percent: total ? Math.round((completed / total) * 100) : 0,
        byChapter,
      };
    } catch {
      return { total: 0, completed: 0, percent: 0, byChapter: [] };
    }
  }, [sessions]);

  // heatmap: count sessions per day in month
  const heatmap = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = new Date(s.start).toISOString().slice(0, 10);
      counts[day] = (counts[day] || 0) + 1;
    });
    const days = [];
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = new Date(year, month, d).toISOString().slice(0, 10);
      days.push({ day: d, key, count: counts[key] || 0 });
    }
    return days;
  }, [sessions]);

  function exportCSV() {
    const rows = [["id", "mode", "start", "duration_seconds"]];
    sessions.forEach((s) =>
      rows.push([s.id, s.mode, s.start, String(s.duration || "")]),
    );
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studyos_sessions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-info)]/15 flex items-center justify-center text-[var(--color-info)]">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Analytics</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Study insights, completion rates & heatmap</p>
          </div>
        </div>
        <CircularProgress value={lectureCompletion.percent} size={64} strokeWidth={5}>
          <div className="text-xs font-bold">{lectureCompletion.percent}%</div>
        </CircularProgress>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Study Hours</p>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Today</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{formatHours(daySeconds)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">This week</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{formatHours(weeklySeconds)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">This month</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{formatHours(monthlySeconds)}h</span>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Mode Distribution</p>
          <div>
            {Object.entries(modeCounts).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between text-sm py-1"
              >
                <div>{k}</div>
                <div>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Export Data</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Download focus session history as CSV.</p>
          <Button variant="primary" onClick={exportCSV}>
            Export Sessions CSV
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Lecture Completion</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">{lectureCompletion.completed}/{lectureCompletion.total} lectures completed</p>
          <div className="mt-3 space-y-2">
            {lectureCompletion.byChapter.map((c: any) => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>{c.name}</div>
                  <div>{c.percent}%</div>
                </div>
                <div className="w-full">
                  <div
                    style={{ width: `${c.percent}%` }}
                    className="h-2 bg-[var(--color-accent)] rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Activity Heatmap — This Month</p>
          <div className="grid grid-cols-7 gap-1.5 mt-2">
            {heatmap.map((d) => (
              <div
                key={d.key}
                title={`${d.key}: ${d.count} session${d.count !== 1 ? 's' : ''}`}
                className={`h-7 rounded-md transition-colors ${
                  d.count === 0 ? "bg-white/5" :
                  d.count < 2 ? "bg-[var(--color-accent)]/30" :
                  d.count < 4 ? "bg-[var(--color-accent)]/60" :
                  "bg-[var(--color-accent)]"
                }`}
              />
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default Analytics;
