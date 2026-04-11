import { useState, useMemo } from 'react';
import {
  useOrders,
  useCreateOrder,
  useUpdateOrderStatus,
  useCategories,
} from '../../api/hooks';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY'
  | 'SERVING' | 'BILLING' | 'PAYMENT' | 'COMPLETE' | 'CANCELLED';

interface MenuItem { id: string; name: string; price: number; description?: string; prepTime?: number; }
interface Category { id: string; name: string; menuItems: MenuItem[]; }
interface OrderItem { id: string; quantity: number; unitPrice: number; totalPrice: number; menuItem: { name: string }; customisations?: Record<string, any>; dietaryNotes?: Record<string, any>; }
interface Order {
  id: string; orderNumber: string; status: OrderStatus; orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: number; subtotal: number; tax: number; discount: number; total: number;
  notes?: string; createdAt: string; items: OrderItem[];
}
interface CartItem { menuItemId: string; name: string; price: number; quantity: number; }

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVING', 'BILLING'];

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:   { label: 'Pending',     bg: 'bg-yellow-400', text: 'text-white' },
  ACCEPTED:  { label: 'Accepted',    bg: 'bg-blue-500',   text: 'text-white' },
  PREPARING: { label: 'In kitchen',  bg: 'bg-orange-400', text: 'text-white' },
  READY:     { label: 'Ready',       bg: 'bg-green-500',  text: 'text-white' },
  SERVING:   { label: 'Serving',     bg: 'bg-purple-500', text: 'text-white' },
  BILLING:   { label: 'Billing',     bg: 'bg-indigo-500', text: 'text-white' },
};

const CATEGORY_COLORS = [
  'bg-orange-400', 'bg-green-400', 'bg-blue-400', 'bg-red-400',
  'bg-purple-400', 'bg-amber-400', 'bg-teal-400', 'bg-pink-400',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  return `${mins} min ago`;
}

function formatETB(n: number) {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(Number(n));
}

// ─── Order Queue Card (horizontal scroll) ────────────────────────────────────

function QueueCard({ order, isSelected, onClick }: {
  order: Order; isSelected: boolean; onClick: () => void;
}) {
  const meta = STATUS_META[order.status] ?? { label: order.status, bg: 'bg-slate-400', text: 'text-white' };
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-52 rounded-2xl border-2 p-4 text-left transition-all ${
        isSelected
          ? 'border-[#0A3D39] shadow-lg scale-[1.02] bg-white'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-slate-800">
          {order.orderNumber.split('-').pop()}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
          {meta.label}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        {order.orderType === 'DINE_IN' ? `Dine in / Table ${order.tableNumber ?? '—'}` : 'Take away'}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{order.items.length} items</span>
        <span className="text-xs text-slate-400">{timeAgo(order.createdAt)}</span>
      </div>
    </button>
  );
}

// ─── Right Panel: Order Detail ───────────────────────────────────────────────

function OrderDetailPanel({ order, onStatusChange, isUpdating }: {
  order: Order; onStatusChange: (id: string, status: OrderStatus) => void; isUpdating: boolean;
}) {
  const actions: { label: string; next: OrderStatus; icon: string; primary: boolean }[] = [];
  switch (order.status) {
    case 'PENDING':
      actions.push({ label: 'Accept Order', next: 'ACCEPTED', icon: '✓', primary: true });
      actions.push({ label: 'Cancel', next: 'CANCELLED', icon: '✕', primary: false });
      break;
    case 'ACCEPTED':
      actions.push({ label: 'Start Preparing', next: 'PREPARING', icon: '🍳', primary: true });
      break;
    case 'PREPARING':
      actions.push({ label: 'Mark Ready', next: 'READY', icon: '✓', primary: true });
      break;
    case 'READY':
      actions.push({ label: 'Serve', next: 'SERVING', icon: '🍽', primary: true });
      break;
    case 'SERVING':
      actions.push({ label: 'Generate Bill', next: 'BILLING', icon: '📄', primary: true });
      break;
  }

  const meta = STATUS_META[order.status] ?? { label: order.status, bg: 'bg-slate-400', text: 'text-white' };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {order.orderType === 'DINE_IN' ? `Table ${order.tableNumber ?? '—'}` : 'Take Away'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.orderNumber} &middot; {timeAgo(order.createdAt)}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 text-xs hover:bg-slate-50">+</button>
                  <span className="text-sm font-bold text-slate-700">{item.quantity}</span>
                  <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 text-xs hover:bg-slate-50">−</button>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.menuItem.name}</p>
                  {item.customisations && Object.keys(item.customisations).length > 0 && (
                    <p className="text-[11px] text-blue-500 mt-0.5">
                      {Object.entries(item.customisations).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                  )}
                  {item.dietaryNotes && Object.keys(item.dietaryNotes).length > 0 && (
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      {Object.entries(item.dietaryNotes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800">{formatETB(item.totalPrice)}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
            <p className="text-xs text-amber-700"><span className="font-semibold">Note:</span> {order.notes}</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatETB(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax (15%)</span>
            <span>{formatETB(order.tax)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatETB(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>{formatETB(order.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-2">
          {actions.map((action) => (
            <button
              key={action.next}
              onClick={() => onStatusChange(order.id, action.next)}
              disabled={isUpdating}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                action.primary
                  ? 'bg-[#0A3D39] text-white hover:bg-[#0A3D39]/90'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── New Order Cart Panel ────────────────────────────────────────────────────

function NewOrderPanel({ cart, orderType, tableNumber, notes, cartTotal, onUpdateQty, onSetOrderType, onSetTable, onSetNotes, onSubmit, isPending }: {
  cart: CartItem[]; orderType: 'DINE_IN' | 'TAKEAWAY'; tableNumber: string; notes: string; cartTotal: number;
  onUpdateQty: (id: string, delta: number) => void; onSetOrderType: (t: 'DINE_IN' | 'TAKEAWAY') => void;
  onSetTable: (v: string) => void; onSetNotes: (v: string) => void; onSubmit: () => void; isPending: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">New Order</h2>
        <div className="flex gap-2 mt-3">
          {(['DINE_IN', 'TAKEAWAY'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onSetOrderType(type)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                orderType === type
                  ? 'bg-[#0A3D39] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'DINE_IN' ? 'Dine In' : 'Take Away'}
            </button>
          ))}
        </div>
        {orderType === 'DINE_IN' && (
          <input
            type="number" min={1} placeholder="Table number"
            value={tableNumber} onChange={(e) => onSetTable(e.target.value)}
            className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0A3D39]"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {cart.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Add items from the menu</p>
        ) : (
          <div className="space-y-3">
            {cart.map((ci) => (
              <div key={ci.menuItemId} className="flex items-center justify-between py-2 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onUpdateQty(ci.menuItemId, -1)} className="w-6 h-6 rounded border border-slate-200 text-slate-400 text-xs hover:bg-slate-50">−</button>
                    <span className="text-sm font-bold text-slate-700 w-5 text-center">{ci.quantity}</span>
                    <button onClick={() => onUpdateQty(ci.menuItemId, 1)} className="w-6 h-6 rounded border border-slate-200 text-slate-400 text-xs hover:bg-slate-50">+</button>
                  </div>
                  <span className="text-sm text-slate-700">{ci.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{formatETB(ci.price * ci.quantity)}</span>
              </div>
            ))}
          </div>
        )}
        <textarea
          placeholder="Notes (optional)" value={notes} onChange={(e) => onSetNotes(e.target.value)}
          rows={2}
          className="w-full mt-3 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#0A3D39]"
        />
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex justify-between text-sm text-slate-500 mb-1">
          <span>Subtotal</span><span>{formatETB(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>Tax (15%)</span><span>{formatETB(cartTotal * 0.15)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-200">
          <span>Total</span><span>{formatETB(cartTotal * 1.15)}</span>
        </div>
        <button
          onClick={onSubmit} disabled={isPending || cart.length === 0}
          className="w-full mt-4 py-3 rounded-xl bg-[#0A3D39] text-white text-sm font-bold hover:bg-[#0A3D39]/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          Send to kitchen
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OrdersBoard() {
  const { data: ordersData, isLoading } = useOrders({ limit: 100 });
  const { data: categoriesData } = useCategories();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();

  // Order queue state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mode, setMode] = useState<'orders' | 'new'>('orders');

  // New order state
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const orders: Order[] = useMemo(() => {
    if (!ordersData) return [];
    const raw = Array.isArray(ordersData) ? ordersData : (ordersData.data ?? []);
    return raw.filter((o: Order) => ACTIVE_STATUSES.includes(o.status));
  }, [ordersData]);

  const categories: Category[] = useMemo(() => {
    if (!categoriesData) return [];
    return Array.isArray(categoriesData) ? categoriesData : (categoriesData.data ?? []);
  }, [categoriesData]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedCatId = activeCatId ?? categories[0]?.id ?? null;
  const selectedCat = categories.find((c) => c.id === selectedCatId);

  const dineInCount = orders.filter((o) => o.orderType === 'DINE_IN').length;
  const takeawayCount = orders.filter((o) => o.orderType === 'TAKEAWAY').length;

  // Menu items (optionally filtered by search)
  const menuItems = useMemo(() => {
    const items = selectedCat?.menuItems ?? [];
    if (!search.trim()) return items;
    return items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [selectedCat, search]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItemId === item.id);
      if (existing) return prev.map((ci) => ci.menuItemId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) => prev.map((ci) => ci.menuItemId === menuItemId ? { ...ci, quantity: ci.quantity + delta } : ci).filter((ci) => ci.quantity > 0));
  }

  const cartTotal = cart.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);

  async function handleSubmit() {
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    if (orderType === 'DINE_IN' && !tableNumber.trim()) { toast.error('Enter a table number'); return; }
    try {
      await createOrder.mutateAsync({
        orderType, tableNumber: orderType === 'DINE_IN' ? Number(tableNumber) : undefined,
        notes: notes.trim() || undefined,
        items: cart.map((ci) => ({ menuItemId: ci.menuItemId, quantity: ci.quantity })),
      });
      setCart([]); setTableNumber(''); setNotes(''); setMode('orders');
      toast.success('Order sent to kitchen!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create order');
    }
  }

  function handleStatusChange(id: string, status: OrderStatus) {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => toast.success(`Order updated`),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed'),
    });
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col bg-slate-50 -m-6">
      {/* Top Section: Order Queue + Header */}
      <div className="bg-white border-b border-slate-200 px-6 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Order queue</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Order type tabs with counts */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-full px-1 py-1">
              <span className="px-3 py-1 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                Dine in <span className="bg-[#0A3D39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{dineInCount}</span>
              </span>
              <span className="px-3 py-1 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                Take away <span className="bg-slate-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{takeawayCount}</span>
              </span>
            </div>
            <button
              onClick={() => { setMode(mode === 'new' ? 'orders' : 'new'); setSelectedOrderId(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                mode === 'new'
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-[#0A3D39] text-white hover:bg-[#0A3D39]/90'
              }`}
            >
              <span className="text-lg leading-none">{mode === 'new' ? '←' : '+'}</span>
              {mode === 'new' ? 'Back to queue' : 'New order'}
            </button>
          </div>
        </div>

        {/* Horizontal scrolling order cards */}
        {isLoading ? (
          <p className="text-sm text-slate-400 py-4">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No active orders</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {orders.map((order) => (
              <QueueCard
                key={order.id}
                order={order}
                isSelected={selectedOrderId === order.id && mode === 'orders'}
                onClick={() => { setSelectedOrderId(order.id); setMode('orders'); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section: Menu + Right Panel */}
      <div className="flex flex-1 min-h-0">
        {/* Center: Menu */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200">
          {/* Menu header */}
          <div className="px-6 pt-4 pb-3 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-800">Menu</h2>
              <div className="relative">
                <input
                  type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-48 border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-[#0A3D39] pl-8"
                />
                <svg className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCatId(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  !activeCatId ? 'bg-[#0A3D39] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatId(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCatId === cat.id ? 'bg-[#0A3D39] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu items grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeCatId === null ? (
              // Show all categories with their items
              categories.map((cat, catIdx) => {
                const items = search.trim()
                  ? cat.menuItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
                  : cat.menuItems;
                if (items.length === 0) return null;
                return (
                  <div key={cat.id} className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">{cat.name}</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item) => {
                        const inCart = cart.find((ci) => ci.menuItemId === item.id);
                        const colorBar = CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length];
                        return (
                          <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-shadow relative">
                            {/* Color indicator bar */}
                            <div className={`h-1.5 w-12 rounded-full ${colorBar} mb-2`} />
                            <p className="text-sm font-semibold text-slate-800 mb-1 pr-8">{item.name}</p>
                            <p className="text-sm font-bold text-slate-700">{formatETB(item.price)}</p>
                            {/* +/- buttons */}
                            <div className="absolute top-3 right-3 flex flex-col gap-1">
                              <button
                                onClick={() => addToCart(item)}
                                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 text-sm flex items-center justify-center hover:bg-[#0A3D39] hover:text-white hover:border-[#0A3D39] transition-colors"
                              >
                                +
                              </button>
                              {inCart && (
                                <>
                                  <span className="text-xs font-bold text-center text-[#0A3D39]">{inCart.quantity}</span>
                                  <button
                                    onClick={() => updateQty(item.id, -1)}
                                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 text-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors"
                                  >
                                    −
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {menuItems.map((item) => {
                  const inCart = cart.find((ci) => ci.menuItemId === item.id);
                  const catIdx = categories.findIndex((c) => c.id === selectedCatId);
                  const colorBar = CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length];
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-shadow relative">
                      <div className={`h-1.5 w-12 rounded-full ${colorBar} mb-2`} />
                      <p className="text-sm font-semibold text-slate-800 mb-1 pr-8">{item.name}</p>
                      <p className="text-sm font-bold text-slate-700">{formatETB(item.price)}</p>
                      <div className="absolute top-3 right-3 flex flex-col gap-1">
                        <button
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 text-sm flex items-center justify-center hover:bg-[#0A3D39] hover:text-white hover:border-[#0A3D39] transition-colors"
                        >
                          +
                        </button>
                        {inCart && (
                          <>
                            <span className="text-xs font-bold text-center text-[#0A3D39]">{inCart.quantity}</span>
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 text-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors"
                            >
                              −
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {menuItems.length === 0 && (
                  <p className="col-span-3 text-sm text-slate-400 text-center py-8">No items found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Order Detail or New Order Cart */}
        <aside className="hidden lg:flex w-96 flex-shrink-0 bg-white flex-col">
          {mode === 'new' ? (
            <NewOrderPanel
              cart={cart} orderType={orderType} tableNumber={tableNumber} notes={notes} cartTotal={cartTotal}
              onUpdateQty={updateQty} onSetOrderType={setOrderType} onSetTable={setTableNumber}
              onSetNotes={setNotes} onSubmit={handleSubmit} isPending={createOrder.isPending}
            />
          ) : selectedOrder ? (
            <OrderDetailPanel
              order={selectedOrder}
              onStatusChange={handleStatusChange}
              isUpdating={updateStatus.isPending}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6">
              <svg className="w-16 h-16 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium">Select an order from the queue</p>
              <p className="text-xs mt-1">or create a new order</p>
            </div>
          )}
        </aside>

        {/* Mobile: floating cart/order button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          {mode === 'new' && cart.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={createOrder.isPending}
              className="flex items-center gap-2 bg-[#0A3D39] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold"
            >
              Send to kitchen ({cart.length})
            </button>
          )}
          {mode === 'orders' && selectedOrder && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 max-h-[50vh] overflow-y-auto">
              <p className="text-sm font-bold text-slate-800 mb-2">{selectedOrder.orderNumber}</p>
              {selectedOrder.items.map((item: any) => (
                <p key={item.id} className="text-xs text-slate-600">{item.quantity}x {item.menuItem.name}</p>
              ))}
              <p className="text-sm font-bold text-[#0A3D39] mt-2">{formatETB(selectedOrder.total)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
