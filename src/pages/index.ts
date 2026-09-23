// Page entry points re-export module screens without duplicating feature code.
export { LoginPage } from '@/modules/auth/LoginPage';
export { Dashboard as DashboardPage } from '@/modules/dashboard/Dashboard';
export { FocusMode as FocusModePage } from '@/modules/focus/FocusMode';
export { StudyPlanner as StudyPlannerPage } from '@/modules/planner/StudyPlanner';
export { TaskManager as TaskManagerPage } from '@/modules/tasks/TaskManager';
export { LectureTracker as LectureTrackerPage } from '@/modules/lectures/LectureTracker';
export { ModuleTracker as ModuleTrackerPage } from '@/modules/modules-tracker/ModuleTracker';
export { BacklogManager as BacklogManagerPage } from '@/modules/backlog/BacklogManager';
export { RevisionManager as RevisionManagerPage } from '@/modules/revision/RevisionManager';
export { Notes as NotesPage } from '@/modules/notes/Notes';
export { Analytics as AnalyticsPage } from '@/modules/analytics/Analytics';
export { Gamification as GamificationPage } from '@/modules/gamification/Gamification';
export { CalendarModule as CalendarPage } from '@/modules/calendar/CalendarModule';
export { AIAssistant as AIAssistantPage } from '@/modules/ai/AIAssistant';
export { Settings as SettingsPage } from '@/modules/settings/Settings';
export { UserProfile as UserProfilePage } from '@/modules/profile/UserProfile';
