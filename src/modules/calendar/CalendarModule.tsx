import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Download,
  Share2,
  Bell,
  MapPin,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  FileText,
  Link,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GradientText } from '@/components/ui/GradientText';
import { cn } from '@/lib/utils';

export function CalendarModule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  ).getDay();

  const events = [
    { date: 5, title: 'Math Exam', type: 'exam', color: 'rose' },
    { date: 12, title: 'Physics Lecture', type: 'lecture', color: 'primary' },
    { date: 15, title: 'Revision Session', type: 'revision', color: 'accent' },
    { date: 20, title: 'Chemistry Quiz', type: 'exam', color: 'emerald' },
  ];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventForDate = (date: number) => {
    return events.find((e) => e.date === date);
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Animated Background Glow */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute bottom-40 -left-40 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold">
                <span className="shimmer-text">Calendar</span>
              </h1>
              <p className="mt-2 text-xl text-gray-400">
                Manage exam dates, lecture & revision schedules
              </p>
            </div>
            <div className="flex gap-3">
              <AnimatedButton variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Export ICS
              </AnimatedButton>
              <AnimatedButton variant="outline" size="sm">
                <Link className="h-4 w-4" />
                Google Calendar
              </AnimatedButton>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-pink-500/30 blur-xl" />
              <GlassCard className="relative p-6">
                {/* Calendar Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">
                      {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <span className="rounded-full bg-accent-500/20 px-3 py-1 text-sm text-accent-300">
                      {events.length} Events
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={prevMonth}
                      className="rounded-lg bg-white/5 p-2 transition-all hover:bg-white/10"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-400" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="rounded-lg bg-white/5 p-2 transition-all hover:bg-white/10"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-lg" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const date = i + 1;
                    const event = getEventForDate(date);
                    const isToday =
                      date === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear();
                    const isSelected = selectedDate === date;

                    return (
                      <motion.button
                        key={date}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          'relative aspect-square rounded-lg transition-all',
                          isToday && 'ring-2 ring-primary-500',
                          isSelected && 'bg-primary-500/20',
                          event && 'hover:scale-105',
                        )}
                      >
                        <div className="flex h-full flex-col items-center justify-center">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isToday ? 'text-white' : 'text-gray-300',
                              event && 'text-white',
                            )}
                          >
                            {date}
                          </span>
                          {event && (
                            <div
                              className="mt-0.5 h-1.5 w-1.5 rounded-full"
                              style={{
                                background: `var(--color-${event.color}-500)`,
                                boxShadow: `0 0 10px var(--color-${event.color}-500)`,
                              }}
                            />
                          )}
                        </div>
                        {event && (
                          <div className="absolute -right-1 -top-1">
                            <Sparkles className="h-3 w-3 text-accent-500" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Add Event & Upcoming */}
          <div className="space-y-6">
            {/* Add Event */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl" />
              <GlassCard className="relative p-6">
                <h2 className="mb-4 text-xl font-bold text-white">Add Event</h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Event Title"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                    <input
                      type="date"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Location"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
                  />
                  <AnimatedButton className="w-full">
                    <Plus className="h-4 w-4" />
                    Add Event
                  </AnimatedButton>
                </div>
              </GlassCard>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-accent-500/20 to-pink-500/20 blur-xl" />
              <GlassCard className="relative p-6">
                <h2 className="mb-4 text-xl font-bold text-white">Upcoming Events</h2>
                <div className="space-y-3">
                  {events.map((event, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center gap-3 rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10"
                    >
                      <div
                        className="rounded-lg p-2"
                        style={{
                          background: `rgba(var(--glow-${event.color}), 0.15)`,
                        }}
                      >
                        <CalendarIcon
                          className="h-5 w-5"
                          style={{
                            color: `var(--color-${event.color}-500)`,
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{event.title}</h3>
                        <p className="text-sm text-gray-400">
                          {months[currentDate.getMonth()]} {event.date}
                        </p>
                      </div>
                      <button className="rounded-lg p-2 transition-all hover:bg-white/10">
                        <Bell className="h-4 w-4 text-gray-400" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
