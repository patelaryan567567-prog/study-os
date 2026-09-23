/**
 * Global AI chat store — lives OUTSIDE the React tree so the AI keeps working
 * in the background while the user switches pages. The AIAssistant page and
 * the Topbar logo indicator are just views over this store: conversations,
 * streaming replies and pending AI actions survive every route change.
 */
import { create } from "zustand";
import {
  askGeminiStream,
  hasApiKey,
  syncApiKeysFromCloud,
  type ChatMessage,
  type ImageAttachment,
} from "@/services/gemini/geminiService";
import {
  applyAIActions,
  parseAIActions,
  type AIAction,
} from "@/services/ai/aiActions";
import { buildStudyContext } from "@/services/ai/aiContext";
import { useAppStore } from "@/store";

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const CONVERSATIONS_KEY = "studyos_ai_conversations_v1";
const OLD_HISTORY_KEY = "studyos_ai_chat_v1"; // pre-conversation format
export const AUTO_APPLY_KEY = "studyos_ai_auto_apply_v1";

export const ACTION_PROTOCOL = `
You can prepare actions in StudyOS when the user explicitly asks you to add, create, schedule, or save something. Never say an item was saved yourself. Instead, after your normal human-readable answer, include one fenced block exactly in this format:
\`\`\`studyos-actions
{"actions":[...]}
\`\`\`
Supported action types are: task {type,title,description,priority,dueDate,tags,estimatedMinutes,subtasks}; flashcard {type,front,back,subject}; backlog {type,title,chapter,dueDate,itemType,priority,notes}; note {type,title,content,folder,tags}; calendar {type,title,date,eventType,reminder,location,notes}; lecture {type,title,subject,chapter} (adds to the Lecture Tracker); mistake {type,question,myAnswer,correction,subject} (mistake notebook); formula {type,title,formula,note,subject} (formula notebook). Use YYYY-MM-DD dates. Only include valid actions requested by the user. StudyOS adds creation actions automatically when Auto-add is enabled. You may also DELETE items when the user explicitly asks to delete/remove/clear them, using {type:"delete", target:"task"|"backlog"|"note"|"flashcard"|"mistake"|"formula"|"lecture"|"chapter"|"event", title, subject?, chapter?} where title matches the item's exact name — but never generate delete actions the user did not ask for, and never generate reset, account, blocker, password, or security-setting actions.`;

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/** Load conversations, migrating the old flat history once. */
async function loadConversations(): Promise<Conversation[]> {
  const { loadStore } = await import("@/services/appDataSync");
  const stored = await loadStore<Conversation[] | null>(CONVERSATIONS_KEY, null);
  if (Array.isArray(stored) && stored.length) return stored;
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
    const old = localStorage.getItem(OLD_HISTORY_KEY);
    if (old) {
      const msgs = JSON.parse(old) as ChatMessage[];
      if (msgs.length)
        return [
          {
            id: uid("c_"),
            title: "Previous chat",
            updatedAt: Date.now(),
            messages: msgs,
          },
        ];
    }
  } catch {}
  return [];
}

/** Persist conversations to localStorage + the user's cloud account. */
async function persistConversations(conversations: Conversation[]) {
  try {
    const { persistStore } = await import("@/services/appDataSync");
    await persistStore(CONVERSATIONS_KEY, conversations.slice(0, 30));
  } catch {
    /* best effort */
  }
}

interface AIChatState {
  conversations: Conversation[];
  activeId: string | null;
  input: string;
  attachments: ImageAttachment[];
  busy: boolean;
  keyBusy: boolean;
  streaming: string | null;
  elapsed: number;
  error: string | null;
  online: boolean;
  pendingActions: AIAction[];
  actionNotice: string | null;
  autoApply: boolean;
  keyReady: boolean;
  initialized: boolean;

  init: () => Promise<void>;
  refreshKeyReady: () => void;
  restoreKeysFromCloud: (uid: string) => Promise<void>;
  setActiveId: (id: string | null) => void;
  setInput: (v: string) => void;
  newChat: () => void;
  deleteChat: (id: string) => void;
  pickImage: (file: File) => Promise<void>;
  removeAttachment: (index: number) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  approveActions: () => void;
  discardActions: () => void;
  toggleAutoApply: () => void;
  saveAndTestKey: (key: string) => Promise<void>;
}

let abortController: AbortController | null = null;
let initPromise: Promise<void> | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let listenersBound = false;

export const useAIChatStore = create<AIChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  input: "",
  attachments: [],
  busy: false,
  keyBusy: false,
  streaming: null,
  elapsed: 0,
  error: null,
  online: navigator.onLine,
  pendingActions: [],
  actionNotice: null,
  autoApply: localStorage.getItem(AUTO_APPLY_KEY) !== "false",
  keyReady: hasApiKey(),
  initialized: false,

  /** Idempotent bootstrap: loads history, binds listeners, restores keys. */
  init: async () => {
    if (get().initialized) return;
    if (!initPromise) {
      initPromise = (async () => {
        if (!listenersBound) {
          listenersBound = true;
          window.addEventListener("online", () => set({ online: true }));
          window.addEventListener("offline", () => set({ online: false }));
        }
        const cs = await loadConversations();
        if (cs.length) set({ conversations: cs, activeId: cs[0].id });
        // Background: pull every key saved on this account so the user never
        // has to re-enter API keys after re-login or on a new device.
        const user = useAppStore.getState().user;
        if (user?.id) await get().restoreKeysFromCloud(user.id);
        set({ initialized: true, keyReady: hasApiKey() });
      })();
    }
    await initPromise;
  },

  refreshKeyReady: () => set({ keyReady: hasApiKey() }),

  restoreKeysFromCloud: async (uid) => {
    try {
      const ok = await syncApiKeysFromCloud(uid);
      if (ok || hasApiKey()) set({ keyReady: true });
    } catch {
      /* offline — local keys (if any) keep working */
    }
  },

  setActiveId: (id) => set({ activeId: id }),
  setInput: (v) => set({ input: v }),

  newChat: () => {
    const c: Conversation = {
      id: uid("c_"),
      title: "New chat",
      updatedAt: Date.now(),
      messages: [],
    };
    set({ conversations: [c, ...get().conversations], activeId: c.id });
    void persistConversations(get().conversations);
  },

  deleteChat: (id) => {
    const conversations = get().conversations.filter((c) => c.id !== id);
    set({
      conversations,
      activeId: get().activeId === id ? null : get().activeId,
    });
    void persistConversations(conversations);
  },

  pickImage: async (file) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const base64 = dataUrl.split(",")[1] || "";
    set({
      attachments: [
        ...get().attachments,
        { mime: file.type, data: base64, name: file.name },
      ],
    });
  },

  removeAttachment: (index) =>
    set({ attachments: get().attachments.filter((_, i) => i !== index) }),

  /**
   * Send a prompt (with any attachments) to Gemini. Runs entirely inside the
   * store, so the request/stream keeps going even when the user navigates
   * away from the AI page — coming back shows the live/finished answer.
   */
  send: async (text) => {
    const prompt = text.trim();
    const { busy, attachments, activeId, conversations } = get();
    if ((!prompt && attachments.length === 0) || busy) return;
    set({ error: null, input: "" });

    let convId = activeId;
    if (!conversations.find((c) => c.id === convId)) {
      const c: Conversation = {
        id: uid("c_"),
        title: prompt.slice(0, 40) || "Image doubt",
        updatedAt: Date.now(),
        messages: [],
      };
      convId = c.id;
      set({ conversations: [c, ...get().conversations], activeId: c.id });
    }

    const userMsg: ChatMessage = {
      role: "user",
      text: prompt || "Solve this (see image):",
      images: attachments.length ? attachments : undefined,
    };
    const imgs = attachments;
    set({ attachments: [] });

    // history snapshot BEFORE adding this user turn
    const history = (
      get().conversations.find((c) => c.id === convId)?.messages || []
    ).slice(-10);

    set({
      conversations: get().conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              title:
                c.messages.length === 0
                  ? prompt.slice(0, 40) || "Image doubt"
                  : c.title,
              updatedAt: Date.now(),
              messages: [...c.messages, userMsg],
            }
          : c,
      ),
    });
    void persistConversations(get().conversations);

    set({ busy: true, streaming: "", elapsed: 0 });
    const startedAt = Date.now();
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = setInterval(
      () => set({ elapsed: Math.round((Date.now() - startedAt) / 1000) }),
      1000,
    );
    const controller = new AbortController();
    abortController = controller;

    try {
      const ctx = buildStudyContext();
      const reply = await askGeminiStream(
        prompt || "Solve the question in this image step by step.",
        {
          systemContext: `${ctx.summary}\n${ACTION_PROTOCOL}`,
          history,
          images: imgs,
          signal: controller.signal,
        },
        (partial) => set({ streaming: partial }),
      );
      const parsed = parseAIActions(reply);
      if (parsed.actions.length && get().autoApply) {
        const applied = applyAIActions(parsed.actions);
        set({
          pendingActions: [],
          actionNotice: `${applied} item${applied === 1 ? "" : "s"} added to StudyOS automatically.`,
        });
      } else {
        set({ pendingActions: parsed.actions, actionNotice: null });
      }
      set({
        conversations: get().conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: [
                  ...c.messages,
                  {
                    role: "model" as const,
                    text:
                      parsed.message ||
                      "I've prepared the requested items for your review below.",
                  },
                ],
              }
            : c,
        ),
      });
      void persistConversations(get().conversations);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        set({ streaming: null }); // user pressed Stop — no error needed
      } else {
        set({ error: e?.message || "Something went wrong." });
      }
    } finally {
      if (elapsedTimer) {
        clearInterval(elapsedTimer);
        elapsedTimer = null;
      }
      set({ busy: false, streaming: null });
      abortController = null;
    }
  },

  /** Cancel the in-flight Gemini request (Stop button). */
  stop: () => abortController?.abort(),

  approveActions: () => {
    const applied = applyAIActions(get().pendingActions);
    set({
      pendingActions: [],
      actionNotice: `${applied} item${applied === 1 ? "" : "s"} added to StudyOS.`,
    });
  },

  discardActions: () => set({ pendingActions: [] }),

  toggleAutoApply: () => {
    const next = !get().autoApply;
    localStorage.setItem(AUTO_APPLY_KEY, String(next));
    set({ autoApply: next });
  },

  /**
   * Validate + save one more API key (slot 1, 2 or 3 — 1 is enough).
   * On test failure the just-added key is rolled back and the error thrown.
   */
  saveAndTestKey: async (key) => {
    const trimmed = key.trim();
    if (trimmed.length < 20) {
      throw new Error("That doesn't look like a valid Gemini API key.");
    }
    set({ keyBusy: true, error: null });
    try {
      const svc = await import("@/services/gemini/geminiService");
      const before = svc.getApiKeys();
      const list = svc.addApiKey(trimmed);
      const added = list.length > before.length;
      try {
        await svc.testApiKey(trimmed);
      } catch (e) {
        if (added) svc.removeApiKey(trimmed); // roll back the failed key
        throw e;
      }
      // Follow the account: saved once, auto-applied on every login/device.
      const user = useAppStore.getState().user;
      if (user?.id) await svc.syncApiKeysToCloud(user.id, svc.getApiKeys());
      set({ keyReady: true });
    } finally {
      set({ keyBusy: false });
    }
  },
}));

