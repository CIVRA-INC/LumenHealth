import type { Permission } from '@lumen/contracts';
import { EmptyState, Skeleton } from '@lumen/ui';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Page } from '../components/page';
import { useSession } from '../lib/session';

function SplashSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Skeleton className="h-8 w-40" />
    </div>
  );
}

/** Everything inside requires a signed-in user. */
export function RequireAuth() {
  const { data, isLoading } = useSession();
  const location = useLocation();
  if (isLoading) return <SplashSkeleton />;
  if (!data)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (data.user.mustChangePassword && location.pathname !== '/account') {
    return <Navigate to="/account" replace />;
  }
  return <Outlet />;
}

/** Hides a route from users who lack the permission (the API enforces it regardless). */
export function RequirePermission({ permission }: { permission: Permission }) {
  const { data } = useSession();
  if (!data?.permissions.includes(permission)) {
    return (
      <Page width="document">
        <EmptyState
          title="You don’t have access to this page"
          description="Your role does not include this area. If you think this is a mistake, ask an administrator."
        />
      </Page>
    );
  }
  return <Outlet />;
}
