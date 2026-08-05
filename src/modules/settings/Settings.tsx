import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon,
  Sun,
  Monitor,
  Globe,
  Calendar,
  Bell,
  Keyboard,
  Download,
  Upload,
  BookOpen,
  Palette,
  Languages,
  Volume2,
  Shield,
  Database,
  Zap,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GradientText } from '@/components/ui/GradientText';
import { cn } from '@/utils';

export function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  const settingsSections = [
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize how StudyOS looks',
      children: (
        <div className="flex gap-3 mt-4">
          {[
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'system', icon: Monitor, label: 'System' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value as any)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 rounded-xl p-4 transition-all',
                theme === option.value
                  ? 'bg-primary-500/20 border-2 border-primary-500'
                  : 'bg-gray-100 dark:bg-gray-800/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600',
              )}
            >
              <option.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: Languages,
      title: 'Language & Region',
      description: 'Set your preferred language and date format',
      children: (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Display Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2"
            >
              <option value="en">???? English</option>
              <option value="hi">???? Hindi</option>
              <option value="es">???? Spanish</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Date Format</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage how you receive alerts',
      children: (
        <div className="space-y-3 mt-4">
          {[
            { label: 'Desktop Notifications', desc: 'Show system notifications' },
            { label: 'Browser Push Alerts', desc: 'Receive push notifications in browser' },
            { label: 'In-App Notifications', desc: 'Show toast messages inside app' },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors data-[checked]:bg-primary-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform data-[checked]:translate-x-6" />
              </div>
            </div>
          ))}
          <AnimatedButton variant="outline" size="sm" className="mt-2">
            Request Browser Permission
          </AnimatedButton>
        </div>
      ),
    },
    {
      icon: Keyboard,
      title: 'Keyboard Shortcuts',
      description: 'Custom keyboard shortcuts for faster workflow',
      children: (
        <div className="space-y-2 mt-4">
          {[
            { action: 'Start Pomodoro', shortcut: '? + P' },
            { action: 'New Note', shortcut: '? + N' },
            { action: 'Quick Reminder', shortcut: '? + R' },
          ].map((item) => (
            <div
              key={item.action}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.action}</span>
              <kbd className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-mono text-gray-700 dark:text-gray-300">
                {item.shortcut}
              </kbd>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Database,
      title: 'Backup & Restore',
      description: 'Export your data or restore from backup',
      children: (
        <div className="flex gap-3 mt-4">
          <AnimatedButton variant="outline" className="flex-1">
            <Download className="h-4 w-4" />
            Export Backup
          </AnimatedButton>
          <AnimatedButton variant="outline" className="flex-1">
            <Upload className="h-4 w-4" />
            Restore
          </AnimatedButton>
        </div>
      ),
    },
    {
      icon: BookOpen,
      title: 'Lecture Tracker',
      description: 'Create chapters and track your lectures',
      children: (
        <div className="mt-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="New chapter name (e.g., CHA)"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <AnimatedButton size="sm">Add Chapter</AnimatedButton>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-8">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            <GradientText from="from-primary-500" to="to-accent-500">Settings</GradientText>
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Customize your StudyOS experience</p>
        </motion.div>

        <div className="space-y-6">
          {settingsSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary-500/10 p-3">
                    <section.icon className="h-6 w-6 text-primary-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
                    {section.children}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
