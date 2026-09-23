import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  completeGoogleRedirectSignIn,
  onAuthStateChanged,
} from "@/services/auth";
import { getFirebaseInstances } from "@/services/initFirebase";
import {
  createUserProfileIfNotExists,
  updateUserProfile,
  type UserProfile,
} from "@/services/firestoreService";
import { activateAccountStorage, syncOnLogin } from "@/services/appDataSync";
import { isElectron } from "@/native/externalBrowser";
import { useAppStore } from "@/store";
import { getLevelFromXP } from "@/utils";
import { syncApiKeysFromCloud } from "@/services/gemini/geminiService";
import {
  ensureFirebaseConfigReady,
  hasFirebaseConfig,
} from "@/services/firebaseConfig";

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  /** True when Firebase could not be initialized (no .env.local config). The
   * app then runs in a fully local demo mode so every module stays usable. */
  demoMode: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function timestampToIso(profile: UserProfile): string {
  return profile.createdAt.toDate().toISOString();
}

function toStoreUser(firebaseUser: FirebaseUser, profile: UserProfile) {
  const xp = profile.xp ?? 0;

  return {
    id: firebaseUser.uid,
    name:
      profile.displayName ??
      firebaseUser.displayName ??
      firebaseUser.email?.split("@")[0] ??
      "Student",
    email: profile.email ?? firebaseUser.email ?? "",
    avatar: firebaseUser.photoURL ?? undefined,
    xp,
    level: getLevelFromXP(xp),
    coins: profile.coins ?? 0,
    streak: 0,
    createdAt: timestampToIso(profile),
  };
}

/** Local-only demo identity used when Firebase is not configured, so the
 * navigation guards, topbar and gamification widgets have something to render
 * instead of locking the user out of the application. */
const DEMO_USER = {
  id: "demo-user",
  name: "Demo Student",
  email: "demo@studyos.app",
  xp: 2450,
  level: getLevelFromXP(2450),
  coins: 1280,
  streak: 12,
  createdAt: new Date().toISOString(),
};

/** Background cloud sync while signed in: pushes local changes (and pulls
 *  remote ones) every few minutes, plus right before the tab is hidden. */
let syncTimer: ReturnType<typeof setInterval> | null = null;
function startPeriodicSync(): void {
  if (syncTimer) return; // already running for this session
  const run = () => void syncOnLogin().catch(() => {});
  syncTimer = setInterval(run, 5 * 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") run();
  });
}

/** Read the module-level gamification progress (studyos_gamification_v1) so the * offline fallback profile can seed XP/coins from locally-earned progress when
 * Firestore is unreachable. */
function readLocalGamification(): { xp?: number; coins?: number } {
  try {
    const raw = localStorage.getItem("studyos_gamification_v1");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      xp?: unknown;
      totalXp?: unknown;
      coins?: unknown;
    };
    const xp =
      typeof parsed.totalXp === "number"
        ? parsed.totalXp
        : typeof parsed.xp === "number"
          ? parsed.xp
          : undefined;
    const coins = typeof parsed.coins === "number" ? parsed.coins : undefined;
    return { xp, coins };
  } catch {
    return {};
  }
}

/** Mirror the shared store ledger into the gamification module's saved store,
 *  so a later cloud sync or module read never resurrects a stale XP/coins
 *  value. Same object shape as the store's internal mirror. */
function writeLocalGamificationLedger(xp: number, coins: number) {
  try {
    const raw = localStorage.getItem("studyos_gamification_v1");
    const ledger = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      "studyos_gamification_v1",
      JSON.stringify({
        ...ledger,
        xp,
        totalXp: Math.max(xp, ledger?.totalXp ?? 0),
        coins,
        level: getLevelFromXP(xp),
      }),
    );
  } catch {
    /* best-effort mirror only */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let active = true;

    const handleAuthStateChange = async (nextUser: FirebaseUser | null) => {
      if (!active) return;

      setFirebaseUser(nextUser);
      setDemoMode(false);

      if (!nextUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // The session is known — stop blocking the app UI right away. The profile
      // and cloud sync below continue in the background and update the store as
      // they complete, so a signed-in user sees the app immediately instead of
      // a spinner that waited for every network read.
      setIsLoading(false);

          try {
            // localStorage is shared by every account on this computer; switch
            // to this user's cache before any read or cloud sync happens.
            activateAccountStorage(nextUser.uid);

            // Restore this account's saved Gemini API keys right away — the
            // keys live on the Firestore profile (never deleted automatically),
            // so a re-login or a new device applies ALL saved keys with no
            // re-entry. Local-only keys are union-merged back to the cloud.
            void syncApiKeysFromCloud(nextUser.uid).catch(() => {});

            const profile = await createUserProfileIfNotExists({
              uid: nextUser.uid,
              displayName: nextUser.displayName ?? undefined,
              email: nextUser.email ?? undefined,
            });

            // Restore/push EVERY module's data for this account (tasks,
            // lectures, calendar, revision, gamification, planner…). When the
            // pull changed local keys (fresh device), reload once so modules
            // already mounted with empty state pick up the restored data.
            try {
              const restored = await syncOnLogin();
              // Re-hydrate the in-memory zustand store (tasks, sessions,
              // subjects, …) from the freshly-restored localStorage copy. The
              // desktop shell never hard-reloads, so without this the already
              // mounted UI would keep showing stale in-memory data after a
              // cloud restore; in a browser tab it is harmless before reload.
              try {
                await useAppStore.persist.rehydrate();
              } catch {
                /* store re-hydration is best-effort */
              }
              if (restored && sessionStorage.getItem("studyos_sync_reload") !== nextUser.uid) {
                sessionStorage.setItem("studyos_sync_reload", nextUser.uid);
                // A full page reload of this heavy SPA can crash the Electron
                // renderer (all-black window right after sign-in). Inside the
                // desktop shell the store was re-hydrated above and the modules
                // read from the freshly-restored account cache anyway, so skip
                // the hard reload there and only do it in a normal browser tab
                // where it is harmless.
                if (!isElectron()) {
                  window.location.reload();
                  return;
                }
              }
            } catch (syncCause) {
              console.error("Account data sync failed:", syncCause);
            }

            // Some modules write straight to localStorage, so their changes
            // would only reach the cloud on the next login. Re-sync
            // periodically while signed in to keep other devices current.
            startPeriodicSync();

            if (active) {
              // The Firestore profile's xp/coins are only written at account
              // creation and never updated as the user earns more — if we used
              // profile.xp verbatim here, every re-login would reset the player
              // to the first-day total. Use the highest of (profile, previous
              // same-account session, local gamification ledger) so progress is
              // never lost, then update the profile so other devices see the
              // real totals too.
              const previous = useAppStore.getState().user;
              const sameAccount = !!previous && previous.id === nextUser.uid;
              const localProgress = readLocalGamification();
              const baseXp = Math.max(
                profile.xp ?? 0,
                sameAccount ? (previous?.xp ?? 0) : 0,
                localProgress.xp ?? 0,
              );
              const baseCoins = Math.max(
                profile.coins ?? 0,
                sameAccount ? (previous?.coins ?? 0) : 0,
                localProgress.coins ?? 0,
              );
              if (
                baseXp > (profile.xp ?? 0) ||
                baseCoins > (profile.coins ?? 0)
              ) {
                void updateUserProfile(nextUser.uid, {
                  xp: baseXp,
                  coins: baseCoins,
                }).catch(() => {});
              }
              writeLocalGamificationLedger(baseXp, baseCoins);
              setUser({
                ...toStoreUser(nextUser, profile),
                xp: baseXp,
                level: getLevelFromXP(baseXp),
                coins: baseCoins,
              });
              setError(null);
            }
          } catch (cause) {
        if (active) {
          console.error("Failed to load/create Firestore profile:", cause);
          // Fall back to a user derived from the Firebase identity alone, so
          // the sidebar and profile page still render the real account name
          // and email even when Firestore is unreachable (e.g. database not
          // created yet or security rules not deployed). XP/coins earned
          // locally are preserved so progress is not silently reset to zero
          // on every app restart. The gamification module keeps its own local
          // progress, so the highest of the two values wins — this also
          // recovers XP for users whose profile was already zeroed out by the
          // old reset behaviour.
          const previous = useAppStore.getState().user;
          const sameAccount = !!previous && previous.id === nextUser.uid;
          const localProgress = readLocalGamification();
          const baseXp = Math.max(
            sameAccount ? (previous?.xp ?? 0) : 0,
            localProgress.xp ?? 0,
          );
          const baseCoins = Math.max(
            sameAccount ? (previous?.coins ?? 0) : 0,
            localProgress.coins ?? 0,
          );
          setUser({
            id: nextUser.uid,
            name:
              nextUser.displayName ??
              nextUser.email?.split("@")[0] ??
              "Student",
            email: nextUser.email ?? "",
            avatar: nextUser.photoURL ?? undefined,
            xp: baseXp,
            level: getLevelFromXP(baseXp),
            coins: baseCoins,
            streak: sameAccount ? (previous?.streak ?? 0) : 0,
            createdAt:
              sameAccount && previous
                ? previous.createdAt
                : new Date().toISOString(),
          });
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load your StudyOS profile.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;

    const initializeSession = async () => {
      try {
        await ensureFirebaseConfigReady();
        if (!hasFirebaseConfig()) {
          throw new Error("Firebase not configured");
        }
        // Subscribe first so the UI can render as soon as the Firebase session
        // is known. Waiting for the redirect check below used to hold the
        // loading screen open for the whole network round-trip.
        unsubscribe = onAuthStateChanged(handleAuthStateChange);
        // Complete any pending Google-redirect sign-in in the background (the
        // popup sign-in used by the desktop app never needs it — it only guards
        // against the rare popup-blocked fallback). Never block startup on it.
        void completeGoogleRedirectSignIn()
          .then((redirectError) => {
            if (
              active &&
              redirectError &&
              !getFirebaseInstances().auth.currentUser
            ) {
              setError(redirectError);
            }
          })
          .catch(() => {});
      } catch {
        // Firebase configuration is optional for a static UI preview. When the
        // config is missing (no .env.local), fall back to a local demo session so
        // the navigation guards let the user in and every module stays usable.
        if (!active) return;
        setDemoMode(true);
        setError(null);
        setUser(DEMO_USER);
        setIsLoading(false);
      }
    };

    void initializeSession();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [setUser]);

  const value = useMemo(
    () => ({ firebaseUser, isLoading, error, demoMode }),
    [firebaseUser, isLoading, error, demoMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
