import { Navigate } from 'react-router-dom';
import { useAuthStore, type RoleId } from '../stores/useAuthStore';

/** Maps each role to its default landing page */
const ROLE_HOME: Record<RoleId, string> = {
  1: '/menu',       // Customer — browse menu (future)
  2: '/kds',        // Barista
  3: '/kds',        // Chef
  4: '/orders',     // Waiter
  5: '/cashier',    // Cashier
  6: '/inventory',  // Inventory Manager
  7: '/admin',      // Admin / Manager
  8: '/admin',      // Super Admin
};

/**
 * Redirects authenticated users to their role-appropriate home page.
 * Unauthenticated users go to /login.
 */
export default function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={ROLE_HOME[user.roleId]} replace />;
}
