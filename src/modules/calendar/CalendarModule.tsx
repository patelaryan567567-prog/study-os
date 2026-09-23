import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Plus,
  Download,
  Bell,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Link,
  Trash2,
  Edit2,
  X,
  ChevronDown,
} from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { cn } from "@/lib/utils";
import { persistStore, loadStore } from "@/services/appDataSync";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  type: "exam" | "lecture" | "revision" | "other";
  color: "rose" | "primary" | "accent" | "emerald" | "cyan" | "pink";
  reminder: number; // minutes before event
  location?: string;
  notes?: string;
}

const EVENTS_KEY = "studyos_calendar_events_v1";
export function CalendarModule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    // Hydrate synchronously so the persist effect below can never overwrite
    // saved events with the empty initial state on mount.
    try {
      const savedEvents = localStorage.getItem(EVENTS_KEY);
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore corrupted storage */
    }
    return [];
  });
  const importRef = useRef<HTMLInputElement>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    date: string;
    type: CalendarEvent["type"];
    color: CalendarEvent["color"];
    reminder: number;
    location: string;
    notes: string;
  }>({
    title: "",
    date: "",
    type: "exam",
    color: "primary",
    reminder: 15,
    location: "",
    notes: "",
  });

  // Save events to localStorage + cloud (debounced) so they sync across devices.
  useEffect(() => {
    persistStore(EVENTS_KEY, events);
  }, [events]);

  // Pull this account's cloud copy once on mount (merges with anything already
  // saved locally) so events added on another device appear immediately.
  useEffect(() => {
    let cancelled = false;
    void loadStore<CalendarEvent[]>(EVENTS_KEY, [])
      .then((restored) => {
        if (cancelled || !restored.length) return;
        setEvents(restored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // AI additions write to localStorage directly — reload when they land.
  useEffect(() => {
    const reload = () => {
      try {
        const savedEvents = localStorage.getItem(EVENTS_KEY);
        const parsed = savedEvents ? JSON.parse(savedEvents) : [];
        if (Array.isArray(parsed)) setEvents(parsed);
      } catch {
        /* ignore corrupted storage */
      }
    };
    window.addEventListener("studyos-data-changed", reload);
    return () => window.removeEventListener("studyos-data-changed", reload);
  }, []);

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

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDate = (date: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    return events
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };
  const exportIcs = () => {
    const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
    const body = events.map((e) => ["BEGIN:VEVENT", `UID:${e.id}@studyos`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`, `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `SUMMARY:${esc(e.title)}`, e.location ? `LOCATION:${esc(e.location)}` : "", e.notes ? `DESCRIPTION:${esc(e.notes)}` : "", "END:VEVENT"].filter(Boolean).join("\r\n")).join("\r\n");
    const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StudyOS//EN\r\n${body}\r\nEND:VCALENDAR\r\n`], { type: "text/calendar" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "studyos-calendar.ics"; a.click(); URL.revokeObjectURL(url);
  };
  const importIcs = async (file: File) => {
    const text = await file.text(); const imported: CalendarEvent[] = [];
    for (const block of text.split("BEGIN:VEVENT").slice(1)) {
      const get = (key: string) => block.match(new RegExp(`^${key}[^:]*:(.*)$`, "m"))?.[1]?.trim();
      const rawDate = get("DTSTART"), title = get("SUMMARY"); if (!rawDate || !title) continue;
      imported.push({ id: `ics_${Date.now()}_${imported.length}`, title, date: `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`, type: "other", color: "primary", reminder: 15, location: get("LOCATION"), notes: get("DESCRIPTION") });
    }
    setEvents((old) => [...old, ...imported]);
  };

  const handleAddEvent = () => {
    if (!formData.title || !formData.date) {
      alert("Please fill in title and date");
      return;
    }

    if (editingEvent) {
      // Update event
      setEvents(
        events.map((e) =>
          e.id === editingEvent.id
            ? {
                ...e,
                title: formData.title,
                date: formData.date,
                type: formData.type,
                color: formData.color,
                reminder: formData.reminder,
                location: formData.location,
                notes: formData.notes,
              }
            : e,
        ),
      );
      setEditingEvent(null);
    } else {
      // Add new event
      const newEvent: CalendarEvent = {
        id: `${Date.now()}`,
        title: formData.title,
        date: formData.date,
        type: formData.type,
        color: formData.color,
        reminder: formData.reminder,
        location: formData.location,
        notes: formData.notes,
      };
      setEvents([...events, newEvent]);
    }

    // Reset form
    setFormData({
      title: "",
      date: "",
      type: "exam",
      color: "primary",
      reminder: 15,
      location: "",
      notes: "",
    });
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      type: event.type as CalendarEvent["type"],
      color: event.color as CalendarEvent["color"],
      reminder: event.reminder,
      location: event.location || "",
      notes: event.notes || "",
    });
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-4 sm:p-6 md:p-8">
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
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <span className="shimmer-text">Calendar</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base md:text-xl text-gray-400">
                Manage exam dates, lecture & revision schedules
              </p>
            </div>
            <div className="flex gap-3">
              <AnimatedButton variant="outline" size="sm" onClick={exportIcs}>
                <Download className="h-4 w-4" />
                Export ICS
              </AnimatedButton>
              <AnimatedButton variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                <Link className="h-4 w-4" />
                Import ICS
              </AnimatedButton>
              <input ref={importRef} className="hidden" type="file" accept=".ics,text/calendar" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importIcs(file); e.target.value = ""; }} />
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
              <GlassCard className="relative p-4 sm:p-6">
                {/* Calendar Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {months[currentDate.getMonth()]}{" "}
                      {currentDate.getFullYear()}
                    </h2>
                    <span className="rounded-full bg-accent-500/20 px-2 sm:px-3 py-1 text-xs sm:text-sm text-accent-300">
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
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {days.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs sm:text-sm font-medium text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-lg"
                    />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const date = i + 1;
                    const dateEvents = getEventsForDate(date);
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
                          "relative aspect-square rounded-lg transition-all text-xs sm:text-sm",
                          isToday && "ring-2 ring-primary-500",
                          isSelected && "bg-primary-500/20",
                          dateEvents.length > 0 && "hover:scale-105",
                        )}
                      >
                        <div className="flex h-full flex-col items-center justify-center gap-0.5">
                          <span
                            className={cn(
                              "font-medium",
                              isToday ? "text-white" : "text-gray-300",
                              dateEvents.length > 0 && "text-white",
                            )}
                          >
                            {date}
                          </span>
                          {dateEvents.length > 0 && (
                            <div className="flex gap-0.5">
                              {dateEvents.slice(0, 2).map((evt) => (
                                <div
                                  key={evt.id}
                                  className="h-1 w-1 rounded-full"
                                  style={{
                                    background: `var(--color-${evt.color}-500)`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>

            {/* Selected Date Events */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative mt-6"
              >
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-accent-500/30 to-pink-500/30 blur-xl" />
                <GlassCard className="relative p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                    {months[currentDate.getMonth()]} {selectedDate} Events
                  </h3>
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      No events scheduled for this date
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {getEventsForDate(selectedDate).map((evt) => (
                        <motion.div
                          key={evt.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10"
                        >
                          <div
                            className="rounded-lg p-2 flex-shrink-0"
                            style={{
                              background: `rgba(var(--glow-${evt.color}), 0.15)`,
                            }}
                          >
                            <CalendarIcon
                              className="h-4 w-4 sm:h-5 sm:w-5"
                              style={{
                                color: `var(--color-${evt.color}-500)`,
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-sm sm:text-base truncate">
                              {evt.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-400">
                              {evt.type} • Reminder: {evt.reminder} min before
                            </p>
                            {evt.location && (
                              <p className="text-xs text-gray-500">
                                {evt.location}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditEvent(evt)}
                              className="rounded-lg p-2 transition-all hover:bg-white/10"
                            >
                              <Edit2 className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="rounded-lg p-2 transition-all hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* Add Event & Upcoming */}
          <div className="space-y-6">
            {/* Add Event Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl" />
              <GlassCard className="relative p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {editingEvent ? "Edit Event" : "Add Event"}
                  </h2>
                  {editingEvent && (
                    <button
                      onClick={() => {
                        setEditingEvent(null);
                        setFormData({
                          title: "",
                          date: "",
                          type: "exam",
                          color: "primary",
                          reminder: 15,
                          location: "",
                          notes: "",
                        });
                      }}
                      className="p-1 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <X className="h-5 w-5 text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Event Title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 sm:py-3 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm"
                  />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 sm:py-3 text-white focus:border-primary-500 focus:outline-none text-sm"
                  />
                  <Select.Root
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value as CalendarEvent["type"],
                      })
                    }
                  >
                    <Select.Trigger className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 sm:py-3 text-white focus:border-primary-500 focus:outline-none text-sm inline-flex items-center justify-between">
                      <Select.Value />
                      <Select.Icon className="ml-2">
                        <ChevronDown className="h-4 w-4" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="rounded-xl border border-white/10 bg-gray-900 shadow-lg overflow-hidden z-50">
                        <Select.Viewport className="p-1">
                          <Select.Item
                            value="exam"
                            className="px-4 py-2 text-sm text-white hover:bg-primary-500/20 cursor-pointer rounded-lg outline-none"
                          >
                            <Select.ItemText>Exam</Select.ItemText>
                          </Select.Item>
                          <Select.Item
                            value="lecture"
                            className="px-4 py-2 text-sm text-white hover:bg-primary-500/20 cursor-pointer rounded-lg outline-none"
                          >
                            <Select.ItemText>Lecture</Select.ItemText>
                          </Select.Item>
                          <Select.Item
                            value="revision"
                            className="px-4 py-2 text-sm text-white hover:bg-primary-500/20 cursor-pointer rounded-lg outline-none"
                          >
                            <Select.ItemText>Revision</Select.ItemText>
                          </Select.Item>
                          <Select.Item
                            value="other"
                            className="px-4 py-2 text-sm text-white hover:bg-primary-500/20 cursor-pointer rounded-lg outline-none"
                          >
                            <Select.ItemText>Other</Select.ItemText>
                          </Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                  <input
                    type="text"
                    placeholder="Location (optional)"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 sm:py-3 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm"
                  />
                  <div>
                    <label className="text-xs sm:text-sm text-gray-400 mb-2 block">
                      Reminder: {formData.reminder} minutes before
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      step="5"
                      value={formData.reminder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reminder: parseInt(e.target.value),
                        })
                      }
                      className="w-full rounded-xl cursor-pointer"
                      style={{
                        height: "6px",
                      }}
                    />
                  </div>
                  <textarea
                    placeholder="Notes (optional)"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 sm:py-3 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <AnimatedButton onClick={handleAddEvent} className="flex-1">
                      <Plus className="h-4 w-4" />
                      {editingEvent ? "Update" : "Add"} Event
                    </AnimatedButton>
                    {editingEvent && (
                      <AnimatedButton
                        variant="outline"
                        onClick={() => {
                          setEditingEvent(null);

                          setFormData({
                            title: "",
                            date: "",
                            type: "exam",
                            color: "primary",
                            reminder: 15,
                            location: "",
                            notes: "",
                          });
                        }}
                      >
                        Cancel
                      </AnimatedButton>
                    )}
                  </div>
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
              <GlassCard className="relative p-4 sm:p-6">
                <h2 className="mb-4 text-lg sm:text-xl font-bold text-white">
                  Upcoming Events
                </h2>
                {getUpcomingEvents().length === 0 ? (
                  <p className="text-gray-400 text-sm">No upcoming events</p>
                ) : (
                  <div className="space-y-3">
                    {getUpcomingEvents().map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-2 sm:gap-3 rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10"
                      >
                        <div
                          className="rounded-lg p-1.5 sm:p-2 flex-shrink-0"
                          style={{
                            background: `rgba(var(--glow-${event.color}), 0.15)`,
                          }}
                        >
                          <CalendarIcon
                            className="h-4 w-4 sm:h-5 sm:w-5"
                            style={{
                              color: `var(--color-${event.color}-500)`,
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm truncate">
                            {event.title}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="rounded-lg p-1.5 sm:p-2 transition-all hover:bg-white/10 flex-shrink-0"
                        >
                          <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-4 sm:p-6 md:p-8">
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
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <span className="shimmer-text">Calendar</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base md:text-xl text-gray-400">
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
                      {months[currentDate.getMonth()]}{" "}
                      {currentDate.getFullYear()}
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
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-lg"
                    />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const date = i + 1;
                    const events_for_date = getEventsForDate(date);
                    const isToday =
                      date === new Date().getDate() &&
                      currentDate.getMonth() === new Date().getMonth() &&
                      currentDate.getFullYear() === new Date().getFullYear();
                    const isSelected = selectedDate === date;

                    const hasEvent = events_for_date.length > 0;
                    const event = events_for_date[0];
                    return (
                      <motion.button
                        key={date}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "relative aspect-square rounded-lg transition-all",
                          isToday && "ring-2 ring-primary-500",
                          isSelected && "bg-primary-500/20",
                          hasEvent && "hover:scale-105",
                        )}
                      >
                        <div className="flex h-full flex-col items-center justify-center">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isToday ? "text-white" : "text-gray-300",
                              hasEvent && "text-white",
                            )}
                          >
                            {date}
                          </span>
                          {hasEvent && event && (
                            <div
                              className="mt-0.5 h-1.5 w-1.5 rounded-full"
                              style={{
                                background: `var(--color-${event.color}-500)`,
                                boxShadow: `0 0 10px var(--color-${event.color}-500)`,
                              }}
                            />
                          )}
                        </div>
                        {hasEvent && (
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
                <h2 className="mb-4 text-xl font-bold text-white">
                  Upcoming Events
                </h2>
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
                        <h3 className="font-semibold text-white">
                          {event.title}
                        </h3>
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
