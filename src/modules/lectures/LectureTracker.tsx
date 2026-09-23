import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BookOpen, CheckCircle, Clock, Edit3, Grid3x3, List, Plus, Star, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GradientText } from "@/components/ui/GradientText";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/Toast";
import { cn } from "@/utils";
import { useAppStore } from "@/store";
import { persistStore, loadStore } from "@/services/appDataSync";

/** Rewards given whenever a lecture is marked completed, matching the Task
 * Manager so every module behaves consistently. */
const LECTURE_COMPLETION_XP = 10;
const LECTURE_COMPLETION_COINS = 5;

/** Award the completion reward once (only when moving INTO "completed"). */
function awardLectureCompletion(wasCompleted: boolean, isCompleted: boolean) {
  if (wasCompleted || !isCompleted) return;
  useAppStore.getState().addXP(LECTURE_COMPLETION_XP);
  useAppStore.getState().addCoins(LECTURE_COMPLETION_COINS);
  showToast("Nice! Lecture completed (+10 XP)", "success");
}

type LectureStatus = "completed" | "pending" | "in-progress";
interface Lecture { id: string; title: string; status: LectureStatus; bookmarked: boolean; notes: string; reminder?: string; }
interface Chapter { id: string; subject: string; name: string; lectures: Lecture[]; }
const CHAPTERS_KEY = "studyos_lecture_tracker_v1";
const SUBJECTS_KEY = "studyos_lecture_subjects_v1";
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function loadChapters(): Chapter[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAPTERS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((chapter: any) => ({
      id: String(chapter.id || id("chapter")), subject: String(chapter.subject || "General"), name: String(chapter.name || "Untitled chapter"),
      lectures: Array.isArray(chapter.lectures) ? chapter.lectures.map((lecture: any, index: number) => ({
        id: String(lecture.id || id("lecture")), title: String(lecture.title || `Lecture ${index + 1}`),
        status: ["completed", "pending", "in-progress"].includes(lecture.status) ? lecture.status : "pending",
        bookmarked: !!lecture.bookmarked, notes: String(lecture.notes || ""),
        reminder: lecture.reminder ? new Date(lecture.reminder).toISOString() : undefined,
      })) : [],
    }));
  } catch { return []; }
}

function loadSubjects(chapters: Chapter[]) {
  try {
    const saved = JSON.parse(localStorage.getItem(SUBJECTS_KEY) || "[]");
    const valid = Array.isArray(saved) ? saved.filter((x): x is string => typeof x === "string") : [];
    // Deliberately no hard-coded fallback here: persisting a made-up
    // "General" subject on a fresh device could overwrite the real subjects
    // stored in the cloud. "General" still appears in the UI via the
    // activeSubject fallback until the user adds a real one.
    return [...new Set([...valid, ...chapters.map((chapter) => chapter.subject)])];
  } catch {
    return [...new Set(chapters.map((chapter) => chapter.subject))];
  }
}

function progress(chapter: Chapter) {
  return chapter.lectures.length ? Math.round(chapter.lectures.filter((lecture) => lecture.status === "completed").length / chapter.lectures.length * 100) : 0;
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LectureTracker() {
  const [chapters, setChapters] = useState<Chapter[]>(loadChapters);
  const [subjects, setSubjects] = useState<string[]>(() => loadSubjects(loadChapters()));
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<{ chapterId: string; lecture: Lecture } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<LectureStatus>("pending");
  const [editNotes, setEditNotes] = useState("");
  const [editReminder, setEditReminder] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  // Persist to localStorage AND push to the cloud (debounced) so lectures
  // added here show up on every device after sign-in.
  useEffect(() => { persistStore(CHAPTERS_KEY, chapters); }, [chapters]);
  useEffect(() => { persistStore(SUBJECTS_KEY, subjects); }, [subjects]);

  // Pull this account's cloud copy once on mount so lectures added on another
  // device appear without waiting for the login sync or a page reload. The
  // merged result also marks these keys as hydrated so genuine user writes
  // (including "delete everything") always reach the cloud afterwards.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadStore<Chapter[]>(CHAPTERS_KEY, []),
      loadStore<string[]>(SUBJECTS_KEY, []),
    ])
      .then(([cloudChapters, cloudSubjects]) => {
        if (cancelled) return;
        if (cloudChapters.length) setChapters(cloudChapters);
        if (cloudSubjects.length) {
          setSubjects((current) => [...new Set([...current, ...cloudSubjects])]);
        } else {
          // No saved subject list — derive subjects from the restored chapters
          // (only when the current state is still empty, so we never throw away
          // something the user typed while the cloud read was in flight).
          setSubjects((current) => {
            if (current.length) return current;
            return cloudChapters.length ? loadSubjects(cloudChapters) : [];
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The AI assistant writes lectures straight to localStorage — reload the
  // tracker when it reports new data so they appear without a page refresh.
  useEffect(() => {
    const reload = () => {
      const next = loadChapters();
      setChapters(next);
      setSubjects(loadSubjects(next));
    };
    window.addEventListener("studyos-data-changed", reload);
    return () => window.removeEventListener("studyos-data-changed", reload);
  }, []);

  // When no specific subject is picked the tracker shows a "General" view with
  // every subject's chapters; picking a subject narrows the list down to it.
  const visibleChapters = useMemo(() => (selectedSubject ? chapters.filter((chapter) => chapter.subject === selectedSubject) : chapters), [chapters, selectedSubject]);
  // A fallback subject keeps adding usable even before the user creates one.
  const activeSubject = selectedSubject || "General";
  const addSubject = () => {
    const name = subjectName.trim(); if (!name) return;
    const found = subjects.find((subject) => subject.toLowerCase() === name.toLowerCase());
    const subject = found || name;
    if (!found) setSubjects((current) => [...current, subject]);
    setSelectedSubject(subject); setSubjectName("");
  };
  const addChapter = () => {
    const name = chapterName.trim();
    if (!name) return;
    if (!subjects.includes(activeSubject)) setSubjects((current) => [...current, activeSubject]);
    setChapters((current) => [...current, { id: id("chapter"), subject: activeSubject, name, lectures: [] }]); setChapterName("");
  };
  const startAddLecture = (chapterId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    setAddTitle(`Lecture ${chapter.lectures.length + 1}`);
    setAddingTo(chapterId);
  };
  const confirmAddLecture = () => {
    const chapterId = addingTo;
    if (!chapterId) return;
    const title = addTitle.trim();
    if (!title) {
      showToast("Lecture name can't be empty.", "error");
      return;
    }
    setChapters((current) =>
      current.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              lectures: [
                ...c.lectures,
                { id: id("lecture"), title, status: "pending", bookmarked: false, notes: "" },
              ],
            }
          : c,
      ),
    );
    setAddingTo(null);
    setAddTitle("");
    showToast("Lecture added", "success");
  };
  const cycleStatus = (chapterId: string, lectureId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    const lecture = chapter?.lectures.find((l) => l.id === lectureId);
    if (!lecture) return;
    const status: LectureStatus = lecture.status === "pending" ? "in-progress" : lecture.status === "in-progress" ? "completed" : "pending";
    awardLectureCompletion(lecture.status === "completed", status === "completed");
    updateLecture(chapterId, lectureId, { status });
  };
  const updateLecture = (chapterId: string, lectureId: string, patch: Partial<Lecture>) => setChapters((current) => current.map((chapter) => chapter.id === chapterId ? { ...chapter, lectures: chapter.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, ...patch } : lecture) } : chapter));
  const deleteLecture = (chapterId: string, lectureId: string) => {
    if (!window.confirm("Delete this lecture?")) return;
    setChapters((current) => current.map((chapter) => chapter.id === chapterId ? { ...chapter, lectures: chapter.lectures.filter((lecture) => lecture.id !== lectureId) } : chapter));
    setEditing(null);
  };
  const deleteChapter = (chapter: Chapter) => {
    if (!window.confirm(`Delete “${chapter.name}” and its ${chapter.lectures.length} lecture(s)?`)) return;
    setChapters((current) => current.filter((item) => item.id !== chapter.id));
  };
  const openEdit = (chapterId: string, lecture: Lecture) => { setEditing({ chapterId, lecture }); setEditTitle(lecture.title); setEditStatus(lecture.status); setEditNotes(lecture.notes); setEditReminder(toDateTimeLocal(lecture.reminder)); };
  const saveEdit = () => {
    if (!editing || !editTitle.trim()) return;
    awardLectureCompletion(editing.lecture.status === "completed", editStatus === "completed");
    updateLecture(editing.chapterId, editing.lecture.id, { title: editTitle.trim(), status: editStatus, notes: editNotes.trim(), reminder: editReminder ? new Date(editReminder).toISOString() : undefined }); setEditing(null);
  };
  const statusClass = (status: LectureStatus) => status === "completed" ? "text-success bg-success/10" : status === "in-progress" ? "text-warning bg-warning/10" : "text-gray-400 bg-gray-100 dark:bg-gray-800";

  return <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-950 dark:to-gray-900 sm:p-6 md:p-8"><div className="mx-auto max-w-7xl">
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl md:text-4xl"><GradientText from="from-primary-500" to="to-accent-500">Lecture Tracker</GradientText></h1><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Choose a subject, add its chapters, then track each lecture.</p></div><div className="flex gap-2"><button aria-label="Grid view" onClick={() => setViewMode("grid")} className={cn("rounded-xl p-2", viewMode === "grid" ? "bg-primary-500/20 text-primary-500" : "text-gray-400")}><Grid3x3 className="h-5 w-5" /></button><button aria-label="List view" onClick={() => setViewMode("list")} className={cn("rounded-xl p-2", viewMode === "list" ? "bg-primary-500/20 text-primary-500" : "text-gray-400")}><List className="h-5 w-5" /></button></div></motion.div>
    <GlassCard className="mb-6 p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><div className="flex flex-wrap items-center gap-2"><select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="min-w-0 flex-1 basis-40 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" aria-label="Select subject"><option value="">General (All subjects)</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select><input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject()} placeholder="New subject" className="min-w-0 flex-1 basis-32 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" /><AnimatedButton size="sm" variant="secondary" className="shrink-0" onClick={addSubject}><Plus className="h-4 w-4" /> Subject</AnimatedButton></div><input value={chapterName} onChange={(e) => setChapterName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChapter()} placeholder={activeSubject ? `Chapter for ${activeSubject}` : "Chapter name"} className="min-w-0 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800" /><AnimatedButton disabled={!chapterName.trim()} onClick={addChapter} className="justify-self-start"><Plus className="h-4 w-4" /> Add Chapter</AnimatedButton></div></GlassCard>
    <div className={cn("grid gap-6", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>{visibleChapters.map((chapter, index) => { const value = progress(chapter); return <motion.div key={chapter.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.06 }}><GlassCard className="overflow-hidden p-6"><div className="mb-4 flex justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-primary-500">{chapter.subject}</p><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{chapter.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{chapter.lectures.length} lectures</p></div><div className="flex items-start gap-2"><span className="text-sm font-medium text-primary-500">{value}%</span><button aria-label={`Delete ${chapter.name}`} title="Delete chapter" onClick={() => deleteChapter(chapter)} className="rounded p-1 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div></div><div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500" /></div><div className="space-y-2">{chapter.lectures.map((lecture, lectureIndex) => <div key={lecture.id} className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"><button aria-label={`Change ${lecture.title} status`} onClick={() => cycleStatus(chapter.id, lecture.id)} className={cn("rounded-full p-1", statusClass(lecture.status))}>{lecture.status === "completed" ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}</button><button onClick={() => openEdit(chapter.id, lecture)} className="min-w-0 flex-1 truncate text-left text-sm text-gray-700 dark:text-gray-300"><span className="mr-2 text-xs text-gray-400">{lectureIndex + 1}.</span>{lecture.title}</button>{lecture.reminder && <Bell className="h-4 w-4 shrink-0 text-primary-500" />}<button aria-label={`Bookmark ${lecture.title}`} onClick={() => updateLecture(chapter.id, lecture.id, { bookmarked: !lecture.bookmarked })}><Star className={cn("h-4 w-4", lecture.bookmarked ? "fill-accent-500 text-accent-500" : "text-gray-400")} /></button><button aria-label={`Edit ${lecture.title}`} onClick={() => openEdit(chapter.id, lecture)} className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"><Edit3 className="h-4 w-4 text-gray-400" /></button></div>)}{!chapter.lectures.length && <p className="py-2 text-center text-sm text-gray-500">No lectures yet.</p>}</div><AnimatedButton variant="outline" size="sm" className="mt-4 w-full" onClick={() => startAddLecture(chapter.id)}><Plus className="h-4 w-4" /> Add Lecture</AnimatedButton></GlassCard></motion.div>; })}</div>
    {!visibleChapters.length && <div className="flex flex-col items-center justify-center py-16 text-center"><BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-600" /><h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{selectedSubject ? `No chapters in ${selectedSubject}` : "No chapters yet"}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedSubject ? "Add a chapter above, then add its lectures." : "Choose a subject above or add a new one to get started."}</p></div>}
  </div><Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.lecture.title}` : "Edit lecture"}><div className="space-y-4"><label className="block text-sm font-medium">Lecture name<input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></label><label className="block text-sm font-medium">Status<select value={editStatus} onChange={(e) => setEditStatus(e.target.value as LectureStatus)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label><label className="block text-sm font-medium">Reminder<input type="datetime-local" value={editReminder} onChange={(e) => setEditReminder(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></label><label className="block text-sm font-medium">Notes<textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Optional notes" className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></label><div className="flex items-center justify-between gap-2"><AnimatedButton variant="ghost" onClick={() => editing && deleteLecture(editing.chapterId, editing.lecture.id)} className="text-red-400"><Trash2 className="h-4 w-4" /> Delete</AnimatedButton><div className="flex gap-2"><AnimatedButton variant="ghost" onClick={() => setEditing(null)}>Cancel</AnimatedButton><AnimatedButton onClick={saveEdit}>Save lecture</AnimatedButton></div></div></div></Modal>
    <Modal open={!!addingTo} onClose={() => setAddingTo(null)} title="Add lecture">
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Lecture name
          <input
            autoFocus
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmAddLecture()}
            placeholder="e.g. Lecture 1 — Kinematics"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </label>
        <div className="flex justify-end gap-2">
          <AnimatedButton variant="ghost" onClick={() => setAddingTo(null)}>Cancel</AnimatedButton>
          <AnimatedButton disabled={!addTitle.trim()} onClick={confirmAddLecture}>Add lecture</AnimatedButton>
        </div>
      </div>
    </Modal></div>;
}
