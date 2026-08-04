import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToStudySessions,
  subscribeToUserProfile,
  type StudySession,
  type UserProfile,
} from '@/services/firestoreService';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/store';
import { getLevelFromXP } from '@/utils';
import { calculateDashboardMetrics, EMPTY_DASHBOARD_METRICS } from './dashboardMetrics';

export function useDashboardMetrics() {
  const { firebaseUser } = useAuth();
  const setUser = useAppStore((state) => state.setUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const handleError = (cause: Error) => {
      setError(cause.message || 'Unable to synchronize dashboard data.');
      setIsLoading(false);
    };

    const unsubscribeProfile = subscribeToUserProfile(
      firebaseUser.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setIsLoading(false);

        const currentUser = useAppStore.getState().user;
        if (nextProfile && currentUser?.id === firebaseUser.uid) {
          setUser({
            ...currentUser,
            xp: nextProfile.xp,
            coins: nextProfile.coins,
            level: getLevelFromXP(nextProfile.xp),
          });
        }
      },
      handleError,
    );

    const unsubscribeSessions = subscribeToStudySessions(
      firebaseUser.uid,
      (nextSessions) => {
        setSessions(nextSessions);
        setIsLoading(false);
      },
      handleError,
    );

    return () => {
      unsubscribeProfile();
      unsubscribeSessions();
    };
  }, [firebaseUser, setUser]);

  const metrics = useMemo(
    () => calculateDashboardMetrics(sessions, profile),
    [sessions, profile],
  );

  return {
    metrics: firebaseUser ? metrics : EMPTY_DASHBOARD_METRICS,
    isLoading,
    error,
  };
}
