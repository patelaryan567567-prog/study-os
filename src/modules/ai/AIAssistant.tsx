import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiKeyManager } from "@/modules/ai/ApiKeyManager";
import { useAIChatStore } from "@/store/aiChatStore";
import { actionLabel } from "@/services/ai/aiActions";
import {
  Sparkles,
  Send,
  Bot,
  User,
  CalendarCheck,
  Lightbulb,
  TrendingUp,
  HelpCircle,
  Loader2,
  WifiOff,
  ImagePlus,
  X,
  MessageSquare,
  Plus,
  Trash2,
  ListPlus,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const QUICK_ACTIONS = [
  {
    icon: CalendarCheck,
    label: "Plan my day",
    color: "text-emerald-400 bg-emerald-500/10",
    prompt:
      "Plan my study day based on my pending backlog, overdue items and module progress. Give a prioritized schedule with time blocks.",
  },
  {
    icon: Lightbulb,
    label: "Recommendations",
    color: "text-amber-400 bg-amber-500/10",
    prompt:
      "Look at my study data and give me 3-5 specific recommendations to improve my productivity and catch up on pending work.",
  },
  {
    icon: TrendingUp,
    label: "Analyze progress",
    color: "text-cyan-400 bg-cyan-500/10",
    prompt:
      "Analyze my study progress: module completion, backlog health, focus streak. Tell me what's going well and what needs attention.",
  },
  {
    icon: HelpCircle,
    label: "Solve a doubt",
    color: "text-purple-400 bg-purple-500/10",
    prompt:
      "I have a study doubt. Ask me what it is, then explain the concept step by step with an example.",
  },
];

/* ------------------------------ component ------------------------------ */

export function AIAssistant() {
  // All chat state lives in the GLOBAL store, so requests and streaming keep
  // running in the background while the user switches to any other page.
  const {
    conversations,
    activeId,
    input,
    attachments,
    busy,
    streaming,
    elapsed,
    error,
    online,
    pendingActions,
    actionNotice,
    autoApply,
    keyReady,
    init,
    setActiveId,
    setInput,
    newChat,
    deleteChat,
    pickImage,
    removeAttachment,
    send,
    stop,
    approveActions,
    discardActions,
    toggleAutoApply,
  } = useAIChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = conversations.find((c) => c.id === activeId) || null;

  // Bootstrap once — loads history and restores the account's API keys.
  useEffect(() => {
    void init();
  }, [init]);

  // auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, busy, streaming]);

  const startNewChat = () => {
    newChat();
    setSidebarOpen(false);
  };

  const onPickImage = (file: File) => {
    void pickImage(file);
  };

  /* send / stop / approveActions / toggleAutoApply all come from the
     global store — they keep running across page switches. */

  /* ---------------- API key onboarding (1–3 keys, auto-fallback) ---------------- */
  if (!keyReady) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card padding="lg" className="glow-border-purple">
          <div className="text-center">
            <Sparkles size={40} className="mx-auto text-purple-400" />
            <h3 className="text-2xl font-bold gradient-title mt-3">
              Activate StudyOS AI
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-md mx-auto">
              Bring your own free Gemini API key(s) — they stay yours, are saved
              once, and sync to your account so you never enter them again.
            </p>
          </div>
          <div className="mt-6 text-left">
            <ApiKeyManager variant="page" />
          </div>
          {error && (
            <p className="text-sm text-red-400 mt-3 text-center">{error}</p>
          )}
        </Card>
      </div>
    );
  }

  /* ---------------- main chat layout ---------------- */
  const messages = active?.messages || [];

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 max-w-6xl mx-auto">
      {/* -------- conversations sidebar -------- */}
      <div className={`${sidebarOpen ? "block" : "hidden"} lg:block`}>
        <Card padding="md" className="glow-border-purple">
          <Button variant="primary" className="w-full" onClick={startNewChat}>
            <Plus size={14} /> New Chat
          </Button>
          <div className="mt-3 space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {conversations.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] px-2 py-3">
                No conversations yet.
              </p>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-all ${
                  activeId === c.id
                    ? "bg-purple-500/15 ring-1 ring-purple-400/40"
                    : "hover:bg-white/5"
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setSidebarOpen(false);
                }}
              >
                <MessageSquare size={13} className="shrink-0 text-purple-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{c.title}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(c.updatedAt).toLocaleDateString()} • {c.messages.length} msgs
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity shrink-0"
                  title="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* -------- chat area -------- */}
      <div className="space-y-3 min-w-0">
        <Card padding="md" className="glow-border-blue flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden glass rounded-lg p-2"
              onClick={() => setSidebarOpen((v) => !v)}
              title="Chats"
            >
              <MessageSquare size={16} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/25 to-blue-500/25 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold gradient-title text-xl">StudyOS AI</h3>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                Create tasks, lectures, flashcards, backlog, notes, formulas and more from your prompts • review before saving
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleAutoApply}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${autoApply ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/15 bg-white/5 text-[var(--color-text-muted)]"}`}
            aria-pressed={autoApply}
            title="When enabled, AI-created items are saved straight to StudyOS"
          >
            <ShieldCheck size={14} /> {autoApply ? "Auto-add on" : "Review mode"}
          </button>
          {!online && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <WifiOff size={12} /> Offline
            </span>
          )}
        </Card>

        {/* quick actions */}
        {messages.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                disabled={busy || !online}
                onClick={() => send(a.prompt)}
                className="glass rounded-xl p-3 flex flex-col items-center gap-2 hover-glow disabled:opacity-50 transition-all"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.color}`}>
                  <a.icon size={17} />
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* messages */}
        <Card padding="md" className="glow-border-blue">
          <div ref={listRef} className="max-h-[52vh] overflow-y-auto space-y-4 pr-1">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto">
                  <Bot size={26} className="text-purple-400" />
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-3">
                  Ask any doubt — <b>text me</b> ya <b>photo attach karke</b> question poocho 📸
                </p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                      m.role === "user"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-gradient-to-br from-purple-500/25 to-blue-500/25 text-purple-400"
                    }`}
                  >
                    {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
                  </div>
                  <div
                    className={`glass rounded-xl p-3 max-w-[80%] prose-note ${
                      m.role === "user" ? "bg-blue-500/10 rounded-tr-sm" : "rounded-tl-sm"
                    }`}
                  >
                    {m.images?.length ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {m.images.map((img, j) => (
                          <img
                            key={j}
                            src={`data:${img.mime};base64,${img.data}`}
                            alt={img.name || "attachment"}
                            className="max-h-36 rounded-lg border border-white/10"
                          />
                        ))}
                      </div>
                    ) : null}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {streaming !== null && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/25 to-blue-500/25 flex items-center justify-center">
                  <Bot size={15} className="text-purple-400" />
                </div>
                <div className="glass rounded-xl px-4 py-3 max-w-[80%]">
                  {streaming ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streaming}</ReactMarkdown>
                      <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse align-middle ml-0.5" />
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span className="text-xs text-[var(--color-text-muted)] ml-2">
                          Thinking… {elapsed}s
                        </span>
                      </div>
                      <button
                        onClick={stop}
                        className="self-start text-[11px] text-red-300/80 hover:text-red-300 underline underline-offset-2 transition-colors"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400 mt-3 px-1">{error}</p>}
          {actionNotice && <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200"><CheckCircle2 size={16} /> {actionNotice}</p>}
          {pendingActions.length > 0 && (
            <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-purple-100"><ListPlus size={16} /> AI prepared {pendingActions.length} item{pendingActions.length === 1 ? "" : "s"}</p>
                  <p className="mt-0.5 text-xs text-purple-200/70">Review these before they are added to your app.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={discardActions}>Discard</Button>
                  <Button size="sm" variant="primary" onClick={approveActions}>Add all</Button>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {pendingActions.map((action, index) => <li key={`${action.type}_${index}`} className="rounded-lg bg-black/15 px-2.5 py-1.5 text-xs text-purple-50">{actionLabel(action)}</li>)}
              </ul>
            </div>
          )}

          {/* attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {attachments.map((a, i) => (
                <div key={i} className="relative glass rounded-lg p-1.5">
                  <img
                    src={`data:${a.mime};base64,${a.data}`}
                    alt={a.name}
                    className="h-16 w-16 object-cover rounded"
                  />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    onClick={() => removeAttachment(i)}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* input row */}
          <div className="flex gap-2 mt-3 items-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(onPickImage);
                e.target.value = null;
              }}
            />
            <button
              className="glass rounded-xl p-2.5 shrink-0 hover-glow text-[var(--color-text-muted)]"
              title="Attach image (question photo)"
              onClick={() => fileRef.current?.click()}
              disabled={!online}
            >
              <ImagePlus size={17} />
            </button>
            <Input
              placeholder="e.g. Add 15 biology flashcards, schedule an exam, or create my task list..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              // Note: deliberately NOT disabled when offline. Electron's
              // navigator.onLine can flap and a silently-disabled input is the
              // exact "typing area never appears" bug report; typing is always
              // allowed and only the send button is gated below.
            />
            <Button
              variant="primary"
              onClick={() => send(input)}
              disabled={busy || (!input.trim() && attachments.length === 0) || !online}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AIAssistant;
