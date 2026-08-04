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
    <div className="flex h-full w-full overflow-hidden" style={{ background: '#07070f' }}>

      {/* ── Multi-color ambient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Purple — top left */}
        <div style={{
          position: 'absolute', top: '-120px', left: '-80px',
          width: '520px', height: '520px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 65%)',
          filter: 'blur(1px)',
        }} />
        {/* Cyan — top right */}
        <div style={{
          position: 'absolute', top: '-60px', right: '10%',
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 65%)',
          filter: 'blur(1px)',
        }} />
        {/* Green — bottom left */}
        <div style={{
          position: 'absolute', bottom: '-80px', left: '20%',
          width: '340px', height: '340px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,160,0.06) 0%, transparent 65%)',
          filter: 'blur(1px)',
        }} />
        {/* Amber — bottom right */}
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-60px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)',
          filter: 'blur(1px)',
        }} />
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* ── Sidebar ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Sidebar />
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
