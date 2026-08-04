import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CircularProgress } from "@/components/ui/Progress";
import { Plus, Check, Star, Bookmark, Clock, Trash, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LectureStatus = "pending" | "completed" | "skipped";

type Lecture = {
  id: string;
  title: string;
  status: LectureStatus;
  bookmarked?: boolean;
  notes?: string;
  reminder?: string | null; // ISO string
};

type Chapter = {
  id: string;
  name: string;
  lectures: Lecture[];
};

const STORAGE_KEY = "studyos_lecture_tracker_v1";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function LectureTracker() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapterName, setNewChapterName] = useState("");
  const [activeNotes, setActiveNotes] = useState<{
    lectureId: string;
    chapterId: string;
  } | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [reminderEditing, setReminderEditing] = useState<{
    lectureId: string;
    chapterId: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChapters(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
    } catch (e) {}
  }, [chapters]);

  const addChapter = () => {
    if (!newChapterName.trim()) return;
    setChapters((s) => [
      ...s,
      { id: uid("chap_"), name: newChapterName.trim(), lectures: [] },
    ]);
    setNewChapterName("");
  };

  const addLecture = (chapterId: string, title: string) => {
    if (!title.trim()) return;
    setChapters((s) =>
      s.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              lectures: [
                ...c.lectures,
                { id: uid("lec_"), title: title.trim(), status: "pending" },
              ],
            }
          : c,
      ),
    );
  };

  const updateLecture = (
    chapterId: string,
    lectureId: string,
    patch: Partial<Lecture>,
  ) => {
    setChapters((s) =>
      s.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              lectures: c.lectures.map((l) =>
                l.id === lectureId ? { ...l, ...patch } : l,
              ),
            }
          : c,
      ),
    );
  };

  const removeLecture = (chapterId: string, lectureId: string) => {
    setChapters((s) =>
      s.map((c) =>
        c.id === chapterId
          ? { ...c, lectures: c.lectures.filter((l) => l.id !== lectureId) }
          : c,
      ),
    );
  };

  const completeOneClick = (chapterId: string, lectureId: string) => {
    updateLecture(chapterId, lectureId, { status: "completed" });
  };

  const totalsByChapter = useMemo(() => {
    return chapters.map((c) => {
      const total = c.lectures.length;
      const completed = c.lectures.filter(
        (l) => l.status === "completed",
      ).length;
      const bookmarked = c.lectures.filter((l) => l.bookmarked).length;
      return {
        chapterId: c.id,
        total,
        completed,
        bookmarked,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [chapters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Input
          placeholder="New chapter name (e.g. CHAPTER 1)"
          value={newChapterName}
          onChange={(e) => setNewChapterName(e.target.value)}
        />
        <Button variant="primary" onClick={addChapter}>
          <Plus size={14} /> Add Chapter
        </Button>
      </div>

      <div className="grid gap-4">
        {chapters.length === 0 && (
          <Card padding="lg" className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Lecture Tracker</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Create chapters and add lectures. Track progress, notes,
                reminders and bookmarks.
              </p>
            </div>
            <div>
              <CircularProgress value={0} size={80} strokeWidth={8}>
                <div className="text-sm text-[var(--color-text-muted)]">0%</div>
              </CircularProgress>
            </div>
          </Card>
        )}

        <AnimatePresence>
          {chapters.map((chapter) => {
            const stats = totalsByChapter.find(
              (t) => t.chapterId === chapter.id,
            ) || { percent: 0, total: 0, completed: 0 };
            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card padding="lg" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{chapter.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {stats.completed}/{stats.total} lectures completed
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <CircularProgress
                          value={stats.percent}
                          size={64}
                          strokeWidth={6}
                        >
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {stats.percent}%
                          </div>
                        </CircularProgress>
                      </div>
                    </div>
                  </div>

                  <ChapterLectures
                    chapter={chapter}
                    onAddLecture={(title) => addLecture(chapter.id, title)}
                    onToggleBookmark={(lectureId, next) =>
                      updateLecture(chapter.id, lectureId, { bookmarked: next })
                    }
                    onSetStatus={(lectureId, status) =>
                      updateLecture(chapter.id, lectureId, { status })
                    }
                    onRemoveLecture={(lectureId) =>
                      removeLecture(chapter.id, lectureId)
                    }
                    onOpenNotes={(lectureId) => {
                      setActiveNotes({ lectureId, chapterId: chapter.id });
                      const l = chapter.lectures.find(
                        (x) => x.id === lectureId,
                      );
                      setNotesValue(l?.notes || "");
                    }}
                    onSaveNotes={(lectureId, notes) =>
                      updateLecture(chapter.id, lectureId, { notes })
                    }
                    onOpenReminder={(lectureId) =>
                      setReminderEditing({ lectureId, chapterId: chapter.id })
                    }
                    onComplete={(lectureId) =>
                      completeOneClick(chapter.id, lectureId)
                    }
                  />
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Modal
        open={!!activeNotes}
        onClose={() => setActiveNotes(null)}
        title="Lecture Notes"
      >
        <Textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setActiveNotes(null)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (activeNotes) {
                updateLecture(activeNotes.chapterId, activeNotes.lectureId, {
                  notes: notesValue,
                });
              }
              setActiveNotes(null);
            }}
          >
            Save Notes
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!reminderEditing}
        onClose={() => setReminderEditing(null)}
        title="Set Reminder"
      >
        <div className="flex flex-col gap-3">
          <Input
            type="datetime-local"
            value={
              reminderEditing
                ? (chapters
                    .find((c) => c.id === reminderEditing.chapterId)
                    ?.lectures.find((l) => l.id === reminderEditing.lectureId)
                    ?.reminder ?? "")
                : ""
            }
            onChange={(e) => {
              if (!reminderEditing) return;
              updateLecture(
                reminderEditing.chapterId,
                reminderEditing.lectureId,
                { reminder: e.target.value || null },
              );
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setReminderEditing(null)}
            >
              Close
            </Button>
            <Button variant="primary" onClick={() => setReminderEditing(null)}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChapterLectures({
  chapter,
  onAddLecture,
  onToggleBookmark,
  onSetStatus,
  onRemoveLecture,
  onOpenNotes,
  onOpenReminder,
  onComplete,
}: any) {
  const [title, setTitle] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Lecture title (e.g. Lecture 1)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          onClick={() => {
            onAddLecture(title);
            setTitle("");
          }}
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {chapter.lectures.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            No lectures yet.
          </p>
        )}
        {chapter.lectures.map((lec: Lecture) => (
          <div
            key={lec.id}
            className="flex items-center justify-between glass rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{lec.title}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${lec.status === "completed" ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" : lec.status === "skipped" ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]" : "bg-white/5 text-[var(--color-text-muted)]"}`}
                  >
                    {lec.status}
                  </span>
                  {lec.bookmarked && (
                    <Bookmark
                      size={14}
                      className="text-[var(--color-accent)]"
                    />
                  )}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {lec.notes ? "Notes saved" : "No notes"}
                  {lec.reminder
                    ? ` • Reminder: ${new Date(lec.reminder).toLocaleString()}`
                    : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="success"
                onClick={() => onComplete(lec.id)}
                title="Mark complete"
              >
                <Check size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onToggleBookmark(lec.id, !lec.bookmarked)}
                title="Toggle bookmark"
              >
                {lec.bookmarked ? <Star size={14} /> : <Star size={14} />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenNotes(lec.id)}
                title="Notes"
              >
                <Edit size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenReminder(lec.id)}
                title="Reminder"
              >
                <Clock size={14} />
              </Button>
              <Button
                size="icon"
                variant="danger"
                onClick={() => onSetStatus(lec.id, "skipped")}
                title="Mark skipped"
              >
                <Trash size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemoveLecture(lec.id)}
                title="Delete"
              >
                <Trash size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
