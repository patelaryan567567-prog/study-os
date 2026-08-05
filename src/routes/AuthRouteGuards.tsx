import { Navigate, Outlet, useLocation } from "react-router-dom";
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
  const { firebaseUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;
  if (!firebaseUser)
    return (
      <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />
    );

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { firebaseUser, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (firebaseUser) return <Navigate to={ROUTE_PATHS.dashboard} replace />;

  return <Outlet />;
}
