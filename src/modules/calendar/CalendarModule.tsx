import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type EventItem = {
  id: string;
  title: string;
  type: "exam" | "lecture" | "revision" | "other";
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
};

const STORAGE_KEY = "studyos_calendar_v1";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function readJSON(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CalendarModule() {
  const [events, setEvents] = useState<EventItem[]>(
    () => readJSON(STORAGE_KEY) || [],
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventItem["type"]>("lecture");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {}
  }, [events]);

  const upcoming = useMemo(
    () =>
      events
        .slice()
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        ),
    [events],
  );

  function addEvent() {
    if (!title || !start) return;
    const e: EventItem = {
      id: uid("e_"),
      title,
      type,
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : undefined,
      allDay,
      location,
    };
    setEvents((prev) => [e, ...prev]);
    // create a reminder entry in SmartReminder storage
    try {
      const raw = localStorage.getItem("studyos_reminders_v1");
      const reminders = raw ? JSON.parse(raw) : [];
      reminders.unshift({
        id: uid("r_"),
        type:
          type === "lecture"
            ? "lecture"
            : type === "revision"
              ? "revision"
              : type === "exam"
                ? "lecture"
                : "custom",
        title: `Reminder: ${title}`,
        time: new Date(start).toISOString(),
        repeat: "none",
        notified: false,
      });
      localStorage.setItem("studyos_reminders_v1", JSON.stringify(reminders));
    } catch {}
    setTitle("");
    setStart("");
    setEnd("");
    setLocation("");
    setAllDay(false);
  }

  function removeEvent(id: string) {
    setEvents((e) => e.filter((x) => x.id !== id));
  }

  function exportICS(ev: EventItem) {
    const dtStart = ev.allDay
      ? ev.start.slice(0, 10).replace(/-/g, "")
      : ev.start.replace(/[-:.]/g, "").slice(0, 15) + "Z";
    const dtEnd = ev.end
      ? ev.allDay
        ? ev.end.slice(0, 10).replace(/-/g, "")
        : ev.end.replace(/[-:.]/g, "").slice(0, 15) + "Z"
      : "";
    const ics = [
      `BEGIN:VCALENDAR`,
      `VERSION:2.0`,
      `BEGIN:VEVENT`,
      `UID:${ev.id}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, "")}`,
      `DTSTART:${dtStart}`,
      dtEnd ? `DTEND:${dtEnd}` : "",
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || ""}`,
      `LOCATION:${ev.location || ""}`,
      `END:VEVENT`,
      `END:VCALENDAR`,
    ]
      .filter(Boolean)
      .join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function googleCalendarUrl(ev: EventItem) {
    const format = (dstr: string) =>
      dstr.replace(/[-:.]/g, "").slice(0, 15) + "Z";
    const dates = ev.end
      ? `${format(ev.start)}/${format(ev.end)}`
      : `${format(ev.start)}/${format(new Date(new Date(ev.start).getTime() + 60 * 60 * 1000).toISOString())}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title,
      dates,
      details: ev.description || "",
      location: ev.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Calendar</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage exam dates, lecture & revision schedules. Export to ICS or
            add to Google Calendar.
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md">
          <h4 className="font-semibold">Add Event</h4>
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
            />
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="glass p-2 rounded"
            >
              <option value="lecture">Lecture</option>
              <option value="revision">Revision</option>
              <option value="exam">Exam</option>
              <option value="other">Other</option>
            </select>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e: any) => setStart(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={end}
              onChange={(e: any) => setEnd(e.target.value)}
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e: any) => setLocation(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e: any) => setAllDay(e.target.checked)}
                />{" "}
                All day
              </label>
              <Button variant="primary" onClick={addEvent}>
                Add
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Upcoming</h4>
          <div className="mt-3 space-y-2 max-h-[40vh] overflow-auto">
            {upcoming.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-2 rounded bg-white/5"
              >
                <div>
                  <div className="font-medium">
                    {ev.title}{" "}
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ({ev.type})
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {new Date(ev.start).toLocaleString()}{" "}
                    {ev.end ? " - " + new Date(ev.end).toLocaleString() : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => exportICS(ev)}
                  >
                    ICS
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(googleCalendarUrl(ev), "_blank")}
                  >
                    Add to Google
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => removeEvent(ev.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Sync</h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Quick sync options: export ICS to import into Google Calendar or
            open event in Google Calendar creation page. Full 2-way sync
            requires OAuth (not implemented).
          </p>
        </Card>
      </div>
    </div>
  );
}

export default CalendarModule;
