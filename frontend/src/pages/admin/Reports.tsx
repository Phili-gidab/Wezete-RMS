import { useState } from 'react';
import {
  useSalesReport,
  useTopItems,
  useInventoryReport,
  useAuditReport,
} from '../../api/hooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND = '#0A3D39';

type Tab = 'sales' | 'inventory' | 'audit';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopItem {
  menuItem: { id: string; name: string; price: number };
  totalQuantitySold: number;
  totalRevenue: number;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  costPerUnit: number;
  isLow: boolean;
  stockValue: number;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  delta: unknown;
  ipAddress: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function etb(value: number): string {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

function Spinner() {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-slate-400">
      Loading…
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <p className="text-sm text-slate-400 py-6 text-center">{message}</p>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab({ from, to }: { from?: string; to?: string }) {
  const { data: sales, isLoading: salesLoading } = useSalesReport(from || undefined, to || undefined);
  const { data: topItemsRaw, isLoading: itemsLoading } = useTopItems(from || undefined, to || undefined);

  const topItems: TopItem[] = Array.isArray(topItemsRaw) ? topItemsRaw : [];

  const cash = sales?.byMethod?.cash ?? { count: 0, total: 0 };
  const chapa = sales?.byMethod?.chapa ?? { count: 0, total: 0 };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      {salesLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue"
            value={sales ? etb(sales.totalRevenue) : '—'}
            sub="Across all orders"
          />
          <StatCard
            label="Total Orders"
            value={sales?.totalOrders ?? '—'}
            sub="Completed payments"
          />
          <StatCard
            label="Avg Order Value"
            value={sales ? etb(sales.avgOrderValue) : '—'}
            sub="Per paid order"
          />
        </div>
      )}

      {/* Payment Method Breakdown */}
      <SectionCard title="Payment Method Breakdown">
        {salesLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Method', 'Transactions', 'Total Revenue'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 pr-6 font-medium text-slate-500 text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-6">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" style={{ backgroundColor: BRAND }} />
                      <span className="font-medium text-slate-700">Cash</span>
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-slate-600">{cash.count}</td>
                  <td className="py-3 font-semibold text-slate-800">{etb(cash.total)}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-6">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block bg-teal-400" />
                      <span className="font-medium text-slate-700">Chapa</span>
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-slate-600">{chapa.count}</td>
                  <td className="py-3 font-semibold text-slate-800">{etb(chapa.total)}</td>
                </tr>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="py-2.5 pr-6 text-xs font-semibold text-slate-500 uppercase">Total</td>
                  <td className="py-2.5 pr-6 text-xs font-semibold text-slate-600">
                    {cash.count + chapa.count}
                  </td>
                  <td className="py-2.5 text-xs font-bold text-slate-800">
                    {etb(cash.total + chapa.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Top Selling Items */}
      <SectionCard title="Top Selling Items">
        {itemsLoading ? (
          <Spinner />
        ) : topItems.length === 0 ? (
          <Empty message="No sales data for the selected period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Item Name', 'Qty Sold', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 pr-6 font-medium text-slate-500 text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, idx) => (
                  <tr
                    key={item.menuItem.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 pr-6">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: idx === 0 ? BRAND : '#94a3b8' }}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-6 font-medium text-slate-800">
                      {item.menuItem.name}
                    </td>
                    <td className="py-3 pr-6 text-slate-600">{item.totalQuantitySold}</td>
                    <td className="py-3 font-semibold text-slate-800">{etb(item.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab() {
  const { data: reportRaw, isLoading } = useInventoryReport();
  const items: InventoryItem[] = Array.isArray(reportRaw) ? reportRaw : [];

  const totalStockValue = items.reduce((sum, i) => sum + (i.stockValue ?? 0), 0);
  const lowStockCount = items.filter((i) => i.isLow).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Stock Value"
          value={isLoading ? '…' : etb(totalStockValue)}
          sub="Current on-hand value"
        />
        <StatCard
          label="Low-Stock Items"
          value={isLoading ? '…' : lowStockCount}
          sub="At or below reorder level"
        />
      </div>

      {/* Table */}
      <SectionCard title="Inventory Status">
        {isLoading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty message="No inventory data available" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Name', 'Unit', 'Quantity', 'Reorder Level', 'Cost / Unit', 'Stock Value', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-50 transition-colors ${
                      item.isLow ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 pr-4 font-medium text-slate-800 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{item.unit}</td>
                    <td className="py-3 pr-4 text-slate-700 font-medium">{item.quantity}</td>
                    <td className="py-3 pr-4 text-slate-500">{item.reorderLevel}</td>
                    <td className="py-3 pr-4 text-slate-700">{etb(item.costPerUnit)}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800">{etb(item.stockValue)}</td>
                    <td className="py-3">
                      {item.isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditTab({ from, to }: { from?: string; to?: string }) {
  const { data: auditRaw, isLoading } = useAuditReport(from || undefined, to || undefined);

  const entries: AuditEntry[] = Array.isArray(auditRaw)
    ? [...auditRaw].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  function actionColor(action: string): string {
    const upper = action.toUpperCase();
    if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'bg-red-50 text-red-700 border-red-200';
    if (upper.includes('CREATE') || upper.includes('ADD')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (upper.includes('UPDATE') || upper.includes('PATCH') || upper.includes('EDIT')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <SectionCard title="Audit Log">
      {isLoading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <Empty message="No audit entries for the selected period" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 pr-4 font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 pr-4 text-slate-500 whitespace-nowrap text-xs">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="py-3 pr-4 text-slate-700 whitespace-nowrap font-medium">
                    {entry.user.firstName} {entry.user.lastName}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {entry.user.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${actionColor(entry.action)}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{entry.entity}</td>
                  <td className="py-3 text-slate-400 font-mono text-xs truncate max-w-[120px]">
                    {entry.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3">{entries.length} entries — sorted newest first</p>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: 'Sales' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports & Accounting</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Sales performance, inventory status, and audit trail
        </p>
      </div>

      {/* Date Range + Tabs Row */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Tab Switcher */}
        <div className="flex gap-1 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={activeTab === tab.key ? { backgroundColor: BRAND } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range — only relevant for Sales and Audit */}
        {activeTab !== 'inventory' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Date range
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                placeholder="From"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                placeholder="To"
              />
            </div>
            {(from || to) && (
              <button
                onClick={() => { setFrom(''); setTo(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'sales' && <SalesTab from={from} to={to} />}
      {activeTab === 'inventory' && <InventoryTab />}
      {activeTab === 'audit' && <AuditTab from={from} to={to} />}
    </div>
  );
}
