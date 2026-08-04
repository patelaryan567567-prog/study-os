export const ROUTE_PATHS = {
  login: '/login',
  dashboard: '/',
  focus: '/focus',
  planner: '/planner',
  tasks: '/tasks',
  lectures: '/lectures',
  modules: '/modules',
  backlog: '/backlog',
  revision: '/revision',
  notes: '/notes',
  analytics: '/analytics',
  gamification: '/gamification',
  calendar: '/calendar',
  ai: '/ai',
  settings: '/settings',
  profile: '/profile',
} as const;

export type AppRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
