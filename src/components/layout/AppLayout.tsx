import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAppStore } from '@/store';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/focus': 'Focus Mode',
  '/planner': 'Study Planner',
  '/tasks': 'Task Manager',
  '/lectures': 'Lecture Tracker',
  '/modules': 'Module Tracker',
  '/backlog': 'Backlog Manager',
  '/revision': 'Revision Manager',
  '/notes': 'Notes',
  '/analytics': 'Analytics',
  '/gamification': 'Achievements',
  '/calendar': 'Calendar',
  '/ai': 'AI Assistant',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

const orbStyle = (
  top: string | undefined,
  bottom: string | undefined,
  left: string | undefined,
  right: string | undefined,
  width: string,
  height: string,
  color: string,
) => ({
  position: 'absolute' as const,
  ...(top !== undefined && { top }),
  ...(bottom !== undefined && { bottom }),
  ...(left !== undefined && { left }),
  ...(right !== undefined && { right }),
  width,
  height,
  borderRadius: '50%',
  background: color,
  filter: 'blur(80px)',
});

export function AppLayout() {
  const { focusMode } = useAppStore();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'StudyOS';

  if (focusMode) {
    return (
      <div className="h-full w-full" style={{ background: 'var(--color-bg-primary)' }}>
        <Outlet />
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at top,#1e3a8a22 0%,transparent 35%), radial-gradient(circle at bottom right,#7c3aed18 0%,transparent 40%), linear-gradient(180deg,#030712 0%,#0b1120 100%)',
      }}
    >
      {/* ── Multi-color ambient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Purple — top left */}
        <div style={orbStyle('-162px', undefined, '-108px', undefined, '702px', '702px',
          'radial-gradient(circle, rgba(124,106,247,0.096) 0%, transparent 65%)')} />
        {/* Cyan — top right */}
        <div style={orbStyle('-81px', undefined, undefined, '10%', '513px', '513px',
          'radial-gradient(circle, rgba(56,189,248,0.064) 0%, transparent 65%)')} />
        {/* Green — bottom left */}
        <div style={orbStyle(undefined, '-108px', '20%', undefined, '459px', '459px',
          'radial-gradient(circle, rgba(34,211,160,0.048) 0%, transparent 65%)')} />
        {/* Amber — bottom right */}
        <div style={orbStyle(undefined, '-81px', undefined, '-81px', '540px', '540px',
          'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)')} />
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.008) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.008) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* ── Sidebar ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Sidebar />
      </div>

      {/* ── Main area ── */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
              style={{
                padding: 'clamp(12px, 2vw, 24px)',
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
