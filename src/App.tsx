import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Layout } from "@/components/layout/Layout";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastContainer } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/common";
import { Dashboard } from "@/modules/dashboard/Dashboard";
import { Settings } from "@/modules/settings/Settings";
import { TaskManager } from "@/modules/tasks/TaskManager";
import { LectureTracker as Lectures } from "@/modules/lectures/LectureTracker";
import { Analytics } from "@/modules/analytics/Analytics";
import { CalendarModule as Calendar } from "@/modules/calendar/CalendarModule";

const Focus = lazy(() =>
  import("@/modules/focus/FocusMode").then((m) => ({ default: m.FocusMode })),
);
const Planner = lazy(() =>
  import("@/modules/planner/StudyPlanner").then((m) => ({
    default: m.StudyPlanner,
  })),
);
const Modules = lazy(() =>
  import("@/modules/modules-tracker/ModuleTracker").then((m) => ({
    default: m.ModuleTracker,
  })),
);
const Achievements = lazy(() =>
  import("@/modules/gamification/Gamification").then((m) => ({
    default: m.Gamification,
  })),
);

function App() {
  const loadingFallback = (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
    </div>
  );

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route
                  path="focus"
                  element={
                    <Suspense fallback={loadingFallback}>
                      <Focus />
                    </Suspense>
                  }
                />
                <Route
                  path="planner"
                  element={
                    <Suspense fallback={loadingFallback}>
                      <Planner />
                    </Suspense>
                  }
                />
                <Route path="tasks" element={<TaskManager />} />
                <Route path="lectures" element={<Lectures />} />
                <Route
                  path="modules"
                  element={
                    <Suspense fallback={loadingFallback}>
                      <Modules />
                    </Suspense>
                  }
                />
                <Route path="analytics" element={<Analytics />} />
                <Route
                  path="achievements"
                  element={
                    <Suspense fallback={loadingFallback}>
                      <Achievements />
                    </Suspense>
                  }
                />
                <Route path="calendar" element={<Calendar />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ErrorBoundary>
          <ToastContainer />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
