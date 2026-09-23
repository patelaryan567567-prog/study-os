import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageIcon } from "lucide-react";
import { Plus, Bookmark, Mic, Trash, Search, Folder, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadStore, persistStore } from "@/services/appDataSync";

type Attachment = {
  id: string;
  type: "image" | "pdf" | "voice";
  name: string;
  data: string;
};

type Note = {
  id: string;
  title: string;
  content: string;
  mode: "markdown" | "rich";
  folder?: string;
  tags?: string[];
  bookmarked?: boolean;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt?: string;
};

const STORAGE_KEY = "studyos_notes_v1";

const FOLDER_COLORS = [
  { chip: "bg-blue-500/15", text: "text-blue-400" },
  { chip: "bg-emerald-500/15", text: "text-emerald-400" },
  { chip: "bg-amber-500/15", text: "text-amber-400" },
  { chip: "bg-pink-500/15", text: "text-pink-400" },
  { chip: "bg-cyan-500/15", text: "text-cyan-400" },
];

type SortMode = "updated" | "created" | "title";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function plainSnippet(md: string, len = 80) {
  const text = md
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? text.slice(0, len) + "…" : text;
}

function wordCount(md: string) {
  const t = md.replace(/<[^>]+>/g, " ").trim();
  return t ? t.split(/\s+/).length : 0;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string | null>(null); // null = all
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [focusedMode, setFocusedMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    loadStore<{ notes?: Note[]; folders?: string[] }>(STORAGE_KEY, {}).then(
      (parsed) => {
        setNotes(parsed.notes || []);
        setFolders(parsed.folders || []);
      },
    );
  }, []);

  useEffect(() => {
    persistStore(STORAGE_KEY, { notes, folders });
  }, [notes, folders]);

  const createNote = (folder?: string) => {
    const n: Note = {
      id: uid("n_"),
      title: "Untitled",
      content: "",
      mode: "markdown",
      folder: folder ?? folderFilter ?? undefined,
      tags: [],
      bookmarked: false,
      attachments: [],
      createdAt: new Date().toISOString(),
    };
    setNotes((s) => [n, ...s]);
    setSelectedId(n.id);
  };

  const updateNote = (id: string, patch: Partial<Note>) =>
    setNotes((s) =>
      s.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
  const removeNote = (id: string) => {
    setNotes((s) => s.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = notes.find((n) => n.id === selectedId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (folderFilter && n.folder !== folderFilter) return false;
      if (bookmarkedOnly && !n.bookmarked) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
        (n.attachments || []).some((a) => a.name.toLowerCase().includes(q))
      );
    });
    return [...list].sort((a, b) => {
      if (sortMode === "title") return a.title.localeCompare(b.title);
      const da = new Date(a.updatedAt || a.createdAt).getTime();
      const db = new Date(b.updatedAt || b.createdAt).getTime();
      if (sortMode === "created")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return db - da;
    });
  }, [notes, query, folderFilter, bookmarkedOnly, sortMode]);

  const addFolder = (name: string) => {
    if (!name.trim()) return;
    setFolders((s) => Array.from(new Set([name.trim(), ...s])));
  };

  const onImage = async (file: File) => {
    const data = await fileToDataUrl(file);
    if (!selected) return;
    const att: Attachment = {
      id: uid("a_"),
      type: file.type === "application/pdf" ? "pdf" : "image",
      name: file.name,
      data,
    };
    updateNote(selected.id, {
      attachments: [...(selected.attachments || []), att],
    });
  };

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base = await blobToDataURL(blob);
        if (selected) {
          const att: Attachment = {
            id: uid("a_"),
            type: "voice",
            name: `voice-${new Date().toISOString().slice(0, 16).replace("T", "-")}.webm`,
            data: base,
          };
          updateNote(selected.id, {
            attachments: [...(selected.attachments || []), att],
          });
        }
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = () => {
    if (mediaRef.current) {
      mediaRef.current.stop();
      mediaRef.current = null;
    }
    setRecording(false);
  };

  function blobToDataURL(blob: Blob) {
    return new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  const mdProse = "prose-note";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
          />
          <input
            className="glass rounded-xl pl-9 pr-3 py-2 w-full bg-transparent outline-none"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant={bookmarkedOnly ? "primary" : "secondary"}
          onClick={() => setBookmarkedOnly((v) => !v)}
        >
          <Bookmark size={14} /> Saved
        </Button>
        <select
          className="glass rounded-xl px-3 py-2 text-xs"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
        >
          <option value="updated">Sort: Last updated</option>
          <option value="created">Sort: Newest</option>
          <option value="title">Sort: Title A–Z</option>
        </select>
        <Button variant="primary" onClick={() => createNote()}>
          <Plus size={14} /> New Note
        </Button>
        <Input
          placeholder="New folder + Enter"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addFolder(newFolderName);
              setNewFolderName("");
            }
          }}
        />
      </div>

      {focusedMode ? (
        // ---- Focused writing mode: editor + preview only, max width ----
        <Card padding="lg" className="max-w-4xl mx-auto">
          {!selected ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Select or create a note to begin.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={selected.title}
                  onChange={(e) => updateNote(selected.id, { title: e.target.value })}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  title="Exit focused mode"
                  onClick={() => setFocusedMode(false)}
                >
                  <Minimize2 size={16} />
                </Button>
              </div>
              {selected.mode === "markdown" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Textarea
                    value={selected.content}
                    onChange={(e) =>
                      updateNote(selected.id, { content: e.target.value })
                    }
                    className="min-h-[55vh]"
                  />
                  <div className="p-3 glass overflow-auto max-h-[55vh]">
                    <div className={mdProse}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selected.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  contentEditable
                  className="glass rounded-xl p-3 min-h-[55vh] outline-none"
                  onInput={(e) =>
                    updateNote(selected.id, { content: e.currentTarget.innerHTML })
                  }
                  dangerouslySetInnerHTML={{ __html: selected.content }}
                />
              )}
              <div className="text-xs text-[var(--color-text-muted)]">
                {wordCount(selected.content)} words •{" "}
                {selected.updatedAt
                  ? `Updated ${new Date(selected.updatedAt).toLocaleString()}`
                  : `Created ${new Date(selected.createdAt).toLocaleString()}`}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Card padding="md" className="glow-border-purple">
              <h4 className="font-semibold text-purple-300">Folders</h4>
              <div className="mt-3 space-y-2">
                <button
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                    folderFilter === null
                      ? "bg-purple-500/15 text-purple-300 shadow-[0_0_14px_rgba(192,132,252,0.15)]"
                      : "hover:bg-white/5 text-[var(--color-text-muted)]"
                  }`}
                  onClick={() => setFolderFilter(null)}
                >
                  All notes ({notes.length})
                </button>
                {folders.map((f, idx) => {
                  const color = FOLDER_COLORS[idx % FOLDER_COLORS.length];
                  return (
                    <button
                      key={f}
                      className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-sm transition-all ${
                        folderFilter === f
                          ? `${color.chip} shadow-[0_0_14px_rgba(124,140,255,0.15)]`
                          : "hover:bg-white/5 text-[var(--color-text-muted)]"
                      }`}
                      onClick={() => setFolderFilter(f)}
                    >
                      <Folder size={13} className={color.text} />
                      <span className={folderFilter === f ? color.text : ""}>
                        {f} ({notes.filter((n) => n.folder === f).length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card padding="md" className="mt-4 glow-border-blue">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-blue-300">Notes</h4>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {filtered.length} shown
                </span>
              </div>
              <div className="mt-3 space-y-2 max-h-[45vh] overflow-auto pr-1">
                {filtered.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] py-2">
                    No notes found.
                  </p>
                )}
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className={`glass rounded-xl p-3 cursor-pointer accent-left hover-glow ${
                      selectedId === n.id
                        ? "glow-border-blue ring-1 ring-blue-400/40"
                        : ""
                    }`}
                    style={{
                      ["--accent-top" as string]: n.bookmarked
                        ? "#fbbf24"
                        : "#60a5fa",
                      ["--accent-bottom" as string]: n.bookmarked
                        ? "#f472b6"
                        : "#34d399",
                    }}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          {n.bookmarked && (
                            <Bookmark size={11} className="fill-current shrink-0" />
                          )}
                          <span className="truncate">{n.title}</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {plainSnippet(n.content) ||
                            (n.folder || new Date(n.createdAt).toLocaleDateString())}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          {n.folder ? n.folder + " • " : ""}
                          {new Date(n.updatedAt || n.createdAt).toLocaleDateString()}
                        </div>
                        {(n.tags || []).length > 0 && <div className="mt-1 flex gap-1 overflow-hidden">{n.tags!.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">#{tag}</span>)}</div>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Bookmark"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNote(n.id, { bookmarked: !n.bookmarked });
                          }}
                        >
                          <Bookmark
                            size={14}
                            className={n.bookmarked ? "fill-current" : ""}
                          />
                        </Button>
                        <Button
                          size="icon"
                          variant="danger"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNote(n.id);
                          }}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card padding="lg" className="glow-border-blue">
              {!selected && (
                <div className="text-sm text-[var(--color-text-muted)]">
                  Select or create a note to begin.
                </div>
              )}
              {selected && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={selected.title}
                      onChange={(e) =>
                        updateNote(selected.id, { title: e.target.value })
                      }
                    />
                    <select
                      className="glass rounded-xl px-3 py-2.5"
                      value={selected.mode}
                      onChange={(e) =>
                        updateNote(selected.id, {
                          mode: e.target.value as Note["mode"],
                        })
                      }
                    >
                      <option value="markdown">Markdown</option>
                      <option value="rich">Rich Text</option>
                    </select>
                    <select
                      className="glass rounded-xl px-3 py-2.5 max-w-[140px]"
                      value={selected.folder || ""}
                      onChange={(e) =>
                        updateNote(selected.id, {
                          folder: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">No folder</option>
                      {folders.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Focused writing mode"
                      onClick={() => setFocusedMode(true)}
                    >
                      <Maximize2 size={16} />
                    </Button>
                  </div>
                  <Input
                    label="Tags (comma separated)"
                    value={(selected.tags || []).join(", ")}
                    onChange={(e) => updateNote(selected.id, { tags: e.target.value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean) })}
                  />

                  {selected.mode === "markdown" ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Textarea
                        value={selected.content}
                        onChange={(e) =>
                          updateNote(selected.id, { content: e.target.value })
                        }
                      />
                      <div className="p-3 glass overflow-auto max-h-[50vh]">
                        <div className={mdProse}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selected.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        contentEditable
                        className="glass rounded-xl p-3 min-h-[200px] outline-none"
                        onInput={(e) =>
                          updateNote(selected.id, {
                            content: e.currentTarget.innerHTML,
                          })
                        }
                        dangerouslySetInnerHTML={{ __html: selected.content }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="glass rounded-xl px-3 py-2 cursor-pointer">
                      <ImageIcon size={16} />{" "}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onImage(f);
                          e.target.value = null;
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                    <Button
                      variant={recording ? "danger" : "secondary"}
                      onClick={() =>
                        recording ? stopRecording() : startRecording()
                      }
                    >
                      <Mic size={14} /> {recording ? "Stop" : "Record"}
                    </Button>
                    <Button
                      variant={selected.bookmarked ? "primary" : "secondary"}
                      onClick={() =>
                        updateNote(selected.id, {
                          bookmarked: !selected.bookmarked,
                        })
                      }
                    >
                      <Bookmark size={14} />{" "}
                      {selected.bookmarked ? "Bookmarked" : "Bookmark"}
                    </Button>
                    <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                      {wordCount(selected.content)} words •{" "}
                      {selected.attachments?.length || 0} attachments
                    </span>
                  </div>

                  {(selected.attachments || []).length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {(selected.attachments || []).map((att) => (
                        <div key={att.id} className="glass rounded-xl p-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs truncate" title={att.name}>
                              {att.name}
                            </div>
                            <Button
                              size="icon"
                              variant="danger"
                              onClick={() =>
                                updateNote(selected.id, {
                                  attachments: (selected.attachments || []).filter(
                                    (a) => a.id !== att.id,
                                  ),
                                })
                              }
                            >
                              <Trash size={12} />
                            </Button>
                          </div>
                          {att.type === "image" && (
                            <img
                              src={att.data}
                              alt={att.name}
                              className="max-h-28 rounded-lg w-full object-cover"
                            />
                          )}
                          {att.type === "pdf" && (
                            <a
                              href={att.data}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs underline"
                            >
                              Open PDF
                            </a>
                          )}
                          {att.type === "voice" && (
                            <audio controls src={att.data} className="w-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div>
            <Card padding="md" className="glow-border-amber">
              <h4 className="font-semibold text-amber-300">Bookmarks</h4>
              <div className="mt-3 space-y-2">
                {notes.filter((n) => n.bookmarked).length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No bookmarks yet.
                  </p>
                )}
                {notes
                  .filter((n) => n.bookmarked)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="glass rounded-xl p-2 cursor-pointer hover-glow text-amber-200/90"
                      onClick={() => setSelectedId(n.id)}
                    >
                      {n.title}
                    </div>
                  ))}
              </div>
            </Card>

            <Card padding="md" className="mt-4 glow-border-cyan">
              <h4 className="font-semibold text-cyan-300">Stats</h4>
              <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                Notes: {notes.length} • Folders: {folders.length}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notes;
