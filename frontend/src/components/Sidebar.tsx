import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Receipt,
  Settings,
  LogOut,
  Package,
  ChefHat,
  CreditCard,
  Users,
  ShieldCheck,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore, type RoleId } from '../stores/useAuthStore';
import { ROLE_LABELS } from '../constants/roles';

// ─── Navigation item definition ────────────────────────────────────────────
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Roles that can see this link. Empty = visible to all authenticated users */
  roles: RoleId[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: [7, 8],
  },
  {
    to: '/menu',
    label: 'Menu',
    icon: UtensilsCrossed,
    roles: [7, 8],
  },
  {
    to: '/staff',
    label: 'Staff',
    icon: Users,
    roles: [7, 8],
  },
  {
    to: '/approvals',
    label: 'Approvals',
    icon: ShieldCheck,
    roles: [7, 8],
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: ClipboardList,
    roles: [4, 7, 8],
  },
  {
    to: '/kds',
    label: 'Kitchen Display',
    icon: ChefHat,
    roles: [2, 3],
  },
  {
    to: '/cashier',
    label: 'Cashier',
    icon: CreditCard,
    roles: [5, 7, 8],
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: Package,
    roles: [6, 7, 8],
  },
  {
    to: '/accounting',
    label: 'Accounting',
    icon: Receipt,
    roles: [7, 8],
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: [7, 8],
  },
  {
    to: '/customer/menu',
    label: 'Order Food',
    icon: ShoppingBag,
    roles: [1],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleId = user?.roleId;
  const visibleItems = NAV_ITEMS.filter(
    (item) => roleId && item.roles.includes(roleId),
  );

  const displayName = user?.name ?? 'User';
  const roleLabel = roleId ? ROLE_LABELS[roleId] : '';

  return (
    <aside className="flex w-56 h-full flex-col bg-white border-r border-slate-200">
      {/* ---- Brand ---- */}
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0A3D39] text-white text-sm font-bold">
            W
          </span>
          <span className="text-lg font-semibold text-[#0A3D39]">Wezete</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-slate-100">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#0A3D39]/10 text-[#0A3D39]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A3D39]'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ---- User footer ---- */}
      <div className="border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0A3D39&color=fff&size=36&rounded=true`}
            alt="avatar"
            className="h-9 w-9 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-forest">
              {displayName}
            </p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
