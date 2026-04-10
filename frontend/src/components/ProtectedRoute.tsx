import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type RoleId } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  allowedRoles: RoleId[];
}

/**
 * Route guard that checks authentication and RBAC role membership.
 *
 * - No token / user → redirect to /login
 * - Role not in allowedRoles → redirect to /unauthorized
 * - Otherwise → render child routes via <Outlet />
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.roleId)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
