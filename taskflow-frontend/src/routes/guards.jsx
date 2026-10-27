import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/common/ui';
import { useAuth } from '../hooks/useAuth';
import ForbiddenPage from '../pages/ForbiddenPage';

/** Requires an authenticated user, and optionally one of the given permissions. */
export function ProtectedRoute({ anyOf }) {
  const { status, hasAnyPermission } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner label="Restoring session…" />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (anyOf && !hasAnyPermission(...anyOf)) return <ForbiddenPage />;
  return <Outlet />;
}

/** Login/register pages: redirect away once signed in. */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Restoring session…" />;
  if (status === 'authenticated') return <Navigate to={location.state?.from ?? '/'} replace />;
  return <Outlet />;
}
