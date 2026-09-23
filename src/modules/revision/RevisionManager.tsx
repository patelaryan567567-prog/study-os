import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash,
  Bookmark,
  BookmarkCheck,
  RefreshCcw,
  Layers,
  ListChecks,
  CheckCircle2,
  XCircle,
  RotateCw,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils";
import { persistStore, loadStore } from "@/services/appDataSync";

/**
 * Revision Manager
 * ----------------
 * Spaced-repetition flashcards, a mistake notebook and a formula notebook.
 * Reviewing a card uses an SM-2 style scheduler (rating → interval), so cards
 * surface again on the optimal day. All data is persisted to localStorage.
 */

type Tab = "flashcards" | "mistakes" | "formulas";
type Rating = 0 | 1 | 2 | 3; // Again / Hard / Good / Easy

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject?: string;
  step: number; // index into INTERVALS
  nextReview: string; // ISO datetime
  reviewCount: number;
  createdAt: string;
}

interface Mistake {
  id: string;
  subject?: string;
  question: string;
  myAnswer: string;
  correction: string;
  resolved: boolean;
  createdAt: string;
}

interface Formula {
  id: string;
  subject?: string;
  title: string;
  formula: string;
  note?: string;
  bookmarked: boolean;
  createdAt: string;
}

const FLASH_KEY = "studyos_revision_flashcards_v1";
const MISTAKE_KEY = "studyos_revision_mistakes_v1";
const FORMULA_KEY = "studyos_revision_formulas_v1";

/** Spaced-repetition intervals in days, indexed by a card's step. */
const INTERVALS = [1, 2, 4, 7, 15, 30, 60];
const RATING_LABELS: { value: Rating; label: string; color: string }[] = [
  { value: 0, label: "Again", color: "#ef4444" },
  { value: 1, label: "Hard", color: "#f59e0b" },
  { value: 2, label: "Good", color: "#22d3a0" },
  { value: 3, label: "Easy", color: "#06b6d4" },
];

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/** Compute the next step + interval (days) for a rating. */
function schedule(rating: Rating, step: number): { step: number; days: number } {
  const max = INTERVALS.length - 1;
  if (rating === 0) return { step: 0, days: INTERVALS[0] };
  if (rating === 1) {
    const s = Math.max(0, step - 1);
    return { step: s, days: Math.max(INTERVALS[0], 2) };
  }
  if (rating === 2) {
    const s = Math.min(step + 1, max);
    return { step: s, days: INTERVALS[s] };
  }
  const s = Math.min(step + 2, max);
  return { step: s, days: INTERVALS[s] };
}

function addDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isDue(card: Flashcard): boolean {
  return new Date(card.nextReview).getTime() <= Date.now();
}
export function RevisionManager() {
  const [tab, setTab] = useState<Tab>("flashcards");

  // Hydrate synchronously from localStorage so the persist effects below can
  // never overwrite saved data with the empty initial state on mount.
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    try {
      const raw = localStorage.getItem(FLASH_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [mistakes, setMistakes] = useState<Mistake[]>(() => {
    try {
      const raw = localStorage.getItem(MISTAKE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [formulas, setFormulas] = useState<Formula[]>(() => {
    try {
      const raw = localStorage.getItem(FORMULA_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Persist each collection to localStorage + the cloud (debounced) so cards,
  // mistakes and formulas sync across devices.
  useEffect(() => {
    persistStore(FLASH_KEY, flashcards);
  }, [flashcards]);
  useEffect(() => {
    persistStore(MISTAKE_KEY, mistakes);
  }, [mistakes]);
  useEffect(() => {
    persistStore(FORMULA_KEY, formulas);
  }, [formulas]);

  // Pull this account's cloud copy once on mount (merged by id with whatever is
  // already saved locally) so work from another device appears immediately.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadStore<Flashcard[]>(FLASH_KEY, []),
      loadStore<Mistake[]>(MISTAKE_KEY, []),
      loadStore<Formula[]>(FORMULA_KEY, []),
    ])
      .then(([cloudCards, cloudMistakes, cloudFormulas]) => {
        if (cancelled) return;
        if (cloudCards.length) setFlashcards(cloudCards);
        if (cloudMistakes.length) setMistakes(cloudMistakes);
        if (cloudFormulas.length) setFormulas(cloudFormulas);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // The AI assistant writes cards/mistakes/formulas straight to localStorage —
  // reload whichever collection changed when it reports new data.
  useEffect(() => {
    const reload = () => {
      const read = <T,>(key: string, fallback: T[]): T[] => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || "[]");
          return Array.isArray(parsed) ? (parsed as T[]) : fallback;
        } catch {
          return fallback;
        }
      };
      setFlashcards(read(FLASH_KEY, []));
      setMistakes(read(MISTAKE_KEY, []));
      setFormulas(read(FORMULA_KEY, []));
    };
    window.addEventListener("studyos-data-changed", reload);
    return () => window.removeEventListener("studyos-data-changed", reload);
  }, []);

  // Due cards for the review queue (spaced repetition)
  const dueCards = useMemo(
    () => flashcards.filter((c) => isDue(c)),
    [flashcards],
  );

  const mastered = flashcards.filter((c) => c.step >= INTERVALS.length - 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Revision Manager</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Spaced-repetition flashcards, mistake analysis and formula notes.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          {(
            [
              { id: "flashcards", label: "Flashcards" },
              { id: "mistakes", label: "Mistakes" },
              { id: "formulas", label: "Formulas" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-primary-500/20 text-primary-300"
                  : "text-[var(--color-text-muted)] hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Total Cards</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {flashcards.length}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">in deck</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Due Today</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-warning)]">
            {dueCards.length}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            ready to review
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Mastered</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-success)]">
            {mastered}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">cards</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Mistakes</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-error)]">
            {mistakes.filter((m) => !m.resolved).length}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">to fix</p>
        </GlassCard>
      </div>

      {tab === "flashcards" && (
        <FlashcardsPanel
          cards={flashcards}
          dueCount={dueCards.length}
          onAdd={setFlashcards}
          onDelete={(id) => setFlashcards((s) => s.filter((c) => c.id !== id))}
        />
      )}
      {tab === "mistakes" && (
        <MistakesPanel
          mistakes={mistakes}
          onAdd={setMistakes}
          onToggle={(id) =>
            setMistakes((s) =>
              s.map((m) =>
                m.id === id ? { ...m, resolved: !m.resolved } : m,
              ),
            )
          }
          onDelete={(id) => setMistakes((s) => s.filter((m) => m.id !== id))}
/>
      )}
      {tab === "formulas" && (
        <FormulasPanel
          formulas={formulas}
          onAdd={setFormulas}
          onToggleBookmark={(id) =>
            setFormulas((s) =>
              s.map((f) =>
                f.id === id ? { ...f, bookmarked: !f.bookmarked } : f,
              ),
            )
          }
          onDelete={(id) => setFormulas((s) => s.filter((f) => f.id !== id))}
        />
      )}
    </div>
  );
}

/* ── Flashcards: spaced-repetition review + deck management ── */
function FlashcardsPanel({
  cards,
  dueCount,
  onAdd,
  onDelete,
}: {
  cards: Flashcard[];
  dueCount: number;
  onAdd: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  onDelete: (id: string) => void;
}) {
  // Review state
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Add form
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");

  const startReview = () => {
    setQueue(cards.filter((c) => isDue(c)));
    setIdx(0);
    setShowBack(false);
  };

  const rate = (rating: Rating) => {
    const card = queue[idx];
    if (!card) return;
    const { step, days } = schedule(rating, card.step);
    const updated: Flashcard = {
      ...card,
      step,
      nextReview: addDaysFromNow(days),
      reviewCount: card.reviewCount + 1,
    };
    onAdd((s) => s.map((c) => (c.id === card.id ? updated : c)));
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      setShowBack(false);
    } else {
      setQueue([]);
      setIdx(0);
      setShowBack(false);
    }
  };

  const current = queue[idx];

  return (
    <div className="space-y-6">
      {queue.length > 0 && current ? (
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Reviewing {idx + 1} / {queue.length}
          </p>
          <button
            onClick={() => setShowBack((v) => !v)}
            className="block w-full text-left"
          >
            <GlassCard className="relative min-h-[240px] cursor-pointer p-8 transition-transform hover:scale-[1.01]">
              <div className="absolute right-4 top-4 text-xs text-[var(--color-text-muted)]">
                {current.subject ?? "Card"}
              </div>
              <AnimatePresence mode="wait">
                {!showBack ? (
                  <motion.div
                    key="front"
                    initial={{ opacity: 0, rotateY: -8 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex h-[180px] items-center justify-center"
                  >
                    <p className="text-center text-xl font-semibold text-white">
                      {current.front}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0, rotateY: 8 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex h-[180px] items-center justify-center"
                  >
                    <p className="text-center text-lg text-[var(--color-text-secondary)]">
                      {current.back}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
                {showBack
                  ? "How well did you recall it?"
                  : "Tap to reveal answer"}
              </p>
            </GlassCard>
          </button>

          {showBack && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {RATING_LABELS.map((r) => (
                <Button
                  key={r.value}
                  size="md"
                  style={{
                    background: `${r.color}22`,
                    border: `1px solid ${r.color}55`,
                    color: r.color,
                  }}
                  onClick={() => rate(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <RefreshCcw className="h-8 w-8 text-[var(--color-text-muted)]" />
          <p className="text-lg font-semibold text-white">
            {dueCount > 0
              ? `${dueCount} card${dueCount > 1 ? "s" : ""} due for review`
              : "No cards due right now"}
          </p>
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
            {dueCount > 0
              ? "Start a focused review session — spaced repetition will schedule each card for the ideal day."
              : "All caught up. Add new cards or they'll return on their scheduled day."}
          </p>
          {dueCount > 0 && (
            <Button variant="primary" onClick={startReview}>
              <RotateCw size={16} /> Start Review
            </Button>
          )}
        </div>
      )}

{/* Add card */}
      <GlassCard className="p-5">
        <h3 className="mb-3 text-lg font-bold text-white">Add Flashcard</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Question / Front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="What is Newton's second law?"
          />
          <Input
            label="Answer / Back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="F = ma"
          />
          <Input
            label="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Physics"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            disabled={!front.trim() || !back.trim()}
            onClick={() => {
              onAdd((s) => [
                {
                  id: uid("c_"),
                  front: front.trim(),
                  back: back.trim(),
                  subject: subject.trim() || undefined,
                  step: 0,
                  nextReview: new Date().toISOString(),
                  reviewCount: 0,
                  createdAt: new Date().toISOString(),
                },
                ...s,
              ]);
              setFront("");
              setBack("");
              setSubject("");
            }}
          >
            <Plus size={16} /> Add Card
          </Button>
        </div>
      </GlassCard>

      {/* Deck */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">
            My Deck ({cards.length})
          </h3>
          {[...cards]
            .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
            .map((c) => (
              <GlassCard key={c.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {c.front}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {c.subject ?? "No subject"} • step {c.step} •{" "}
                    {Math.max(
                      0,
                      Math.ceil(
                        (new Date(c.nextReview).getTime() - Date.now()) /
                          (24 * 60 * 60 * 1000),
                      ),
                    )}{" "}
                    day(s)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(c.id)}
                  title="Delete"
                >
                  <Trash size={15} />
                </Button>
              </GlassCard>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── Mistake notebook ── */
function MistakesPanel({
  mistakes,
  onAdd,
  onToggle,
  onDelete,
}: {
  mistakes: Mistake[];
  onAdd: React.Dispatch<React.SetStateAction<Mistake[]>>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [myAnswer, setMyAnswer] = useState("");
  const [correction, setCorrection] = useState("");
  const [subject, setSubject] = useState("");
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const visible = mistakes.filter((m) =>
    filter === "all" ? true : filter === "open" ? !m.resolved : m.resolved,
  );

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <h3 className="mb-3 text-lg font-bold text-white">Log a Mistake</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Question / Concept"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="The question I got wrong"
          />
          <Input
            label="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Chemistry"
          />
          <Textarea
            label="My answer (what went wrong)"
            value={myAnswer}
            onChange={(e) => setMyAnswer(e.target.value)}
            placeholder="Write your wrong approach here"
          />
          <Textarea
            label="Correct answer / Fix"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="The right approach and why"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            disabled={!question.trim() || !correction.trim()}
            onClick={() => {
              onAdd((s) => [
                {
                  id: uid("m_"),
                  question: question.trim(),
                  myAnswer: myAnswer.trim(),
                  correction: correction.trim(),
                  subject: subject.trim() || undefined,
                  resolved: false,
                  createdAt: new Date().toISOString(),
                },
                ...s,
              ]);
              setQuestion("");
              setMyAnswer("");
              setCorrection("");
              setSubject("");
            }}
          >
            <Plus size={16} /> Add Mistake
          </Button>
        </div>
      </GlassCard>

{/* Filter */}
      <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all",
              filter === f
                ? "bg-primary-500/20 text-primary-300"
                : "text-[var(--color-text-muted)] hover:text-white",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} />}
          title="No mistakes logged"
          description={
            filter === "open"
              ? "Log your mistakes so you can review them before exams."
              : "Nothing here."
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/5 p-4",
                m.resolved && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {m.subject && (
                      <span className="rounded bg-primary-500/15 px-1.5 py-0.5 text-[10px] text-primary-300">
                        {m.subject}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        m.resolved
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-error)]",
                      )}
                    >
                      {m.resolved ? "Resolved" : "Open"}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-white underline decoration-[var(--color-error)]/40">
                    {m.question}
                  </h3>
                  {m.myAnswer && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      <XCircle
                        size={12}
                        className="mr-1 inline text-[var(--color-error)]"
                      />
                      {m.myAnswer}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2
                      size={12}
                      className="mr-1 inline text-[var(--color-success)]"
                    />
                    {m.correction}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant={m.resolved ? "ghost" : "success"}
                    size="icon"
                    onClick={() => onToggle(m.id)}
                    title={m.resolved ? "Reopen" : "Mark resolved"}
                  >
                    <CheckCircle2 size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(m.id)}
                    title="Delete"
                  >
                    <Trash size={15} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Formula notebook ── */
function FormulasPanel({
  formulas,
  onAdd,
  onToggleBookmark,
  onDelete,
}: {
  formulas: Formula[];
  onAdd: React.Dispatch<React.SetStateAction<Formula[]>>;
  onToggleBookmark: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [formula, setFormula] = useState("");
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <h3 className="mb-3 text-lg font-bold text-white">Add Formula</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Name / Topic"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kinetic Energy"
          />
          <Input
            label="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Physics"
          />
          <Textarea
            label="Formula"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="KE = ½ mv²"
          />
          <Textarea
            label="Notes / conditions (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="m = mass (kg), v = velocity (m/s)"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            disabled={!title.trim() || !formula.trim()}
            onClick={() => {
              onAdd((s) => [
                {
                  id: uid("f_"),
                  title: title.trim(),
                  formula: formula.trim(),
                  note: note.trim() || undefined,
                  subject: subject.trim() || undefined,
                  bookmarked: false,
                  createdAt: new Date().toISOString(),
                },
                ...s,
              ]);
              setTitle("");
              setFormula("");
              setNote("");
              setSubject("");
            }}
          >
            <Plus size={16} /> Add Formula
          </Button>
        </div>
      </GlassCard>

      {formulas.length === 0 ? (
        <EmptyState
          icon={<Layers size={40} />}
          title="No formulas yet"
          description="Save your key formulas here for quick revision, and bookmark the most important ones."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[...formulas]
            .sort((a, b) => Number(b.bookmarked) - Number(a.bookmarked))
            .map((f) => (
              <GlassCard key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {f.subject && (
                      <span className="rounded bg-primary-500/15 px-1.5 py-0.5 text-[10px] text-primary-300">
                        {f.subject}
                      </span>
                    )}
                    <h3 className="mt-1 font-semibold text-white">{f.title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleBookmark(f.id)}
                    title={f.bookmarked ? "Remove bookmark" : "Bookmark"}
                  >
                    {f.bookmarked ? (
                      <BookmarkCheck size={15} className="text-[var(--color-warning)]" />
                    ) : (
                      <Bookmark size={15} />
                    )}
                  </Button>
                </div>
                <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-lg text-primary-300">
                  {f.formula}
                </div>
                {f.note && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">{f.note}</p>
                )}
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(f.id)} title="Delete">
                    <Trash size={14} />
                  </Button>
                </div>
              </GlassCard>
            ))}
        </div>
      )}
    </div>
  );
}

export default RevisionManager;
