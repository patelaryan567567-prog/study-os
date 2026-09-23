import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ROUTE_PATHS } from "./paths";
import { SkeletonAvatar, SkeletonCard, SkeletonText } from "@/components";

function AuthLoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="space-y-6 rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_80px_rgba(7,11,29,0.22)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SkeletonAvatar size="lg" />
          <div className="space-y-3 flex-1">
            <SkeletonText width="w-48" />
            <SkeletonText width="w-72" />
          </div>
        </div>
        <SkeletonCard className="h-28" />
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { firebaseUser, isLoading, demoMode } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;
  // In demo mode (Firebase not configured) every module stays reachable, so the
  // route guard lets the user through without a real authentication session.
  if (!firebaseUser && !demoMode)
    return (
      <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />
    );

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { firebaseUser, isLoading, demoMode } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (firebaseUser || demoMode) return <Navigate to={ROUTE_PATHS.dashboard} replace />;

  return <Outlet />;
}

/**
 * Handles the brief stop at <origin>/__/auth/handler?... that Firebase's
 * redirect sign-in (used by the desktop app) makes when the user comes back
 * from Google. That path has no app route, so this waits for the session to
 * finish restoring and then continues to the dashboard, dropping the Firebase
 * result query params by replacing the URL.
 */
export function AuthRedirectHandler() {
  const { isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate(ROUTE_PATHS.dashboard, { replace: true });
  }, [isLoading, navigate]);

  return <AuthLoadingScreen />;
}
