/**
 * Gemini AI service — user-owned API keys (up to 3, with auto-rotation) + chat.
 *
 * Key lifecycle:
 *  1. User enters 1–3 Gemini API keys (AI page or Settings). One key is enough;
 *     extra keys are optional fallbacks for when a key hits its rate limit.
 *  2. They are saved to localStorage (instant, offline) AND to the user's
 *     Firestore profile (settings.geminiApiKeys) so they follow the account.
 *  3. On every login/app start `syncApiKeysFromCloud()` merges them back —
 *     keys are NEVER deleted automatically; the user never types them again.
 *  4. When a request fails with 429/quota/invalid-key, the service puts that
 *     key on a short cooldown and transparently retries with the next key,
 *     emitting a `studyos-ai-key-rotated` window event so the UI can show a
 *     "switched to API Key N" notice.
 */
import {
  GoogleGenerativeAI,
  type Content,
  type Part,
} from "@google/generative-ai";
import {
  getUserProfile,
  updateUserProfile,
} from "@/services/firestoreService";

/** Legacy single-key storage (kept in sync so older builds keep working). */
const KEY_STORAGE = "studyos_gemini_api_key";
/** Multi-key storage: JSON array with up to MAX_API_KEYS entries. */
const KEYS_STORAGE = "studyos_gemini_api_keys_v1";

export const MAX_API_KEYS = 3;

/** Window events emitted by this service (for toasts / status dots). */
export const KEYS_CHANGED_EVENT = "studyos-ai-keys-changed";
export const KEY_ROTATION_EVENT = "studyos-ai-key-rotated";

/**
 * Per-request cap so the UI never hangs on "Thinking…" forever.
 * If Gemini doesn't answer within this window, the request is aborted and a
 * friendly error is shown instead of an infinite spinner.
 */
const REQUEST_TIMEOUT_MS = 60_000;
/** Cap for quick metadata calls (model listing / key test). */
const LIST_TIMEOUT_MS = 10_000;

/**
 * How long a rate-limited key is skipped before it becomes usable again.
 * Gemini free-tier limits are per-minute, so ~65s is a safe reset window.
 */
const KEY_COOLDOWN_MS = 65_000;

/**
 * Newest Flash models first; the chain auto-skips any that 404 for a key.
 * NOTE: `gemini-1.5-flash` was retired by Google (Sept 2025) — it now 404s
 * for EVERY key, so it must stay out of this list (a dead entry would waste
 * an API call on a guaranteed failure for every single message).
 */
const FALLBACK_MODELS = [
  "gemini-flash-latest", // Google alias → always the current stable Flash
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite", // higher free-tier RPM — handy under rate limits
  "gemini-2.0-flash",
];
let cachedModel: string | null = null;

/**
 * The resolved model is also persisted with a TTL so a cold app start can
 * send its first message without an extra model-list roundtrip.
 */
const MODEL_CACHE_KEY = "studyos_gemini_model_v1";
const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // re-resolve once a day

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** fetch() wrapper that always settles — aborts after `ms` if the network hangs. */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Transient server errors worth retrying shortly (Google: 500/503/504). */
function isTransientServerError(e: any): boolean {
  return /503|500|504|overloaded|UNAVAILABLE|INTERNAL/i.test(
    `${e?.status ?? ""} ${e?.message ?? ""}`,
  );
}

/**
 * Retry a generate call on transient server errors (503 overloaded,
 * 500/504 internal) with exponential backoff + jitter.
 * Gemini officially recommends ~3 retries with increasing delay.
 * NOTE: 429 (rate limit) is intentionally NOT retried here — the key
 * rotation layer already switches to the next key on 429.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (isTransientServerError(err) && i < retries - 1) {
        const jitter = Math.floor(Math.random() * 750);
        await sleep(baseDelay * (i + 1) + jitter);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Pick a working Gemini Flash model for this key.
 * Strategy: use the cached model while fresh, otherwise ask the API for the
 * key's model list and prefer the newest full-size Flash model it can see.
 * Falls back to the static chain (FALLBACK_MODELS[0]) when the list is
 * unreachable. The cache self-heals: if the chosen model ever 404s, the chat
 * chain invalidates it and the next call re-resolves a live model.
 */
export async function resolveModel(keyArg?: string): Promise<string> {
  if (cachedModel) return cachedModel;
  // Fresh enough from a previous session? (skips a model-list roundtrip)
  try {
    const raw = localStorage.getItem(MODEL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.model === "string" &&
        typeof parsed?.ts === "number" &&
        Date.now() - parsed.ts < MODEL_CACHE_TTL_MS
      ) {
        cachedModel = parsed.model;
        return cachedModel;
      }
    }
  } catch {}
  const key = keyArg || getApiKey();
  if (key) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=200`,
        LIST_TIMEOUT_MS,
      );
      if (res.ok) {
        const data = await res.json();
        const names: string[] = (data.models || [])
          .map((m: any) => String(m.name || "").replace(/^models\//, ""))
          .filter(
            (n: string) =>
              /^gemini-[\d.]+-flash(-\d+b)?(?!-exp|-image|-thinking|-preview)/.test(
                n,
              ),
          );
        // prefer the newest full-size Flash model the key can see
        const versionOf = (n: string) =>
          parseFloat((n.match(/gemini-([\d.]+)/) || [])[1] || "0");
        // newest first; for equal versions the shorter (full-size) name wins
        names.sort((a, b) => versionOf(b) - versionOf(a) || a.length - b.length);
        const preferred = names.find((n) => !/-8b$/.test(n)) || names[0];
        if (preferred) {
          cachedModel = preferred;
          persistModelCache(preferred);
          return cachedModel;
        }
      }
    } catch {
      /* fall through to static list */
    }
  }
  cachedModel = FALLBACK_MODELS[0];
  persistModelCache(cachedModel);
  return cachedModel;
}

/** Remember the working model across sessions (TTL-bounded). */
function persistModelCache(model: string): void {
  try {
    localStorage.setItem(
      MODEL_CACHE_KEY,
      JSON.stringify({ model, ts: Date.now() }),
    );
  } catch {}
}

/** Forget the remembered model (memory + storage) — used when it 404s. */
function invalidateModelCache(): void {
  cachedModel = null;
  try {
    localStorage.removeItem(MODEL_CACHE_KEY);
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════
 * Multi-key storage (up to 3 keys, auto-rotation on rate limit)
 * ═══════════════════════════════════════════════════════════════════════ */

/** key → timestamp until which the key is skipped (rate limit / invalid). */
const keyCooldowns = new Map<string, number>();

/** Clean up a key list: trim, drop empties/dupes/too-short entries, cap at 3. */
function normalizeKeys(keys: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keys) {
    const key = String(raw ?? "").trim();
    if (key.length < 20 || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= MAX_API_KEYS) break;
  }
  return out;
}

function emit(name: string, detail?: unknown): void {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {}
}

function readStoredKeys(): string[] {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeKeys(parsed);
    }
  } catch {}
  // Legacy single-key fallback (pre multi-key installs).
  try {
    const legacy = localStorage.getItem(KEY_STORAGE);
    if (legacy) return normalizeKeys([legacy]);
  } catch {}
  return [];
}

function writeStoredKeys(keys: string[]): void {
  const normalized = normalizeKeys(keys);
  try {
    if (normalized.length) {
      localStorage.setItem(KEYS_STORAGE, JSON.stringify(normalized));
      // Keep the legacy slot pointing at the primary key for old builds.
      localStorage.setItem(KEY_STORAGE, normalized[0]);
    } else {
      localStorage.removeItem(KEYS_STORAGE);
      localStorage.removeItem(KEY_STORAGE);
    }
  } catch {}
}

/** All saved keys in priority order (index 0 = primary). */
export function getApiKeys(): string[] {
  return readStoredKeys();
}

/** Save the full key list (already validated by the UI). */
export function saveApiKeys(keys: string[]): string[] {
  const normalized = normalizeKeys(keys);
  const previous = readStoredKeys();
  writeStoredKeys(normalized);
  // Forget cooldowns for keys that are no longer saved.
  for (const key of Array.from(keyCooldowns.keys())) {
    if (!normalized.includes(key)) keyCooldowns.delete(key);
  }
  if (JSON.stringify(normalized) !== JSON.stringify(previous)) {
    emit(KEYS_CHANGED_EVENT, { keys: maskKeys(normalized) });
  }
  return normalized;
}

/** Add one more key (if room) without touching the others. Returns the list. */
export function addApiKey(key: string): string[] {
  const list = readStoredKeys();
  const trimmed = key.trim();
  if (
    trimmed.length >= 20 &&
    !list.includes(trimmed) &&
    list.length < MAX_API_KEYS
  ) {
    list.push(trimmed);
  }
  return saveApiKeys(list);
}

/** Explicitly remove a single key (user action only — never automatic). */
export function removeApiKey(key: string): string[] {
  return saveApiKeys(readStoredKeys().filter((k) => k !== key));
}

/** Remove every saved key (explicit user action only). */
export function clearAllApiKeys(): void {
  writeStoredKeys([]);
  keyCooldowns.clear();
  emit(KEYS_CHANGED_EVENT, { keys: [] });
}

export function hasApiKey(): boolean {
  return readStoredKeys().length > 0;
}

/**
 * The currently active key: the first saved key that is not on rate-limit
 * cooldown (falls back to the primary key if all are cooling).
 */
export function getApiKey(): string {
  const keys = readStoredKeys();
  const now = Date.now();
  return keys.find((k) => (keyCooldowns.get(k) ?? 0) <= now) ?? keys[0] ?? "";
}

/** Masked list for UI display, e.g. "AIzaSyCf…x9K2". */
export function maskKeys(keys: string[]): string[] {
  return keys.map((k) =>
    k.length > 14 ? `${k.slice(0, 8)}…${k.slice(-4)}` : "••••",
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Rate-limit rotation
 * ═══════════════════════════════════════════════════════════════════════ */

export interface ApiKeyStatus {
  index: number;
  masked: string;
  rateLimited: boolean;
  secondsLeft: number;
}

/** Live per-key status for UI dots. */
export function getKeyStatuses(): ApiKeyStatus[] {
  const now = Date.now();
  return readStoredKeys().map((key, index) => {
    const until = keyCooldowns.get(key) ?? 0;
    return {
      index,
      masked: maskKeys([key])[0],
      rateLimited: until > now,
      secondsLeft: until > now ? Math.ceil((until - now) / 1000) : 0,
    };
  });
}

/** Full text of an error (including any wrapped cause) for pattern matching. */
function errorText(e: any): string {
  return `${e?.message ?? ""} ${e?.cause?.message ?? ""} ${e?.status ?? ""} ${String(e)}`;
}

function isRateLimitError(e: any): boolean {
  return /429|rate.?limit|quota|RESOURCE_EXHAUSTED|exhausted/i.test(errorText(e));
}

function isInvalidKeyError(e: any): boolean {
  return /API_KEY_INVALID|api key not valid|invalid api key|API key expired|API key/i.test(
    errorText(e),
  );
}

/** Daily (RPD) quota exhausted — it resets at midnight Pacific, not next minute. */
function isDailyQuotaError(e: any): boolean {
  return /per\s?day|perday|requests per day|RPD/i.test(errorText(e));
}

/** Long cooldown when the daily quota is gone — no point retrying soon. */
const DAILY_QUOTA_COOLDOWN_MS = 10 * 60_000;

/** Put a key on cooldown so rotation skips it for a while (default ~65s). */
export function markKeyRateLimited(
  key: string,
  ms: number = KEY_COOLDOWN_MS,
): void {
  keyCooldowns.set(key, Date.now() + ms);
}

function keyIndex(key: string): number {
  return readStoredKeys().indexOf(key);
}

/**
 * Run `run(key)` with automatic key rotation:
 *  - tries each saved key (that isn't cooling down) in priority order,
 *  - on a rate-limit/quota error the key is cooled down and the next one is
 *    used immediately (a `studyos-ai-key-rotated` event is emitted),
 *  - invalid keys are skipped the same way,
 *  - other errors are surfaced as friendly messages right away.
 */
export async function withKeyRotation<T>(
  run: (key: string) => Promise<T>,
): Promise<T> {
  const keys = readStoredKeys();
  if (!keys.length) {
    throw new Error(
      "No Gemini API key set. Add your key in Settings → AI Assistant.",
    );
  }
  const now = Date.now();
  const usable = keys.filter((k) => (keyCooldowns.get(k) ?? 0) <= now);
  if (!usable.length) {
    // Every key is cooling down — report the soonest reset instead of hammering.
    const soonest = Math.min(...keys.map((k) => keyCooldowns.get(k) ?? now));
    const secs = Math.max(1, Math.ceil((soonest - now) / 1000));
    throw new Error(
      `All ${keys.length} API key(s) hit their rate limit. Auto-retry in ~${secs}s — or add another key in Settings → AI Assistant.`,
    );
  }

  let lastError: any = null;
  for (let i = 0; i < usable.length; i++) {
    const key = usable[i];
    try {
      return await run(key);
    } catch (e: any) {
      lastError = e;
      // Never rotate on user aborts / timeouts — just surface them.
      if (e?.name === "AbortError") rethrowAbort(e);
      const rateLimited = isRateLimitError(e);
      const invalid = isInvalidKeyError(e);
      if (rateLimited) {
        // Daily-quota exhaustion gets a much longer cooldown so the app
        // stops hammering a dead key on every request until it resets.
        markKeyRateLimited(
          key,
          isDailyQuotaError(e) ? DAILY_QUOTA_COOLDOWN_MS : KEY_COOLDOWN_MS,
        );
      }
      if ((rateLimited || invalid) && i < usable.length - 1) {
        const nextKey = usable[i + 1];
        emit(KEY_ROTATION_EVENT, {
          from: keyIndex(key),
          fromMasked: maskKeys([key])[0],
          to: keyIndex(nextKey),
          toMasked: maskKeys([nextKey])[0],
          reason: rateLimited ? "rate-limit" : "invalid-key",
        });
        continue; // transparently retry with the next key
      }
      throw new Error(friendlyError(e));
    }
  }
  if (lastError?.name === "AbortError") rethrowAbort(lastError);
  throw new Error(friendlyError(lastError));
}

/* ═══════════════════════════════════════════════════════════════════════
 * Cloud sync (per-account, keys are NEVER deleted automatically)
 * ═══════════════════════════════════════════════════════════════════════ */

/** Push the full key list to the user's profile so it syncs across devices. */
export async function syncApiKeysToCloud(uid: string, keys: string[]) {
  try {
    const normalized = normalizeKeys(keys);
    await updateUserProfile(uid, {
      settings: {
        geminiApiKeys: normalized,
        // Legacy field kept in sync (= primary key) for older app builds.
        geminiApiKey: normalized[0] ?? "",
      } as any,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pull the account's saved keys from the profile and MERGE them with the
 * local list (union, cloud-first). Keys are never dropped — a fresh device
 * gets every key back, and any key only known locally is pushed up so the
 * account always keeps all of them. Safe to call on every login.
 */
export async function syncApiKeysFromCloud(uid: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(uid);
    const settings = (profile?.settings ?? {}) as any;
    const cloudList: string[] = Array.isArray(settings.geminiApiKeys)
      ? settings.geminiApiKeys
      : settings.geminiApiKey
        ? [settings.geminiApiKey]
        : [];
    const cloudKeys = normalizeKeys(cloudList);
    const localKeys = readStoredKeys();
    // Union — cloud keys lead, but nothing is lost from either side.
    const merged = normalizeKeys([...cloudKeys, ...localKeys]);
    if (!merged.length) return false;

    const changedLocal = JSON.stringify(merged) !== JSON.stringify(localKeys);
    if (changedLocal) {
      saveApiKeys(merged);
      keyCooldowns.clear();
    }
    const changedCloud =
      JSON.stringify(cloudKeys) !== JSON.stringify(merged) ||
      (settings.geminiApiKey ?? "") !== (merged[0] ?? "");
    if (changedCloud) await syncApiKeysToCloud(uid, merged);
    return merged.length > 0;
  } catch {
    /* offline / not configured — keep whatever is local */
    return hasApiKey();
  }
}

/* ── Legacy single-key shims (older modules keep working unchanged) ── */

export function saveApiKey(key: string): void {
  saveApiKeys([key, ...readStoredKeys()]);
}

export function clearApiKey(): void {
  clearAllApiKeys();
}

/** Legacy pull — now restores the FULL key list (merge, never deletes). */
export async function syncApiKeyFromCloud(uid: string): Promise<boolean> {
  return syncApiKeysFromCloud(uid);
}

/** Legacy push — union-adds one key to the account's list (never deletes). */
export async function syncApiKeyToCloud(uid: string, key: string) {
  if (!key) return syncApiKeysToCloud(uid, readStoredKeys());
  return syncApiKeysToCloud(uid, [...readStoredKeys(), key]);
}

function client(keyArg?: string) {
  const key = keyArg || getApiKey();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  /** images attached to this user turn (base64, no data-url prefix) */
  images?: ImageAttachment[];
}

export interface ImageAttachment {
  mime: string; // e.g. image/jpeg
  /** base64 data without the data-url prefix */
  data: string;
  name?: string;
}

export interface AskOptions {
  /** study context injected as system instruction */
  systemContext?: string;
  history?: ChatMessage[];
  temperature?: number;
  /** images for this turn — Gemini reads them (OCR/diagrams/handwriting) */
  images?: ImageAttachment[];
  /** optional AbortSignal so the caller can cancel a running request (Stop button) */
  signal?: AbortSignal;
}

/** Build the shared system-instruction (app data + personality). */
function systemInstruction(
  systemContext?: string,
): Content | undefined {
  if (!systemContext) return undefined;
  return {
    role: "system",
    parts: [
      {
        text:
          "You are StudyOS AI, a friendly study coach inside a study-planner app. " +
          "Be concise, motivating and specific. Use markdown (bold, lists) when helpful. " +
          "The user's current app data is provided below — use it to personalize answers.\n\n" +
          "=== USER DATA ===\n" +
          systemContext +
          "\n=== END USER DATA ===",
      },
    ],
  };
}

/** Conversation history in the format Gemini expects. */
function chatHistory(opts: AskOptions) {
  return (opts.history || [])
    .filter((m) => m.text)
    .map((m) => ({
      role: m.role === "model" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.text }],
    }));
}

/** The parts sent for the current user turn (text + any attached images). */
function turnParts(prompt: string, opts: AskOptions): Part[] {
  return [
    { text: prompt },
    ...(opts.images || []).map((img) => ({
      inlineData: { mimeType: img.mime, data: img.data },
    })),
  ];
}

/** Ordered candidate models to try for this key (deduped). */
async function modelCandidates(key?: string): Promise<string[]> {
  return Array.from(new Set([await resolveModel(key), ...FALLBACK_MODELS]));
}

/** Re-throw as an AbortError when Gemini/network cancels (Stop button / timeout). */
function assertNotAborted(e: any, signal?: AbortSignal): void {
  const msg = `${e?.message ?? ""} ${String(e)}`;
  const aborted =
    signal?.aborted ||
    e?.name === "AbortError" ||
    /abort|timed out|request timed out/i.test(msg);
  if (aborted) {
    // Keep the timeout marker in the message so the rotation wrapper can map
    // it to a friendly "took too long" text (a manual Stop stays "aborted").
    const err = new Error(signal?.aborted ? "Request aborted." : "Request timed out.");
    err.name = "AbortError";
    throw err;
  }
}

/** Abort-like errors leave the rotation loop with a friendly message. */
function rethrowAbort(e: any): never {
  if (/timed out/i.test(`${e?.message ?? ""}`)) {
    throw new Error(
      "Gemini took too long to reply. Please try again — or use a shorter question.",
    );
  }
  throw e;
}

/**
 * Send a chat turn to Gemini. Returns the reply text.
 * Throws Error with a friendly message on bad key / network problems.
 */
export async function askGemini(
  prompt: string,
  opts: AskOptions = {},
): Promise<string> {
  // Automatic key rotation: on rate-limit/quota the next saved key is used.
  return withKeyRotation((apiKey) => askGeminiWithKey(prompt, opts, apiKey));
}

async function askGeminiWithKey(
  prompt: string,
  opts: AskOptions,
  apiKey: string,
): Promise<string> {
  const ai = client(apiKey);
  if (!ai)
    throw new Error(
      "No Gemini API key set. Add your key in Settings → AI Assistant.",
    );

  let lastError: any = null;

  for (const modelName of await modelCandidates(apiKey)) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction(opts.systemContext),
        generationConfig: { temperature: opts.temperature ?? 0.7 },
      });

      const chat = model.startChat({ history: chatHistory(opts) });

      // requestOptions.timeout makes the SDK abort a hung request — no more
      // infinite "thinking…" spinner with no reply.
      const result = await withRetry(() =>
        chat.sendMessage(turnParts(prompt, opts), {
          timeout: REQUEST_TIMEOUT_MS,
          signal: opts.signal,
        }),
      );
      const text = result.response.text();
      if (!text) throw new Error("Empty response from Gemini.");
      cachedModel = modelName; // remember what worked
      persistModelCache(modelName);
      return text;
    } catch (e: any) {
      assertNotAborted(e, opts.signal);
      lastError = e;
      const msg = `${e?.message ?? ""}`;
      const modelGone = /404|not found|NOT_FOUND/i.test(msg);
      if (modelGone) {
        // Model unavailable for this key (e.g. a retired model) — forget the
        // cached choice so the next call re-resolves a live model.
        invalidateModelCache();
      } else if (!isTransientServerError(e)) {
        // Re-throw the RAW error so the rotation wrapper can classify it
        // (rate-limit → next key) and map it to a friendly message at the end.
        throw e;
      }
      // 404 (dead model) or 503/500 (model overloaded) → try the next model.
    }
  }
  if (lastError?.name === "AbortError") rethrowAbort(lastError);
  throw new Error(friendlyError(lastError));
}

/**
 * Send a chat turn to Gemini and STREAM the reply back.
 *
 * `onChunk` is called with the full reply-so-far on every new token, so the UI
 * can render the answer live instead of staring at a spinner. Returns the
 * complete reply text when finished.
 */
export async function askGeminiStream(
  prompt: string,
  opts: AskOptions = {},
  onChunk?: (fullText: string) => void,
): Promise<string> {
  // Automatic key rotation: on rate-limit/quota the next saved key is used.
  return withKeyRotation((apiKey) =>
    askGeminiStreamWithKey(prompt, opts, onChunk, apiKey),
  );
}

async function askGeminiStreamWithKey(
  prompt: string,
  opts: AskOptions,
  onChunk: ((fullText: string) => void) | undefined,
  apiKey: string,
): Promise<string> {
  const ai = client(apiKey);
  if (!ai)
    throw new Error(
      "No Gemini API key set. Add your key in Settings → AI Assistant.",
    );

  let lastError: any = null;

  for (const modelName of await modelCandidates(apiKey)) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction(opts.systemContext),
        generationConfig: { temperature: opts.temperature ?? 0.7 },
      });

      const chat = model.startChat({ history: chatHistory(opts) });

      const result = await withRetry(() =>
        chat.sendMessageStream(turnParts(prompt, opts), {
          timeout: REQUEST_TIMEOUT_MS,
          signal: opts.signal,
        }),
      );

      let full = "";
      for await (const chunk of result.stream) {
        const piece = chunk.text();
        if (piece) {
          full += piece;
          onChunk?.(full);
        }
      }
      if (!full.trim()) throw new Error("Empty response from Gemini.");
      cachedModel = modelName; // remember what worked
      persistModelCache(modelName);
      return full;
    } catch (e: any) {
      assertNotAborted(e, opts.signal);
      lastError = e;
      const msg = `${e?.message ?? ""}`;
      const modelGone = /404|not found|NOT_FOUND/i.test(msg);
      if (modelGone) {
        // Model unavailable for this key (e.g. a retired model) — forget the
        // cached choice so the next call re-resolves a live model.
        invalidateModelCache();
      } else if (!isTransientServerError(e)) {
        // Re-throw the RAW error so the rotation wrapper can classify it
        // (rate-limit → next key) and map it to a friendly message at the end.
        throw e;
      }
      // 404 (dead model) or 503/500 (model overloaded) → try the next model.
    }
  }
  if (lastError?.name === "AbortError") rethrowAbort(lastError);
  throw new Error(friendlyError(lastError));
}

/** Map raw Gemini/network errors to friendly messages. */
function friendlyError(e: any): string {
  const msg = `${e?.message ?? ""} ${String(e)}`;
  if (
    e?.name === "AbortError" ||
    /abort|timed out|request timed out/i.test(msg)
  )
    return "Gemini took too long to reply. Please try again — or use a shorter question.";
  if (/not valid|API_KEY_INVALID|api key/i.test(msg))
    return "Your Gemini API key looks invalid. Check it in Settings → AI Assistant.";
  if (/429|rate limit/i.test(msg)) {
    if (isDailyQuotaError(e))
      return "Daily free quota for this key is used up (resets at midnight Pacific). Add another key in Settings → AI Assistant or try again tomorrow.";
    return "Gemini rate limit hit — wait a moment and try again.";
  }
  if (/Failed to fetch|network|offline/i.test(msg))
    return "Cannot reach Gemini — check your internet connection.";
  if (/quota/i.test(msg)) return "Gemini quota exceeded for your key.";
  if (/503|overloaded|UNAVAILABLE/i.test(msg))
    return "Gemini is busy right now — every model was overloaded after several retries. Please try again in a minute.";
  if (/404|not found for api version|is not found/i.test(msg))
    return "No usable Gemini model for this key (404). Your key may be restricted — create a fresh key in Google AI Studio and add it in Settings → AI Assistant.";
  return String(e?.message || e).slice(0, 200);
}

/** Verify a key works before/after saving. */
export async function testApiKey(key?: string): Promise<boolean> {
  // model listing doubles as a cheap key check (fails fast on bad keys)
  const keyToUse = (key ?? getApiKey()).trim();
  const listRes = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToUse)}&pageSize=1`,
    LIST_TIMEOUT_MS,
  );
  if (!listRes.ok) {
    const body = await listRes.text();
    throw new Error(
      friendlyError(new Error(`${listRes.status} ${body.slice(0, 150)}`)),
    );
  }
  try {
    const ai = new GoogleGenerativeAI(keyToUse);
    // try each candidate model until one responds
    const candidates = [await resolveModel(keyToUse), ...FALLBACK_MODELS];
    let lastError: any = null;
    for (const modelName of Array.from(new Set(candidates))) {
      try {
        const res = await withRetry(() =>
          ai
            .getGenerativeModel({ model: modelName })
            .generateContent("Reply with just: OK", {
              timeout: REQUEST_TIMEOUT_MS,
            }),
        );
        if ((res.response.text() || "").trim()) {
          cachedModel = modelName;
          persistModelCache(modelName);
          return true;
        }
      } catch (e: any) {
        lastError = e;
        const modelGone = /404|not found|NOT_FOUND/i.test(`${e?.message ?? ""}`);
        if (modelGone) invalidateModelCache();
        // 404 (dead model) or transient 503/500 → try the next candidate.
        if (!modelGone && !isTransientServerError(e)) break;
      }
    }
    throw lastError || new Error("No usable Gemini model found for this key.");
  } catch (e: any) {
    throw new Error(friendlyError(e));
  }
}
