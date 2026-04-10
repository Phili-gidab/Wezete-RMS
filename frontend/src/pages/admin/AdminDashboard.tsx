import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  useSalesReport,
  useTopItems,
  useOrders,
  useApprovals,
  useDecideApproval,
} from '../../api/hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Approval {
  id: string;
  type: string;
  status: string;
  reason: string;
  order: { id: string; orderNumber: string; total: number };
  requestedBy: { firstName: string; lastName: string };
  decidedBy?: { firstName: string; lastName: string };
}

interface TopItem {
  menuItem: { id: string; name: string; price: number };
  totalQuantitySold: number;
  totalRevenue: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND = '#0A3D39';
const PIE_COLORS = [BRAND, '#2DD4BF'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-1">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Payment Method Pie ───────────────────────────────────────────────────────

function PaymentPieChart({
  cash,
  chapa,
}: {
  cash: { count: number; total: number };
  chapa: { count: number; total: number };
}) {
  const total = cash.total + chapa.total;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        No payment data available
      </div>
    );
  }

  const data = [
    { name: 'Cash', value: cash.total },
    { name: 'Chapa', value: chapa.total },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }: any) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Top Items Bar Chart ──────────────────────────────────────────────────────

function TopItemsBarChart({ items }: { items: TopItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        No sales data available
      </div>
    );
  }

  const data = items.slice(0, 5).map((item) => ({
    name:
      item.menuItem.name.length > 14
        ? item.menuItem.name.slice(0, 12) + '…'
        : item.menuItem.name,
    fullName: item.menuItem.name,
    qty: item.totalQuantitySold,
    revenue: item.totalRevenue,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          formatter={(value: any, name: any) =>
            name === 'revenue' ? [formatCurrency(Number(value)), 'Revenue'] : [value, 'Qty Sold']
          }
          labelFormatter={(_label: any, payload: any) =>
            payload?.[0]?.payload?.fullName ?? _label
          }
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="qty" name="Qty Sold" fill={BRAND} radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" name="Revenue (ETB)" fill="#2DD4BF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Approvals Table ─────────────────────────────────────────────────────────

function ApprovalsTable({ approvals }: { approvals: Approval[] }) {
  const decide = useDecideApproval();

  const handleDecide = (id: string, status: 'APPROVED' | 'REJECTED') => {
    decide.mutate({ id, status });
  };

  if (approvals.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No pending approvals
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide">
              Order
            </th>
            <th className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide">
              Type
            </th>
            <th className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide">
              Requested By
            </th>
            <th className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide">
              Reason
            </th>
            <th className="text-left py-2 font-medium text-slate-500 text-xs uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((approval) => (
            <tr
              key={approval.id}
              className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
            >
              <td className="py-3 pr-4">
                <span className="font-medium text-slate-800">
                  #{approval.order.orderNumber}
                </span>
                <span className="block text-xs text-slate-400">
                  {formatCurrency(approval.order.total)}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  {approval.type.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="py-3 pr-4 text-slate-600">
                {approval.requestedBy.firstName} {approval.requestedBy.lastName}
              </td>
              <td className="py-3 pr-4 text-slate-500 max-w-[200px] truncate">
                {approval.reason}
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecide(approval.id, 'APPROVED')}
                    disabled={decide.isPending}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: BRAND }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecide(approval.id, 'REJECTED')}
                    disabled={decide.isPending}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: sales, isLoading: salesLoading } = useSalesReport();
  const { data: topItems, isLoading: itemsLoading } = useTopItems();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ limit: 5 });
  const { data: approvals, isLoading: approvalsLoading } = useApprovals('PENDING');

  const pendingApprovals: Approval[] = Array.isArray(approvals) ? approvals : [];
  const topItemsList: TopItem[] = Array.isArray(topItems) ? topItems : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Overview of restaurant operations
        </p>
      </div>

      {/* Stat Cards */}
      {salesLoading ? (
        <div className="text-sm text-slate-500 mb-6">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Revenue"
            value={sales ? formatCurrency(sales.totalRevenue) : '—'}
            sub="All time"
          />
          <StatCard
            label="Total Orders"
            value={sales?.totalOrders ?? '—'}
            sub="All time"
          />
          <StatCard
            label="Avg Order Value"
            value={sales ? formatCurrency(sales.avgOrderValue) : '—'}
            sub="Per order"
          />
          <StatCard
            label="Pending Approvals"
            value={approvalsLoading ? '…' : pendingApprovals.length}
            sub="Awaiting decision"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Payment Method Pie */}
        <SectionCard title="Revenue by Payment Method">
          {salesLoading ? (
            <div className="flex items-center justify-center h-40 text-sm text-slate-500">
              Loading...
            </div>
          ) : sales?.byMethod ? (
            <PaymentPieChart
              cash={sales.byMethod.cash ?? { count: 0, total: 0 }}
              chapa={sales.byMethod.chapa ?? { count: 0, total: 0 }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">
              No data
            </div>
          )}
        </SectionCard>

        {/* Top Items Bar */}
        <SectionCard title="Top 5 Selling Items">
          {itemsLoading ? (
            <div className="flex items-center justify-center h-40 text-sm text-slate-500">
              Loading...
            </div>
          ) : (
            <TopItemsBarChart items={topItemsList} />
          )}
        </SectionCard>
      </div>

      {/* Pending Approvals Table */}
      <SectionCard title={`Pending Approvals (${pendingApprovals.length})`}>
        {approvalsLoading ? (
          <div className="text-sm text-slate-500 py-4 text-center">Loading...</div>
        ) : (
          <ApprovalsTable approvals={pendingApprovals} />
        )}
      </SectionCard>

      {/* Recent Orders Summary */}
      <div className="mt-4">
        <SectionCard title="Recent Orders">
          {ordersLoading ? (
            <div className="text-sm text-slate-500 py-4 text-center">Loading...</div>
          ) : !ordersData?.data?.length ? (
            <p className="text-sm text-slate-400 py-4 text-center">No orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Order #', 'Type', 'Status', 'Total', 'Table'].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordersData.data.map((order: any) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-800">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 capitalize">
                        {order.orderType?.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 pr-4 text-slate-800 font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 text-slate-500">
                        {order.tableNumber ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ordersData.meta && (
                <p className="text-xs text-slate-400 mt-3">
                  Showing {ordersData.data.length} of {ordersData.meta.total} orders
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    PREPARING: 'bg-orange-50 text-orange-700 border-orange-200',
    READY: 'bg-teal-50 text-teal-700 border-teal-200',
    SERVED: 'bg-green-50 text-green-700 border-green-200',
    PAID: 'bg-slate-50 text-slate-600 border-slate-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    VOIDED: 'bg-red-50 text-red-700 border-red-200',
  };

  const cls = map[status] ?? 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
