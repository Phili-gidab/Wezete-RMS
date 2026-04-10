import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useUsers, useCreateUser, useUpdateUser } from '../../api/hooks';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role =
  | 'CUSTOMER'
  | 'BARISTA'
  | 'CHEF'
  | 'WAITER'
  | 'CASHIER'
  | 'INVENTORY_MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BRAND = '#0A3D39';

const ROLE_META: Record<
  string,
  { label: string; color: string }
> = {
  ADMIN:              { label: 'Admin',              color: 'bg-indigo-100 text-indigo-800' },
  SUPER_ADMIN:        { label: 'Super Admin',        color: 'bg-indigo-100 text-indigo-800' },
  WAITER:             { label: 'Waiter',             color: 'bg-blue-100 text-blue-800' },
  CHEF:               { label: 'Chef',               color: 'bg-orange-100 text-orange-800' },
  BARISTA:            { label: 'Barista',            color: 'bg-purple-100 text-purple-800' },
  CASHIER:            { label: 'Cashier',            color: 'bg-green-100 text-green-800' },
  INVENTORY_MANAGER:  { label: 'Inventory Mgr',      color: 'bg-amber-100 text-amber-800' },
  CUSTOMER:           { label: 'Customer',           color: 'bg-slate-100 text-slate-700' },
};

const FILTER_TABS: { label: string; role: Role | 'ALL' }[] = [
  { label: 'All',                role: 'ALL' },
  { label: 'Admin',              role: 'ADMIN' },
  { label: 'Waiter',             role: 'WAITER' },
  { label: 'Chef',               role: 'CHEF' },
  { label: 'Barista',            role: 'BARISTA' },
  { label: 'Cashier',            role: 'CASHIER' },
  { label: 'Inventory Manager',  role: 'INVENTORY_MANAGER' },
];

const STAFF_ROLES: Role[] = [
  'ADMIN',
  'WAITER',
  'CHEF',
  'BARISTA',
  'CASHIER',
  'INVENTORY_MANAGER',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, color: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-400'}`}
      />
      <span className={`text-xs font-medium ${active ? 'text-green-700' : 'text-red-500'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

// ─── Staff Modal ──────────────────────────────────────────────────────────────

interface StaffModalProps {
  user?: User | null;
  onClose: () => void;
}

function StaffModal({ user, onClose }: StaffModalProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [firstName, setFirstName]   = useState(user?.firstName ?? '');
  const [lastName,  setLastName]    = useState(user?.lastName  ?? '');
  const [email,     setEmail]       = useState(user?.email     ?? '');
  const [phone,     setPhone]       = useState(user?.phone     ?? '');
  const [password,  setPassword]    = useState('');
  const [role,      setRole]        = useState<Role>(user?.role ?? 'WAITER');

  const isPending = createUser.isPending || updateUser.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit) {
      const payload: Record<string, unknown> = { id: user!.id };
      if (firstName !== user!.firstName) payload.firstName = firstName;
      if (lastName  !== user!.lastName)  payload.lastName  = lastName;
      if (email     !== user!.email)     payload.email     = email;
      if (phone     !== (user!.phone ?? '')) payload.phone = phone;
      if (role      !== user!.role)      payload.role      = role;
      if (password)                      payload.password  = password;

      updateUser.mutate(payload as any, {
        onSuccess: () => {
          toast.success('Staff member updated');
          onClose();
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Update failed'),
      });
    } else {
      if (!password) { toast.error('Password is required'); return; }
      createUser.mutate(
        { firstName, lastName, email, phone: phone || undefined, password, role },
        {
          onSuccess: () => {
            toast.success('Staff member created');
            onClose();
          },
          onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Create failed'),
        }
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between"
             style={{ backgroundColor: BRAND }}>
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder="+251 91x xxx xxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isEdit ? 'New Password' : 'Password'}
              {isEdit && <span className="text-slate-400 font-normal ml-1">(leave blank to keep)</span>}
            </label>
            <input
              type="password"
              required={!isEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder={isEdit ? '••••••••' : 'Min 8 characters'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Add Staff')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffManagement() {
  const [activeTab,  setActiveTab]  = useState<Role | 'ALL'>('ALL');
  const [search,     setSearch]     = useState('');
  const [modalUser,  setModalUser]  = useState<User | null | undefined>(undefined);
  // undefined = closed, null = add mode, User = edit mode

  const { data: users = [], isLoading, isError } = useUsers(
    activeTab === 'ALL' ? undefined : activeTab
  );
  const updateUser = useUpdateUser();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users as User[];
    return (users as User[]).filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  function handleToggleActive(user: User) {
    updateUser.mutate(
      { id: user.id, isActive: !user.isActive },
      {
        onSuccess: () =>
          toast.success(
            user.isActive
              ? `${user.firstName} deactivated`
              : `${user.firstName} activated`
          ),
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? 'Update failed'),
      }
    );
  }

  const staffCount = (users as User[]).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {staffCount} {staffCount === 1 ? 'member' : 'members'}{activeTab !== 'ALL' ? ` · ${ROLE_META[activeTab]?.label}` : ''}
          </p>
        </div>
        <button
          onClick={() => setModalUser(null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: BRAND }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Staff
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_TABS.map((tab) => {
          const active = activeTab === tab.role;
          return (
            <button
              key={tab.role}
              onClick={() => setActiveTab(tab.role)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              style={active ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading staff…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20 text-red-500 text-sm">
            Failed to load staff. Please try again.
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium">No staff found</p>
            <p className="text-xs mt-1">{search ? 'Try a different search term' : 'Add your first staff member'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Joined</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: BRAND }}
                        >
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="font-medium text-slate-900 whitespace-nowrap">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[180px]">{user.email}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {user.phone ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <ActiveDot active={user.isActive} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle active */}
                        <button
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(user)}
                          disabled={updateUser.isPending}
                          className={`p-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            user.isActive
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          {user.isActive ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        {/* Edit */}
                        <button
                          title="Edit"
                          onClick={() => setModalUser(user)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalUser !== undefined && (
        <StaffModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
        />
      )}
    </div>
  );
}
