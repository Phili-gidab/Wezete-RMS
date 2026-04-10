import type { RoleId } from '../stores/useAuthStore';

/** Human-readable labels for each RBAC role level */
export const ROLE_LABELS: Record<RoleId, string> = {
  1: 'Customer',
  2: 'Barista',
  3: 'Chef',
  4: 'Waiter',
  5: 'Cashier',
  6: 'Inventory Manager',
  7: 'Admin',
  8: 'Super Admin',
};

/** WebSocket room each role should join on connection */
export const ROLE_SOCKET_ROOMS: Record<RoleId, string> = {
  1: 'customer',
  2: 'bar_station',
  3: 'kitchen_station',
  4: 'waiter',
  5: 'cashier',
  6: 'inventory',
  7: 'admin',
  8: 'super_admin',
};
