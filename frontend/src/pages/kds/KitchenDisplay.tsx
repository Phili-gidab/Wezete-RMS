import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOrders, useUpdateOrderStatus, useCreateApproval } from '../../api/hooks';
import { useSocket } from '../../contexts/WebSocketContext';
import { useKdsAudioAlert } from '../../hooks/useKdsAudioAlert';
import { useAuthStore } from '../../stores/useAuthStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FLOW: Record<string, string> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400/20 text-yellow-300 border-yellow-500/40',
  ACCEPTED: 'bg-blue-400/20 text-blue-300 border-blue-500/40',
  PREPARING: 'bg-orange-400/20 text-orange-300 border-orange-500/40',
  READY: 'bg-green-400/20 text-green-300 border-green-500/40',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
};

// Slugs / name fragments that indicate a Bar item.
// Extend this list as categories grow.
const BAR_CATEGORY_SLUGS = new Set([
  'drinks',
  'drink',
  'beverages',
  'beverage',
  'bar',
  'cocktail',
  'cocktails',
  'juice',
  'juices',
  'coffee',
  'tea',
  'soft-drinks',
  'soft_drinks',
  'alcohol',
  'wine',
  'beer',
]);

type Station = 'KITCHEN' | 'BAR';

/** Returns true when a menu-item's category looks like a bar/drink item. */
function isBarItem(menuItem: any): boolean {
  const slug: string = menuItem?.category?.slug ?? '';
  const name: string = (menuItem?.category?.name ?? '').toLowerCase();
  if (slug && BAR_CATEGORY_SLUGS.has(slug.toLowerCase())) return true;
  for (const keyword of BAR_CATEGORY_SLUGS) {
    if (name.includes(keyword)) return true;
  }
  return false;
}

/** Returns the stations this order belongs to (an order can span both). */
function orderStations(order: any): Set<Station> {
  const items: any[] = order.items ?? [];
  const stations = new Set<Station>();

  // Check whether any item actually has category data from the API
  const hasCategoryData = items.some((item) => item.menuItem?.category != null);

  if (!hasCategoryData) {
    // Category not included in the API response — show on both tabs
    stations.add('KITCHEN');
    stations.add('BAR');
    return stations;
  }

  for (const item of items) {
    if (isBarItem(item.menuItem)) {
      stations.add('BAR');
    } else {
      stations.add('KITCHEN');
    }
  }

  // Fallback: empty order — show on both
  if (stations.size === 0) {
    stations.add('KITCHEN');
    stations.add('BAR');
  }
  return stations;
}

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FlagModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
}

function FlagModal({ orderId, orderNumber, onClose }: FlagModalProps) {
  const [reason, setReason] = useState('');
  const createApproval = useCreateApproval();

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('Please enter a reason');
      return;
    }
    createApproval.mutate(
      { type: 'VOID', orderId, reason: trimmed },
      {
        onSuccess: () => {
          toast.success(`Issue flagged for order ${orderNumber}`);
          onClose();
        },
        onError: () => {
          toast.error('Failed to flag issue — please try again');
        },
      },
    );
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 border border-slate-700 p-5 shadow-2xl">
        <h2 className="text-base font-bold text-white mb-1">Flag Issue</h2>
        <p className="text-xs text-slate-400 mb-4">
          Order <span className="font-semibold text-slate-200">{orderNumber}</span> — this will
          create a void-approval request for management review.
        </p>
        <textarea
          autoFocus
          rows={3}
          placeholder="Describe the issue…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#0A3D39] mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createApproval.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
          >
            {createApproval.isPending ? 'Sending…' : 'Flag Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: any;
  station: Station;
  onAdvance: (id: string, status: string) => void;
  advancePending: boolean;
  onFlag: (id: string, orderNumber: string) => void;
}

function OrderCard({ order, station, onAdvance, advancePending, onFlag }: OrderCardProps) {
  const elapsed = getElapsedMinutes(order.createdAt);
  const isUrgent = elapsed > 15;
  const statusColor = STATUS_COLORS[order.status] ?? 'bg-slate-700 text-slate-300 border-slate-600';
  const nextStatus = STATUS_FLOW[order.status];

  // Filter items to only those relevant to this station when category data is present
  const hasCategoryData = order.items.some((item: any) => item.menuItem?.category != null);
  const visibleItems = order.items.filter((item: any) => {
    if (!hasCategoryData) return true; // no category info — show all items on both tabs
    const bar = isBarItem(item.menuItem);
    return station === 'BAR' ? bar : !bar;
  });

  return (
    <div
      className={`flex flex-col rounded-xl border-2 bg-slate-800 transition-all ${
        isUrgent
          ? 'border-red-500 shadow-lg shadow-red-500/20'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="min-w-0">
          <span className="text-base font-bold text-white truncate">{order.orderNumber}</span>
          {order.tableNumber && (
            <span className="ml-2 text-xs text-slate-400">Table {order.tableNumber}</span>
          )}
        </div>
        <span
          className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColor}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {/* ── Timer ── */}
      <div
        className={`px-4 pb-2 text-xs font-mono ${
          isUrgent ? 'text-red-400 font-bold' : 'text-slate-500'
        }`}
      >
        {isUrgent && <span className="mr-1">⚠</span>}
        {elapsed}m ago
      </div>

      {/* ── Items ── */}
      <div className="flex-1 space-y-1.5 px-4 pb-3">
        {visibleItems.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-bold text-slate-200">
              {item.quantity}
            </span>
            <span className="text-sm text-slate-200 leading-tight">{item.menuItem?.name}</span>
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      {order.notes && (
        <div className="mx-4 mb-3 rounded-lg bg-orange-900/30 border border-orange-700/40 px-3 py-1.5">
          <p className="text-xs text-orange-300">
            <span className="font-semibold">Note:</span> {order.notes}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="px-4 pb-4 space-y-2">
        {nextStatus && (
          <button
            onClick={() => onAdvance(order.id, order.status)}
            disabled={advancePending}
            className="w-full rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A3D39]/80 active:scale-[0.98] disabled:opacity-50"
          >
            {order.status === 'PENDING' && 'Accept Order'}
            {order.status === 'ACCEPTED' && 'Start Preparing'}
            {order.status === 'PREPARING' && 'Mark Ready'}
          </button>
        )}

        {order.status === 'READY' && (
          <div className="text-center text-sm font-semibold text-green-400 py-1">
            ✓ Ready for pickup
          </div>
        )}

        {/* Flag Issue — always visible */}
        <button
          onClick={() => onFlag(order.id, order.orderNumber)}
          className="w-full rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/40 hover:text-red-300 active:scale-[0.98]"
        >
          Flag Issue
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KitchenDisplay() {
  useKdsAudioAlert();
  const socket = useSocket();
  const user = useAuthStore((s) => s.user);
  const [, setNow] = useState(Date.now());

  // Determine which tabs are accessible and the default active tab
  const roleId = user?.roleId;
  const showKitchen = roleId !== 2;   // everyone except Barista sees Kitchen tab
  const showBar = roleId !== 3;       // everyone except Chef sees Bar tab

  const defaultStation: Station =
    roleId === 2 ? 'BAR' : 'KITCHEN';

  const [activeStation, setActiveStation] = useState<Station>(defaultStation);

  // Sync default when user loads (e.g. role resolves after mount)
  useEffect(() => {
    setActiveStation(roleId === 2 ? 'BAR' : 'KITCHEN');
  }, [roleId]);

  // Fetch active orders across all relevant statuses
  const { data: pendingOrders } = useOrders({ status: 'PENDING', limit: 50 });
  const { data: acceptedOrders } = useOrders({ status: 'ACCEPTED', limit: 50 });
  const { data: preparingOrders } = useOrders({ status: 'PREPARING', limit: 50 });
  const { data: readyOrders } = useOrders({ status: 'READY', limit: 50 });

  const updateStatus = useUpdateOrderStatus();

  // Tick timers every 30 s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Flag modal state
  const [flagTarget, setFlagTarget] = useState<{ id: string; orderNumber: string } | null>(null);

  const allOrders = [
    ...(pendingOrders?.data ?? []),
    ...(acceptedOrders?.data ?? []),
    ...(preparingOrders?.data ?? []),
    ...(readyOrders?.data ?? []),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Filter orders by active station
  const visibleOrders = allOrders.filter((order) =>
    orderStations(order).has(activeStation),
  );

  const handleAdvance = (orderId: string, currentStatus: string) => {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) return;
    updateStatus.mutate(
      { id: orderId, status: nextStatus },
      {
        onSuccess: () => toast.success('Order status updated'),
        onError: () => toast.error('Failed to update status'),
      },
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title + connection indicator */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Kitchen Display</h1>
            <span
              title={socket ? 'Connected' : 'Disconnected'}
              className={`h-2 w-2 rounded-full ${socket ? 'bg-green-400' : 'bg-red-400'}`}
            />
          </div>

          {/* Station tabs — only shown if the role can access multiple stations */}
          {showKitchen && showBar && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1">
              <StationTab
                label="Kitchen"
                active={activeStation === 'KITCHEN'}
                onClick={() => setActiveStation('KITCHEN')}
              />
              <StationTab
                label="Bar"
                active={activeStation === 'BAR'}
                onClick={() => setActiveStation('BAR')}
              />
            </div>
          )}

          {/* Role-locked station badge */}
          {(!showKitchen || !showBar) && (
            <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
              {activeStation === 'KITCHEN' ? '👨‍🍳 Kitchen' : '🍹 Bar'}
            </span>
          )}

          {/* Order count */}
          <span className="text-sm text-slate-400">
            {visibleOrders.length} order{visibleOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="flex-1 p-4">
        {visibleOrders.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-lg text-slate-500">
              No active orders for{' '}
              <span className="capitalize">{activeStation.toLowerCase()}</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                station={activeStation}
                onAdvance={handleAdvance}
                advancePending={updateStatus.isPending}
                onFlag={(id, orderNumber) => setFlagTarget({ id, orderNumber })}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Flag Modal ── */}
      {flagTarget && (
        <FlagModal
          orderId={flagTarget.id}
          orderNumber={flagTarget.orderNumber}
          onClose={() => setFlagTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Station Tab ─────────────────────────────────────────────────────────────

function StationTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-[#0A3D39] text-white shadow'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
