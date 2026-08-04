import { useState, type FormEvent } from "react";
import {
  GraduationCap,
  KeyRound,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGooglePopup,
  signUpWithEmail,
} from "@/services/auth";

type AuthMode = "sign-in" | "sign-up";

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error))
    return "Something went wrong. Please try again.";

  const messages: Record<string, string> = {
    "auth/invalid-credential": "Your email or password is incorrect.",
    "auth/email-already-in-use":
      "An account already exists for this email address.",
    "auth/weak-password": "Choose a password with at least six characters.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  };

  return (
    messages[error.message] ??
    messages[(error as { code?: string }).code ?? ""] ??
    error.message
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await signInWithGooglePopup();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    setError(null);
    setMessage(null);

    try {
      await requestPasswordReset(email);
      setMessage("Password reset instructions have been sent to your email.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center overflow-y-auto bg-[var(--color-bg-primary)] px-5 py-10">
      <div className="glass w-full max-w-md rounded-3xl p-7 shadow-2xl shadow-black/30 sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[#38bdf8] text-white">
            <GraduationCap size={23} />
          </div>
          <p className="text-sm font-semibold text-gradient">StudyOS</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {isSignUp ? "Create your study space" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {isSignUp
              ? "Start building a calmer, more focused study routine."
              : "Sign in to continue your learning journey."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleEmailAuth}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<Mail size={16} />}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <KeyRound size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                className="w-full glass rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none transition-all duration-150 bg-transparent pl-9"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-text-muted)] hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <button
              type="button"
              onClick={handlePasswordReset}
              className="w-full text-right text-xs font-medium text-[var(--color-accent-hover)] hover:text-white"
            >
              Forgot password?
            </button>
          )}

          {error && (
            <p className="rounded-xl bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]">
              {message}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={
              loading ||
              !email ||
              (isSignUp ? password.length < 6 : password.length === 0)
            }
            className="w-full justify-center"
            aria-label={isSignUp ? "Create account" : "Sign in"}
          >
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="h-px flex-1 bg-white/10" />
          or continue with
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <Button
          variant="secondary"
          onClick={handleGoogleLogin}
          loading={loading}
          className="w-full justify-center"
          aria-label="Sign in with Google"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} />
            <span>Continue with Google</span>
          </div>
        </Button>

        <p className="mt-7 text-center text-sm text-[var(--color-text-secondary)]">
          {isSignUp ? "Already have an account?" : "New to StudyOS?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? "sign-in" : "sign-up");
              setError(null);
              setMessage(null);
            }}
            className="font-semibold text-[var(--color-accent-hover)] hover:text-white"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </main>
  );
}
