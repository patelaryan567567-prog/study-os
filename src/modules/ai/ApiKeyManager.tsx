/**
 * ApiKeyManager — the 3-slot Gemini API key manager (API Key 1 / 2 / 3).
 *
 * • One key is enough; up to 3 can be added for automatic rate-limit fallback.
 * • Every key is tested before being saved, then synced to the user's account
 *   so it auto-applies on every login / device — keys are never deleted
 *   automatically (explicit Remove is the only way to drop one).
 * • Shows live per-key status (active / rate-limited with retry countdown).
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  KEYS_CHANGED_EVENT,
  MAX_API_KEYS,
  getApiKeys,
  getKeyStatuses,
  maskKeys,
  removeApiKey,
} from "@/services/gemini/geminiService";
import { useAppStore } from "@/store";
import { useAIChatStore } from "@/store/aiChatStore";

interface Props {
  /** "page" = AI onboarding card, "settings" = Settings section. */
  variant?: "page" | "settings";
}

export function ApiKeyManager({ variant = "page" }: Props) {
  const [keys, setKeys] = useState<string[]>(getApiKeys());
  const [statuses, setStatuses] = useState(getKeyStatuses());
  const [inputs, setInputs] = useState<string[]>(
    Array.from({ length: MAX_API_KEYS }, () => ""),
  );
  const [errors, setErrors] = useState<Record<number, string | null>>({});
  const [testing, setTesting] = useState<number | null>(null);
  const keyBusy = useAIChatStore((s) => s.keyBusy);
  const saveAndTestKey = useAIChatStore((s) => s.saveAndTestKey);
  const { user } = useAppStore();

  // Keep the UI in sync with key changes (any page) + cooldown countdowns.
  useEffect(() => {
    const refresh = () => {
      setKeys(getApiKeys());
      setStatuses(getKeyStatuses());
    };
    window.addEventListener(KEYS_CHANGED_EVENT, refresh);
    const timer = setInterval(() => setStatuses(getKeyStatuses()), 5000);
    return () => {
      window.removeEventListener(KEYS_CHANGED_EVENT, refresh);
      clearInterval(timer);
    };
  }, []);

  const save = async (slot: number) => {
    const value = inputs[slot]?.trim();
    if (!value || testing !== null) return;
    setTesting(slot);
    setErrors((e) => ({ ...e, [slot]: null }));
    try {
      await saveAndTestKey(value);
      setInputs((v) => v.map((x, i) => (i === slot ? "" : x)));
      setKeys(getApiKeys());
      setStatuses(getKeyStatuses());
    } catch (e: any) {
      setErrors((er) => ({
        ...er,
        [slot]: e?.message || "Key test failed — check the key.",
      }));
    } finally {
      setTesting(null);
    }
  };

  /** Explicit user action — the ONLY way a key is ever removed. */
  const remove = async (key: string) => {
    removeApiKey(key);
    setKeys(getApiKeys());
    setStatuses(getKeyStatuses());
    try {
      if (user?.id) {
        const { syncApiKeysToCloud } = await import(
          "@/services/gemini/geminiService"
        );
        void syncApiKeysToCloud(user.id, getApiKeys());
      }
    } catch {
      /* offline — removal still applied locally */
    }
  };

  const filled = keys.length;

  return (
    <div className="space-y-3">
      {/* why multiple keys */}
      <div className="flex items-start gap-2 rounded-xl border border-purple-400/20 bg-purple-500/10 p-3">
        <Zap size={15} className="mt-0.5 shrink-0 text-purple-300" />
        <p className="text-xs leading-relaxed text-purple-100/90">
          <span className="font-semibold">1 API key is enough</span> — AI works
          with just one. Add up to {MAX_API_KEYS} keys and when one hits its
          rate limit, StudyOS <span className="font-semibold">automatically switches</span> to
          the next one (and back once it resets).
        </p>
      </div>

      {/* the 3 slots */}
      {Array.from({ length: MAX_API_KEYS }).map((_, i) => {
        const key = keys[i];
        const status = statuses[i];
        return (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                <KeyRound size={12} /> API Key {i + 1}
                {i === 0 && filled > 0 && (
                  <span className="rounded bg-purple-500/25 px-1.5 py-0.5 text-[10px] font-medium text-purple-100">
                    primary
                  </span>
                )}
              </span>
              {key && status && (
                <span
                  className={`flex items-center gap-1 text-[10px] font-medium ${
                    status.rateLimited ? "text-amber-300" : "text-emerald-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status.rateLimited
                        ? "animate-pulse bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  {status.rateLimited
                    ? `Rate limited — auto-retry in ~${status.secondsLeft}s`
                    : "Active"}
                </span>
              )}
            </div>

            {key ? (
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-black/20 px-2.5 py-1.5 font-mono text-xs text-gray-300">
                  {maskKeys([key])[0]}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(key)}
                  title="Remove this key (only you can delete keys)"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  type="password"
                  placeholder={
                    filled === 0
                      ? "Paste your Gemini API key (AIza...)"
                      : `Optional — paste API Key ${i + 1} (AIza...)`
                  }
                  value={inputs[i]}
                  onChange={(e) =>
                    setInputs((v) =>
                      v.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  onKeyDown={(e) => e.key === "Enter" && save(i)}
                  className="h-[42px] min-w-[200px] flex-1"
                  disabled={testing !== null}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => save(i)}
                  disabled={testing !== null || !inputs[i]?.trim()}
                  loading={testing === i || (keyBusy && testing === i)}
                >
                  {filled === 0 ? "Save & Activate" : "Save & Test"}
                </Button>
              </div>
            )}
            {errors[i] && (
              <p className="mt-1.5 text-xs text-rose-300">{errors[i]}</p>
            )}
          </div>
        );
      })}

      {/* status footer */}
      {filled > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-emerald-100/90">
            <span className="font-semibold">
              {filled} key{filled === 1 ? "" : "s"} saved — AI is active.
            </span>{" "}
            <ShieldCheck size={11} className="inline" /> Keys are synced to your
            account and auto-applied on every login &amp; device — you never
            have to enter them again.
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          Get a free key at{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-purple-300 underline"
          >
            Google AI Studio <ExternalLink size={10} />
          </a>{" "}
          — paste it in slot 1 above. It is saved once and auto-loads on every
          login.
          {variant === "settings" && " (Used by StudyOS AI across the app.)"}
        </p>
      )}
    </div>
  );
}

export default ApiKeyManager;

