import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useSalesReport, useTopItems, useOrders, useApprovals, useDecideApproval,
} from '../../api/hooks';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────

const BRAND = '#0A3D39';
const ACCENT = '#2DD4BF';

function formatETB(value: number): string {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(value);
}

// ─── Revenue Stats Card (inspired by screenshot) ────────────────────────────

function RevenueStatsCard({ sales, ordersData }: { sales: any; ordersData: any }) {
  const completed = ordersData?.data?.filter((o: any) => o.status === 'COMPLETE')?.length ?? 0;
  const active = ordersData?.data?.filter((o: any) => !['COMPLETE', 'CANCELLED'].includes(o.status))?.length ?? 0;
  const total = ordersData?.meta?.total ?? 0;

  // Mini sparkline data (simulated from order totals)
  const sparkData = (ordersData?.data ?? []).slice(0, 7).map((o: any, i: number) => ({
    x: i, value: Number(o.total),
  })).reverse();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-slate-800">Revenue stats</h2>
        <span className="text-xs text-slate-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>

      <div className="space-y-4 mt-5">
        {/* Completed */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Completed</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                {completed} orders
              </span>
            </div>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {sales ? formatETB(sales.totalRevenue) : '—'}
            </p>
          </div>
        </div>

        {/* Ongoing */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Ongoing</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {active} active
              </span>
            </div>
            <p className="text-lg font-bold text-slate-600 mt-0.5">
              {formatETB(
                (ordersData?.data ?? [])
                  .filter((o: any) => !['COMPLETE', 'CANCELLED'].includes(o.status))
                  .reduce((s: number, o: any) => s + Number(o.total), 0)
              )}
            </p>
          </div>
        </div>

        {/* Total / Expected */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Total today</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {total} orders
              </span>
            </div>
            <p className="text-lg font-bold text-slate-600 mt-0.5">
              {formatETB(
                (ordersData?.data ?? []).reduce((s: number, o: any) => s + Number(o.total), 0)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mini area chart */}
      {sparkData.length > 1 && (
        <div className="mt-4 -mx-2">
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={BRAND} fill="url(#sparkGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Order Status Overview ───────────────────────────────────────────────────

function OrderStatusOverview({ ordersData }: { ordersData: any }) {
  const orders = ordersData?.data ?? [];
  const statusCounts: Record<string, number> = {};
  orders.forEach((o: any) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const statuses = [
    { key: 'PENDING', label: 'Pending', color: 'bg-yellow-400' },
    { key: 'ACCEPTED', label: 'Accepted', color: 'bg-blue-400' },
    { key: 'PREPARING', label: 'In Kitchen', color: 'bg-orange-400' },
    { key: 'READY', label: 'Ready', color: 'bg-green-400' },
    { key: 'SERVING', label: 'Serving', color: 'bg-purple-400' },
    { key: 'COMPLETE', label: 'Completed', color: 'bg-emerald-500' },
    { key: 'CANCELLED', label: 'Cancelled', color: 'bg-red-400' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Order Status</h2>
      <div className="grid grid-cols-2 gap-3">
        {statuses.map((s) => (
          <div key={s.key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className={`w-3 h-3 rounded-full ${s.color}`} />
            <div className="flex-1">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-800">{statusCounts[s.key] || 0}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Cards Row ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string; icon: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Top Items Chart ─────────────────────────────────────────────────────────

function TopItemsChart({ items }: { items: any[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">No sales data yet</p>;

  const data = items.slice(0, 6).map((item) => ({
    name: item.menuItem.name.length > 12 ? item.menuItem.name.slice(0, 11) + '...' : item.menuItem.name,
    fullName: item.menuItem.name,
    qty: item.totalQuantitySold,
    revenue: item.totalRevenue,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          formatter={(value: any, name: any) => name === 'revenue' ? [formatETB(Number(value)), 'Revenue'] : [value, 'Qty Sold']}
          labelFormatter={(_: any, p: any) => p?.[0]?.payload?.fullName ?? _}
          contentStyle={{ fontSize: 12, borderRadius: 12 }}
        />
        <Bar dataKey="qty" name="Qty Sold" fill={BRAND} radius={[6, 6, 0, 0]} />
        <Bar dataKey="revenue" name="Revenue" fill={ACCENT} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Payment Donut ───────────────────────────────────────────────────────────

function PaymentDonut({ cash, chapa }: { cash: any; chapa: any }) {
  const total = (cash?.total ?? 0) + (chapa?.total ?? 0);
  if (total === 0) return <p className="text-sm text-slate-400 py-8 text-center">No payments yet</p>;

  const data = [
    { name: 'Cash', value: cash.total },
    { name: 'Chapa', value: chapa.total },
  ];

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
            <Cell fill={BRAND} />
            <Cell fill={ACCENT} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: BRAND }} />
          <div>
            <p className="text-xs text-slate-500">Cash</p>
            <p className="text-sm font-bold text-slate-800">{formatETB(cash.total)} <span className="text-xs text-slate-400">({cash.count})</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: ACCENT }} />
          <div>
            <p className="text-xs text-slate-500">Chapa</p>
            <p className="text-sm font-bold text-slate-800">{formatETB(chapa.total)} <span className="text-xs text-slate-400">({chapa.count})</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Orders ───────────────────────────────────────────────────────────

function RecentOrders({ ordersData }: { ordersData: any }) {
  const orders = ordersData?.data ?? [];
  if (orders.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">No orders</p>;

  const statusStyle: Record<string, string> = {
    PENDING: 'bg-yellow-400 text-white', ACCEPTED: 'bg-blue-500 text-white',
    PREPARING: 'bg-orange-400 text-white', READY: 'bg-green-500 text-white',
    SERVING: 'bg-purple-500 text-white', BILLING: 'bg-indigo-500 text-white',
    PAYMENT: 'bg-indigo-500 text-white', COMPLETE: 'bg-emerald-500 text-white',
    CANCELLED: 'bg-red-500 text-white',
  };

  return (
    <div className="space-y-2">
      {orders.slice(0, 6).map((order: any) => (
        <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {order.orderNumber.split('-').pop()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {order.orderType === 'DINE_IN' ? `Table ${order.tableNumber ?? '—'}` : 'Take Away'}
              </p>
              <p className="text-xs text-slate-400">{order.items?.length ?? 0} items</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[order.status] || 'bg-slate-400 text-white'}`}>
              {order.status === 'PREPARING' ? 'In Kitchen' : order.status.charAt(0) + order.status.slice(1).toLowerCase()}
            </span>
            <span className="text-sm font-bold text-slate-800 w-24 text-right">{formatETB(order.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Approvals Section ───────────────────────────────────────────────────────

function PendingApprovals({ approvals }: { approvals: any[] }) {
  const decide = useDecideApproval();

  if (approvals.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">No pending approvals</p>;

  return (
    <div className="space-y-2">
      {approvals.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {a.type.replace(/_/g, ' ')} — #{a.order?.orderNumber}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              By {a.requestedBy?.firstName} {a.requestedBy?.lastName} · {a.reason}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => decide.mutate({ id: a.id, status: 'APPROVED' }, { onSuccess: () => toast.success('Approved') })}
              disabled={decide.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0A3D39] text-white hover:bg-[#0A3D39]/90 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => decide.mutate({ id: a.id, status: 'REJECTED' }, { onSuccess: () => toast.success('Rejected') })}
              disabled={decide.isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: sales, isLoading: salesLoading } = useSalesReport();
  const { data: topItems } = useTopItems();
  const { data: ordersData } = useOrders({ limit: 20 });
  const { data: approvals } = useApprovals('PENDING');

  const pendingApprovals: any[] = Array.isArray(approvals) ? approvals : [];
  const topItemsList: any[] = Array.isArray(topItems) ? topItems : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Restaurant operations overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="💰" accent="bg-emerald-50"
          label="Total Revenue" value={salesLoading ? '...' : formatETB(sales?.totalRevenue ?? 0)} sub="All completed orders"
        />
        <StatCard
          icon="📋" accent="bg-blue-50"
          label="Total Orders" value={salesLoading ? '...' : (sales?.totalOrders ?? 0)} sub="Completed"
        />
        <StatCard
          icon="📊" accent="bg-purple-50"
          label="Avg Order Value" value={salesLoading ? '...' : formatETB(sales?.avgOrderValue ?? 0)} sub="Per order"
        />
        <StatCard
          icon="⏳" accent="bg-amber-50"
          label="Pending Approvals" value={pendingApprovals.length} sub="Awaiting review"
        />
      </div>

      {/* Main Grid: Revenue Stats + Order Status + Payment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueStatsCard sales={sales} ordersData={ordersData} />
        <OrderStatusOverview ordersData={ordersData} />
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Payments</h2>
          <PaymentDonut cash={sales?.byMethod?.cash ?? { count: 0, total: 0 }} chapa={sales?.byMethod?.chapa ?? { count: 0, total: 0 }} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Top Selling Items</h2>
        <TopItemsChart items={topItemsList} />
      </div>

      {/* Bottom: Recent Orders + Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Orders</h2>
            <span className="text-xs text-slate-400">{ordersData?.meta?.total ?? 0} total</span>
          </div>
          <RecentOrders ordersData={ordersData} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Approvals</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {pendingApprovals.length}
            </span>
          </div>
          <PendingApprovals approvals={pendingApprovals} />
        </div>
      </div>
    </div>
  );
}
