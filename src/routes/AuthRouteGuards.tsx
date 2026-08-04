import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { ROUTE_PATHS } from './paths';

function AuthLoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        Restoring your StudyOS session…
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { firebaseUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;
  if (!firebaseUser) return <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { firebaseUser, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (firebaseUser) return <Navigate to={ROUTE_PATHS.dashboard} replace />;

  return <Outlet />;
}
