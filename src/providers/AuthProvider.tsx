import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from '@/services/auth';
import { createUserProfileIfNotExists, type UserProfile } from '@/services/firestoreService';
import { useAppStore } from '@/store';
import { getLevelFromXP } from '@/utils';

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function timestampToIso(profile: UserProfile): string {
  return profile.createdAt.toDate().toISOString();
}

function toStoreUser(firebaseUser: FirebaseUser, profile: UserProfile) {
  const xp = profile.xp ?? 0;

  return {
    id: firebaseUser.uid,
    name: profile.displayName ?? firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Student',
    email: profile.email ?? firebaseUser.email ?? '',
    avatar: firebaseUser.photoURL ?? undefined,
    xp,
    level: getLevelFromXP(xp),
    coins: profile.coins ?? 0,
    streak: 0,
    createdAt: timestampToIso(profile),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(async (nextUser) => {
      if (!active) return;

      setFirebaseUser(nextUser);

      if (!nextUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await createUserProfileIfNotExists({
          uid: nextUser.uid,
          displayName: nextUser.displayName ?? undefined,
          email: nextUser.email ?? undefined,
        });

        if (active) {
          setUser(toStoreUser(nextUser, profile));
          setError(null);
        }
      } catch (cause) {
        if (active) {
          setUser(null);
          setError(cause instanceof Error ? cause.message : 'Unable to load your StudyOS profile.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [setUser]);

  const value = useMemo(
    () => ({ firebaseUser, isLoading, error }),
    [firebaseUser, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
