import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Timer, CalendarDays, CheckSquare, PlayCircle,
  BookOpen, AlertTriangle, RotateCcw, FileText, BarChart3,
  Trophy, Calendar, Bot, Settings, ChevronLeft, ChevronRight,
  Zap, GraduationCap, UserRound
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/utils';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
      { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
    ]
  },
  {
    label: 'Study',
    items: [
      { id: 'focus', label: 'Focus Mode', icon: Timer, path: '/focus' },
      { id: 'planner', label: 'Study Planner', icon: CalendarDays, path: '/planner' },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks' },
      { id: 'lectures', label: 'Lectures', icon: PlayCircle, path: '/lectures' },
      { id: 'modules', label: 'Modules', icon: BookOpen, path: '/modules' },
    ]
  },
  {
    label: 'Manage',
    items: [
      { id: 'backlog', label: 'Backlog', icon: AlertTriangle, path: '/backlog' },
      { id: 'revision', label: 'Revision', icon: RotateCcw, path: '/revision' },
      { id: 'notes', label: 'Notes', icon: FileText, path: '/notes' },
    ]
  },
  {
    label: 'Personal',
    items: [
      { id: 'gamification', label: 'Achievements', icon: Trophy, path: '/gamification' },
      { id: 'ai', label: 'AI Assistant', icon: Bot, path: '/ai' },
      { id: 'profile', label: 'Profile', icon: UserRound, path: '/profile' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ]
  },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 224 }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="flex flex-col h-full shrink-0 relative z-10"
      style={{
        background: 'linear-gradient(180deg, rgba(13,13,26,0.98) 0%, rgba(10,10,20,0.98) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[60px] shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c6af7, #38bdf8)', boxShadow: '0 0 16px rgba(124,106,247,0.4)' }}>
          <GraduationCap size={15} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <span className="font-bold text-sm text-gradient whitespace-nowrap tracking-wide">StudyOS</span>
              <p className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap -mt-0.5">Learning Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => {
          return (
            <div key={group.label}>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="label-xs px-3 mb-1.5"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 w-full text-left group',
                        active
                          ? 'text-white'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      )}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(124,106,247,0.2), rgba(124,106,247,0.08))',
                        border: '1px solid rgba(124,106,247,0.25)',
                        boxShadow: '0 2px 12px rgba(124,106,247,0.15)',
                      } : {
                        background: 'transparent',
                        border: '1px solid transparent',
                      }}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon size={16} className={cn('shrink-0 transition-colors', active ? 'text-[var(--color-accent-hover)]' : 'group-hover:text-[var(--color-text-primary)]')} />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm font-medium whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c6af7, #38bdf8)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{user.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Zap size={9} className="text-[var(--color-warning)] shrink-0" />
                    <p className="text-[10px] text-[var(--color-text-muted)]">Level {user.level}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-[30px] w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 z-20 hover:scale-110"
        style={{
          background: 'var(--color-bg-tertiary)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--color-text-muted)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </motion.aside>
  );
}
