import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ImageIcon } from "lucide-react";
import { Plus, Bookmark, Mic, Trash } from "lucide-react";
import { readStoredJson, writeStoredJson } from "@/utils/storage";
import { reportError } from "@/utils/errors";

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
  bookmarked?: boolean;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt?: string;
};

const STORAGE_KEY = "studyos_notes_v1";

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function markdownToHtml(md: string) {
  // Minimal markdown -> HTML for basic support
  let out = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  out = out.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  out = out.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  out = out.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  out = out.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  out = out.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/gim, "<code>$1</code>");
  out = out.replace(/\n/g, "<br/>");
  out = out.replace(
    /\[(.*?)\]\((.*?)\)/gim,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return out;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const stored = readStoredJson<{ notes?: Note[]; folders?: string[] }>(
      STORAGE_KEY,
      {},
    );
    setNotes(stored.notes || []);
    setFolders(stored.folders || []);
  }, []);

  useEffect(() => {
    writeStoredJson(STORAGE_KEY, { notes, folders });
  }, [notes, folders]);

  const createNote = (folder?: string) => {
    const n: Note = {
      id: uid("n_"),
      title: "Untitled",
      content: "",
      mode: "markdown",
      folder,
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
    return notes.filter((n) => {
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.attachments || []).some((a) => a.name.toLowerCase().includes(q))
      );
    });
  }, [notes, query]);

  const addFolder = (name: string) => {
    if (!name.trim()) return;
    setFolders((s) => Array.from(new Set([name.trim(), ...s])));
  };

  const onImage = async (file: File) => {
    if (!selected) return;
    try {
      const data = await fileToDataUrl(file);
      const att: Attachment = {
        id: uid("a_"),
        type: file.type === "application/pdf" ? "pdf" : "image",
        name: file.name,
        data,
      };
      updateNote(selected.id, {
        attachments: [...(selected.attachments || []), att],
      });
    } catch (error) {
      reportError(
        `Unable to attach "${file.name}"`,
        error,
        "That file could not be attached. Please try again.",
      );
    }
  };

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () =>
        rej(r.error ?? new Error(`Unable to read file "${file.name}".`));
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
      mr.onerror = (event) =>
        reportError(
          "Voice recording failed",
          (event as unknown as { error?: unknown }).error ?? event,
          "Voice recording stopped unexpectedly.",
        );
      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!selected) return;
        try {
          const base = await blobToDataURL(
            new Blob(chunksRef.current, { type: "audio/webm" }),
          );
          const att: Attachment = {
            id: uid("a_"),
            type: "voice",
            name: `voice-${new Date().toISOString()}.webm`,
            data: base,
          };
          updateNote(selected.id, {
            attachments: [...(selected.attachments || []), att],
          });
        } catch (error) {
          reportError(
            "Unable to save voice recording",
            error,
            "The voice recording could not be saved.",
          );
        }
      };
      mr.start();
      setRecording(true);
    } catch (error) {
      setRecording(false);
      reportError(
        "Unable to start voice recording",
        error,
        "Recording could not start. Check that microphone access is allowed.",
      );
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
      r.onerror = () =>
        rej(r.error ?? new Error("Unable to read the recorded audio."));
      r.readAsDataURL(blob);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="primary" onClick={() => createNote()}>
          <Plus size={14} /> New Note
        </Button>
        <Input
          placeholder="New folder"
          onKeyDown={(e: any) => {
            if (e.key === "Enter") {
              addFolder(e.target.value);
              e.target.value = "";
            }
          }}
        />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div>
          <Card padding="md">
            <h4 className="font-semibold">Folders</h4>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedId(null)}
                >
                  All
                </Button>
              </div>
              {folders.map((f) => (
                <div key={f} className="flex items-center justify-between">
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setQuery("");
                      setSelectedId(null);
                      setNotes((n) => n);
                      setNotes((n) => n);
                      setNotes((n) => n);
                      setNotes((n) => n);
                      setNotes((n) => n);
                    }}
                  >
                    {f}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md" className="mt-4">
            <h4 className="font-semibold">Notes</h4>
            <div className="mt-3 space-y-2 max-h-[40vh] overflow-auto">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`glass rounded-xl p-3 cursor-pointer ${selectedId === n.id ? "ring-2 ring-[var(--color-accent)]" : ""}`}
                  onClick={() => {
                    setSelectedId(n.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {n.folder || new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          updateNote(n.id, { bookmarked: !n.bookmarked });
                        }}
                      >
                        <Bookmark size={14} />
                      </Button>
                      <Button
                        size="icon"
                        variant="danger"
                        onClick={(e: any) => {
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
          <Card padding="lg">
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
                    onChange={(e: any) =>
                      updateNote(selected.id, { title: e.target.value })
                    }
                  />
                  <select
                    className="glass rounded-xl px-3 py-2.5"
                    value={selected.mode}
                    onChange={(e: any) =>
                      updateNote(selected.id, { mode: e.target.value })
                    }
                  >
                    <option value="markdown">Markdown</option>
                    <option value="rich">Rich Text</option>
                  </select>
                </div>

                {selected.mode === "markdown" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Textarea
                      value={selected.content}
                      onChange={(e: any) =>
                        updateNote(selected.id, { content: e.target.value })
                      }
                    />
                    <div
                      className="p-3 glass overflow-auto"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(selected.content),
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <div
                      contentEditable
                      className="glass rounded-xl p-3 min-h-[200px]"
                      onInput={(e: any) =>
                        updateNote(selected.id, {
                          content: e.currentTarget.innerHTML,
                        })
                      }
                      dangerouslySetInnerHTML={{ __html: selected.content }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="glass rounded-xl px-3 py-2 cursor-pointer">
                    <ImageIcon size={16} />{" "}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e: any) => {
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
                    variant="primary"
                    onClick={() =>
                      updateNote(selected.id, {
                        bookmarked: !selected.bookmarked,
                      })
                    }
                  >
                    <Bookmark size={14} />{" "}
                    {selected.bookmarked ? "Bookmarked" : "Bookmark"}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(selected.attachments || []).map((att) => (
                    <div key={att.id} className="glass rounded-xl p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{att.name}</div>
                        <div>
                          {att.type === "image" && (
                            <img
                              src={att.data}
                              alt={att.name}
                              className="max-h-28"
                            />
                          )}
                          {att.type === "pdf" && (
                            <a href={att.data} target="_blank" rel="noreferrer">
                              Open PDF
                            </a>
                          )}
                          {att.type === "voice" && (
                            <audio controls src={att.data} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card padding="md">
            <h4 className="font-semibold">Bookmarks</h4>
            <div className="mt-3 space-y-2">
              {notes
                .filter((n) => n.bookmarked)
                .map((n) => (
                  <div
                    key={n.id}
                    className="glass rounded-xl p-2 cursor-pointer"
                    onClick={() => setSelectedId(n.id)}
                  >
                    {n.title}
                  </div>
                ))}
            </div>
          </Card>

          <Card padding="md" className="mt-4">
            <h4 className="font-semibold">Stats</h4>
            <div className="mt-3 text-sm text-[var(--color-text-muted)]">
              Notes: {notes.length} • Folders: {folders.length}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Notes;
