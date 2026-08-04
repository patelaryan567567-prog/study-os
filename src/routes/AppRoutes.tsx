import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./AuthRouteGuards";
import { ROUTE_PATHS } from "./paths";
import { Suspense, lazy } from "react";

// Lazy-loaded pages to reduce initial bundle size
const LoginPage = lazy(() =>
  import("@/modules/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("@/modules/dashboard/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);
const FocusModePage = lazy(() =>
  import("@/modules/focus/FocusMode").then((m) => ({ default: m.FocusMode })),
);
const StudyPlannerPage = lazy(() =>
  import("@/modules/planner/StudyPlanner").then((m) => ({
    default: m.StudyPlanner,
  })),
);
const TaskManagerPage = lazy(() =>
  import("@/modules/tasks/TaskManager").then((m) => ({
    default: m.TaskManager,
  })),
);
const LectureTrackerPage = lazy(() =>
  import("@/modules/lectures/LectureTracker").then((m) => ({
    default: m.LectureTracker,
  })),
);
const ModuleTrackerPage = lazy(() =>
  import("@/modules/modules-tracker/ModuleTracker").then((m) => ({
    default: m.ModuleTracker,
  })),
);
const BacklogManagerPage = lazy(() =>
  import("@/modules/backlog/BacklogManager").then((m) => ({
    default: m.BacklogManager,
  })),
);
const RevisionManagerPage = lazy(() =>
  import("@/modules/revision/RevisionManager").then((m) => ({
    default: m.RevisionManager,
  })),
);
const NotesPage = lazy(() =>
  import("@/modules/notes/Notes").then((m) => ({ default: m.Notes })),
);
const AnalyticsPage = lazy(() =>
  import("@/modules/analytics/Analytics").then((m) => ({
    default: m.Analytics,
  })),
);
const GamificationPage = lazy(() =>
  import("@/modules/gamification/Gamification").then((m) => ({
    default: m.Gamification,
  })),
);
const CalendarPage = lazy(() =>
  import("@/modules/calendar/CalendarModule").then((m) => ({
    default: m.CalendarModule,
  })),
);
const AIAssistantPage = lazy(() =>
  import("@/modules/ai/AIAssistant").then((m) => ({ default: m.AIAssistant })),
);
const SettingsPage = lazy(() =>
  import("@/modules/settings/Settings").then((m) => ({ default: m.Settings })),
);
const UserProfilePage = lazy(() =>
  import("@/modules/profile/UserProfile").then((m) => ({
    default: m.UserProfile,
  })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<div />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTE_PATHS.login} element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTE_PATHS.dashboard} element={<DashboardPage />} />
            <Route path={ROUTE_PATHS.focus} element={<FocusModePage />} />
            <Route path={ROUTE_PATHS.planner} element={<StudyPlannerPage />} />
            <Route path={ROUTE_PATHS.tasks} element={<TaskManagerPage />} />
            <Route
              path={ROUTE_PATHS.lectures}
              element={<LectureTrackerPage />}
            />
            <Route path={ROUTE_PATHS.modules} element={<ModuleTrackerPage />} />
            <Route
              path={ROUTE_PATHS.backlog}
              element={<BacklogManagerPage />}
            />
            <Route
              path={ROUTE_PATHS.revision}
              element={<RevisionManagerPage />}
            />
            <Route path={ROUTE_PATHS.notes} element={<NotesPage />} />
            <Route path={ROUTE_PATHS.analytics} element={<AnalyticsPage />} />
            <Route
              path={ROUTE_PATHS.gamification}
              element={<GamificationPage />}
            />
            <Route path={ROUTE_PATHS.calendar} element={<CalendarPage />} />
            <Route path={ROUTE_PATHS.ai} element={<AIAssistantPage />} />
            <Route path={ROUTE_PATHS.settings} element={<SettingsPage />} />
            <Route path={ROUTE_PATHS.profile} element={<UserProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
