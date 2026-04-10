import { useState, useMemo } from 'react';
import {
  useOrders,
  useCreateOrder,
  useUpdateOrderStatus,
  useCategories,
} from '../../api/hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVING'
  | 'BILLING'
  | 'PAYMENT'
  | 'COMPLETE'
  | 'CANCELLED';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  menuItem: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
  user: { firstName: string; lastName: string; role: string };
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'SERVING',
  'BILLING',
];

const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING:   { label: 'Pending',   color: 'text-yellow-700',  bg: 'bg-yellow-100',  border: 'border-yellow-300'  },
  ACCEPTED:  { label: 'Accepted',  color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-300'    },
  PREPARING: { label: 'Preparing', color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-300'  },
  READY:     { label: 'Ready',     color: 'text-green-700',   bg: 'bg-green-100',   border: 'border-green-300'   },
  SERVING:   { label: 'Serving',   color: 'text-purple-700',  bg: 'bg-purple-100',  border: 'border-purple-300'  },
  BILLING:   { label: 'Billing',   color: 'text-indigo-700',  bg: 'bg-indigo-100',  border: 'border-indigo-300'  },
  PAYMENT:   { label: 'Payment',   color: 'text-indigo-700',  bg: 'bg-indigo-100',  border: 'border-indigo-300'  },
  COMPLETE:  { label: 'Complete',  color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-100',     border: 'border-red-300'     },
};

const NEXT_ACTIONS: Record<
  OrderStatus,
  { label: string; next: OrderStatus; style: string }[]
> = {
  PENDING:   [
    { label: 'Accept',          next: 'ACCEPTED',  style: 'bg-blue-600 hover:bg-blue-700 text-white'   },
    { label: 'Cancel',          next: 'CANCELLED', style: 'bg-red-100 hover:bg-red-200 text-red-700'   },
  ],
  ACCEPTED:  [{ label: 'Start Preparing', next: 'PREPARING', style: 'bg-orange-600 hover:bg-orange-700 text-white' }],
  PREPARING: [{ label: 'Mark Ready',      next: 'READY',     style: 'bg-green-600 hover:bg-green-700 text-white'   }],
  READY:     [{ label: 'Serve',           next: 'SERVING',   style: 'bg-purple-600 hover:bg-purple-700 text-white' }],
  SERVING:   [{ label: 'Generate Bill',   next: 'BILLING',   style: 'bg-indigo-600 hover:bg-indigo-700 text-white' }],
  BILLING:   [],
  PAYMENT:   [],
  COMPLETE:  [],
  CANCELLED: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(n: number) {
  return `ETB ${Number(n).toFixed(2)}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.color} ${m.border}`}
    >
      {m.label}
    </span>
  );
}

function OrderCard({
  order,
  onStatusChange,
  isUpdating,
}: {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            #{order.orderNumber}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-500">
              {order.orderType === 'DINE_IN'
                ? `Table ${order.tableNumber ?? '—'}`
                : 'Takeaway'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-forest">{formatCurrency(order.total)}</p>
          <p className="text-xs text-slate-400">{formatTime(order.createdAt)}</p>
        </div>
      </div>

      {/* Items toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-left text-xs text-forest font-medium underline underline-offset-2 w-fit"
      >
        {expanded ? 'Hide items' : `View ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`}
      </button>

      {expanded && (
        <ul className="divide-y divide-slate-100 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-1">
              <span className="text-slate-700">
                {item.quantity}× {item.menuItem.name}
              </span>
              <span className="text-slate-500">{formatCurrency(item.totalPrice)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Notes */}
      {order.notes && (
        <p className="text-xs text-slate-500 italic bg-slate-50 rounded px-2 py-1">
          {order.notes}
        </p>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex gap-2 flex-wrap pt-1">
          {actions.map((action) => (
            <button
              key={action.next}
              disabled={isUpdating}
              onClick={() => onStatusChange(order.id, action.next)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${action.style}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Order Form ───────────────────────────────────────────────────────────

function NewOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: categoriesData, isLoading: catsLoading } = useCategories();
  const createOrder = useCreateOrder();

  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories: Category[] = useMemo(() => {
    if (!categoriesData) return [];
    // API may return { data: [] } or []
    return Array.isArray(categoriesData)
      ? categoriesData
      : (categoriesData.data ?? []);
  }, [categoriesData]);

  // Auto-select first category
  const selectedCatId = activeCatId ?? categories[0]?.id ?? null;
  const selectedCat = categories.find((c) => c.id === selectedCatId);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItemId === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItemId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci,
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) => {
      const updated = prev.map((ci) =>
        ci.menuItemId === menuItemId ? { ...ci, quantity: ci.quantity + delta } : ci,
      );
      return updated.filter((ci) => ci.quantity > 0);
    });
  }

  const cartTotal = cart.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);

  async function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError('Add at least one item to the order.');
      return;
    }
    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      setError('Please enter a table number for dine-in orders.');
      return;
    }
    try {
      await createOrder.mutateAsync({
        orderType,
        tableNumber: orderType === 'DINE_IN' ? Number(tableNumber) : undefined,
        notes: notes.trim() || undefined,
        items: cart.map((ci) => ({ menuItemId: ci.menuItemId, quantity: ci.quantity })),
      });
      setCart([]);
      setTableNumber('');
      setNotes('');
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create order. Please try again.');
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Order type + table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-3">
          Order Details
        </h2>
        <div className="flex gap-2 mb-3">
          {(['DINE_IN', 'TAKEAWAY'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                orderType === type
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white text-forest border-slate-300 hover:border-forest'
              }`}
            >
              {type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
            </button>
          ))}
        </div>
        {orderType === 'DINE_IN' && (
          <input
            type="number"
            min={1}
            placeholder="Table number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
          />
        )}
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full mt-2 border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
        />
      </div>

      {/* Menu browser */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3 flex-1 min-h-0">
        <h2 className="text-sm font-bold text-forest uppercase tracking-wide">Menu</h2>

        {catsLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
            Loading menu…
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No menu categories found.</p>
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatId(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    cat.id === selectedCatId
                      ? 'bg-forest text-white border-forest'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-forest'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div className="overflow-y-auto flex-1 pr-0.5">
              <div className="grid grid-cols-2 gap-2">
                {(selectedCat?.menuItems ?? []).map((item) => {
                  const inCart = cart.find((ci) => ci.menuItemId === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="relative text-left p-3 border border-slate-200 rounded-xl hover:border-forest hover:shadow-sm transition-all bg-white"
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 bg-forest text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                      <p className="text-xs font-semibold text-slate-800 leading-tight pr-5">
                        {item.name}
                      </p>
                      <p className="text-xs text-forest font-bold mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </button>
                  );
                })}
                {(selectedCat?.menuItems ?? []).length === 0 && (
                  <p className="col-span-2 text-sm text-slate-400 text-center py-6">
                    No items in this category.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cart summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h2 className="text-sm font-bold text-forest uppercase tracking-wide mb-2">Cart</h2>
        {cart.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No items added yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 mb-3 max-h-40 overflow-y-auto">
            {cart.map((ci) => (
              <li key={ci.menuItemId} className="flex items-center justify-between py-1.5 gap-2">
                <span className="text-xs text-slate-700 flex-1 truncate">{ci.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(ci.menuItemId, -1)}
                    className="w-5 h-5 rounded border border-slate-300 text-slate-600 text-xs flex items-center justify-center hover:bg-slate-100"
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold w-5 text-center">{ci.quantity}</span>
                  <button
                    onClick={() => updateQty(ci.menuItemId, 1)}
                    className="w-5 h-5 rounded border border-slate-300 text-slate-600 text-xs flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-semibold text-forest w-20 text-right">
                  {formatCurrency(ci.price * ci.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mb-3">
          <span className="text-sm font-bold text-slate-700">Total</span>
          <span className="text-sm font-bold text-forest">{formatCurrency(cartTotal)}</span>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mb-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={createOrder.isPending}
          className="w-full py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {createOrder.isPending ? 'Placing Order…' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}

// ─── Active Orders Panel ──────────────────────────────────────────────────────

function ActiveOrdersPanel() {
  const { data: ordersData, isLoading, isError } = useOrders({ limit: 100 });
  const updateStatus = useUpdateOrderStatus();

  const orders: Order[] = useMemo(() => {
    if (!ordersData) return [];
    return Array.isArray(ordersData) ? ordersData : (ordersData.data ?? []);
  }, [ordersData]);

  const activeOrders = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)),
    [orders],
  );

  // Group by status in display order
  const grouped = useMemo(() => {
    const groups: Partial<Record<OrderStatus, Order[]>> = {};
    for (const status of ACTIVE_STATUSES) {
      const bucket = activeOrders.filter((o) => o.status === status);
      if (bucket.length > 0) groups[status] = bucket;
    }
    return groups;
  }, [activeOrders]);

  function handleStatusChange(id: string, status: OrderStatus) {
    updateStatus.mutate({ id, status });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Loading orders…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load orders.
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
        <svg
          className="w-10 h-10 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">No active orders right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto">
      {(Object.entries(grouped) as [OrderStatus, Order[]][]).map(([status, bucket]) => (
        <section key={status}>
          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-slate-50 py-1 z-10">
            <StatusBadge status={status} />
            <span className="text-xs text-slate-500 font-medium">
              {bucket.length} order{bucket.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {bucket.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersBoard() {
  const [showSuccess, setShowSuccess] = useState(false);

  function handleOrderCreated() {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-forest leading-tight">Orders Board</h1>
          <p className="text-xs text-slate-400">New order &amp; live status tracking</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Order placed!
          </div>
        )}
        <p className="text-xs text-slate-400 hidden sm:block">Auto-refreshes every 10s</p>
      </div>

      {/* Two-panel layout */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left: New Order form */}
        <aside className="w-80 shrink-0 border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto flex flex-col">
          <NewOrderForm onSuccess={handleOrderCreated} />
        </aside>

        {/* Right: Active Orders */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-forest uppercase tracking-wide">
              Active Orders
            </h2>
          </div>
          <ActiveOrdersPanel />
        </main>
      </div>
    </div>
  );
}
