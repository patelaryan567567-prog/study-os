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
      style={{ background: '#05060f' }}
    >
      {/* ── Ambient orbs — subtle, no white ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={orbStyle('-200px', undefined, '-150px', undefined, '700px', '700px',
          'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)')} />
        <div style={orbStyle('-100px', undefined, undefined, '5%', '500px', '500px',
          'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 60%)')} />
        <div style={orbStyle(undefined, '-150px', '15%', undefined, '450px', '450px',
          'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)')} />
        <div style={orbStyle(undefined, '-100px', undefined, '-100px', '500px', '500px',
          'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 60%)')} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
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
