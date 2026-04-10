import { useState, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  useCategories,
  useMenuItems,
  useCreateOrder,
  useOrders,
} from '../../api/hooks';
import { useAuthStore } from '../../stores/useAuthStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  menuItems: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  prepTime?: number;
  category: { id: string; name: string };
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface PlacedOrder {
  id: string;
  orderNumber?: string;
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatETB(amount: number) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-800',
  CONFIRMED:  'bg-blue-100 text-blue-800',
  PREPARING:  'bg-orange-100 text-orange-800',
  READY:      'bg-teal-100 text-teal-800',
  DELIVERED:  'bg-green-100 text-green-800',
  COMPLETED:  'bg-green-100 text-green-800',
  CANCELLED:  'bg-red-100 text-red-800',
};

// Generates a deterministic pastel background color from a string
function avatarColor(str: string) {
  const COLORS = [
    'bg-teal-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ─── Menu Item Card ───────────────────────────────────────────────────────────

interface MenuItemCardProps {
  item: MenuItem;
  cartQty: number;
  onAdd: () => void;
  onRemove: () => void;
}

function MenuItemCard({ item, cartQty, onAdd, onRemove }: MenuItemCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-200">
      {/* Image / Avatar */}
      <div className="relative h-36 sm:h-44 w-full overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`h-full w-full flex items-center justify-center ${avatarColor(item.name)}`}>
            <span className="text-white text-4xl sm:text-5xl font-bold select-none">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Unavailable
            </span>
          </div>
        )}
        {item.prepTime != null && item.isAvailable && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {item.prepTime} min
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-gray-500 text-xs sm:text-sm mt-1 line-clamp-2 flex-1">{item.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[#0A3D39] font-bold text-sm sm:text-lg shrink-0">{formatETB(item.price)}</span>

          {item.isAvailable ? (
            cartQty === 0 ? (
              <button
                onClick={onAdd}
                className="bg-[#0A3D39] hover:bg-[#0d4f4a] text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-150 shrink-0"
              >
                Add
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={onRemove}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-[#0A3D39] text-[#0A3D39] flex items-center justify-center font-bold hover:bg-[#0A3D39] hover:text-white transition-colors"
                  aria-label="Remove one"
                >
                  −
                </button>
                <span className="w-4 sm:w-5 text-center font-semibold text-gray-800 text-sm">{cartQty}</span>
                <button
                  onClick={onAdd}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0A3D39] text-white flex items-center justify-center font-bold hover:bg-[#0d4f4a] transition-colors"
                  aria-label="Add one"
                >
                  +
                </button>
              </div>
            )
          ) : (
            <button
              disabled
              className="bg-gray-200 text-gray-400 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 rounded-full cursor-not-allowed shrink-0"
            >
              Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cart Panel ───────────────────────────────────────────────────────────────

interface CartPanelProps {
  cart: CartItem[];
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
  onOrderPlaced: (order: PlacedOrder) => void;
}

function CartPanel({ cart, onAdd, onRemove, onClear, onOrderPlaced }: CartPanelProps) {
  const [orderType, setOrderType] = useState<'TAKEAWAY' | 'DINE_IN'>('TAKEAWAY');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  // Pickup time — only used when orderType === 'TAKEAWAY'
  const [pickupTime, setPickupTime] = useState('');
  const createOrder = useCreateOrder();

  const subtotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0),
    [cart],
  );

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    if (orderType === 'DINE_IN' && (!tableNumber || isNaN(Number(tableNumber)))) {
      toast.error('Please enter a valid table number for Dine-In.');
      return;
    }

    // Build final notes string, prepending pickup time when set
    let finalNotes = notes.trim();
    if (orderType === 'TAKEAWAY' && pickupTime) {
      const pickupLine = `Pickup time: ${pickupTime}`;
      finalNotes = finalNotes ? `${pickupLine}\n${finalNotes}` : pickupLine;
    }

    const payload: Parameters<typeof createOrder.mutateAsync>[0] = {
      orderType,
      items: cart.map((ci) => ({ menuItemId: ci.menuItem.id, quantity: ci.quantity })),
      ...(finalNotes ? { notes: finalNotes } : {}),
      ...(orderType === 'DINE_IN' ? { tableNumber: Number(tableNumber) } : {}),
    };

    try {
      const result = await createOrder.mutateAsync(payload);
      onOrderPlaced({ id: result.id, orderNumber: result.orderNumber, total: subtotal });
      onClear();
      setNotes('');
      setTableNumber('');
      setPickupTime('');
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to place order. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
        <p className="text-sm text-gray-500">{cart.length === 0 ? 'No items yet' : `${cart.reduce((s, ci) => s + ci.quantity, 0)} item(s)`}</p>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-16 h-16 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm font-medium">Your cart is empty</p>
            <p className="text-xs mt-1">Add items from the menu</p>
          </div>
        ) : (
          cart.map((ci) => (
            <div key={ci.menuItem.id} className="flex items-center gap-3">
              {/* Mini avatar */}
              <div className={`w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden ${!ci.menuItem.imageUrl ? avatarColor(ci.menuItem.name) : ''}`}>
                {ci.menuItem.imageUrl ? (
                  <img src={ci.menuItem.imageUrl} alt={ci.menuItem.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {ci.menuItem.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{ci.menuItem.name}</p>
                <p className="text-xs text-gray-500">{formatETB(ci.menuItem.price)} each</p>
              </div>
              {/* Qty controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onRemove(ci.menuItem.id)}
                  className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center text-xs hover:border-[#0A3D39] hover:text-[#0A3D39] transition-colors"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm font-semibold">{ci.quantity}</span>
                <button
                  onClick={() => onAdd(ci.menuItem)}
                  className="w-6 h-6 rounded-full bg-[#0A3D39] text-white flex items-center justify-center text-xs hover:bg-[#0d4f4a] transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order options */}
      <div className="px-5 pt-3 pb-4 border-t border-gray-100 space-y-4">
        {/* Order type */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Type</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['TAKEAWAY', 'DINE_IN'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  orderType === type
                    ? 'bg-[#0A3D39] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type === 'TAKEAWAY' ? 'Pickup' : 'Dine-In'}
              </button>
            ))}
          </div>
        </div>

        {/* Pickup time — shown for TAKEAWAY orders */}
        {orderType === 'TAKEAWAY' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Pickup Time <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A3D39]/30 focus:border-[#0A3D39] bg-white"
            />
            {pickupTime && (
              <p className="text-xs text-[#0A3D39] mt-1 font-medium">
                Will be noted as "Pickup time: {pickupTime}"
              </p>
            )}
          </div>
        )}

        {/* Table number */}
        {orderType === 'DINE_IN' && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              Table Number
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 5"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A3D39]/30 focus:border-[#0A3D39]"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Special Requests (optional)
          </label>
          <textarea
            rows={2}
            placeholder="Allergies, extra sauce, no onions…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0A3D39]/30 focus:border-[#0A3D39]"
          />
        </div>

        {/* Subtotal */}
        <div className="flex justify-between text-sm font-semibold text-gray-800 pt-1">
          <span>Subtotal</span>
          <span className="text-[#0A3D39]">{formatETB(subtotal)}</span>
        </div>

        {/* Place order */}
        <button
          onClick={handlePlaceOrder}
          disabled={cart.length === 0 || createOrder.isPending}
          className="w-full bg-[#0A3D39] hover:bg-[#0d4f4a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors duration-150 flex items-center justify-center gap-2"
        >
          {createOrder.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Placing Order…
            </>
          ) : (
            'Place Order'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Success Banner ───────────────────────────────────────────────────────────

interface SuccessBannerProps {
  order: PlacedOrder;
  onDismiss: () => void;
}

function SuccessBanner({ order, onDismiss }: SuccessBannerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
        {/* Checkmark */}
        <div className="mx-auto w-20 h-20 bg-[#0A3D39]/10 rounded-full flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-[#0A3D39]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        {order.orderNumber && (
          <p className="text-gray-500 text-sm mb-1">Order number</p>
        )}
        {order.orderNumber && (
          <p className="text-3xl font-extrabold text-[#0A3D39] mb-4 tracking-wider">
            #{order.orderNumber}
          </p>
        )}
        <p className="text-gray-600 text-sm mb-6">
          Total: <span className="font-semibold text-gray-800">{formatETB(order.total)}</span>
        </p>
        <p className="text-gray-500 text-xs mb-6">
          We'll start preparing your order right away. You can track its status in your order history.
        </p>
        <button
          onClick={onDismiss}
          className="w-full bg-[#0A3D39] text-white font-semibold py-3 rounded-xl hover:bg-[#0d4f4a] transition-colors"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}

// ─── Order History ────────────────────────────────────────────────────────────

interface OrderHistoryProps {
  onReorder: (items: { menuItem: MenuItem; quantity: number }[]) => void;
}

function OrderHistory({ onReorder }: OrderHistoryProps) {
  const [open, setOpen] = useState(false);
  const { data: ordersData, isLoading } = useOrders();

  // Handle both paginated ({ data: [...] }) and array responses
  const orders: any[] = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (Array.isArray(ordersData.data)) return ordersData.data;
    return [];
  }, [ordersData]);

  const handleReorder = (order: any) => {
    if (!order.items?.length) return;

    // Build cart-compatible items from the past order's items array.
    // Each past order item has: { menuItem: MenuItem, quantity: number }
    const reorderItems: { menuItem: MenuItem; quantity: number }[] = order.items
      .filter((i: any) => i.menuItem && i.menuItem.id)
      .map((i: any) => ({
        menuItem: i.menuItem as MenuItem,
        quantity: i.quantity ?? 1,
      }));

    if (reorderItems.length === 0) return;

    onReorder(reorderItems);
    toast.success('Items added to cart');
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0A3D39]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="font-semibold text-gray-800">Order History</span>
          {orders.length > 0 && (
            <span className="bg-[#0A3D39] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-5 py-8 text-center">
              <div className="w-8 h-8 border-2 border-[#0A3D39] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading history…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400">
              <p className="text-sm">No orders yet. Your order history will appear here.</p>
            </div>
          ) : (
            orders.map((order: any) => (
              <div key={order.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">
                        {order.orderNumber ? `#${order.orderNumber}` : order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {order.orderType?.replace('_', '-').toLowerCase()}
                      </span>
                    </div>
                    {order.createdAt && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                    )}
                    {order.items?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {order.items.map((i: any) => `${i.menuItem?.name ?? 'Item'} ×${i.quantity}`).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Right column: total + reorder button */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-[#0A3D39] text-sm whitespace-nowrap">
                      {formatETB(order.total ?? order.totalAmount ?? 0)}
                    </p>
                    {order.items?.length > 0 && (
                      <button
                        onClick={() => handleReorder(order)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#0A3D39] border border-[#0A3D39] rounded-full px-2.5 py-1 hover:bg-[#0A3D39] hover:text-white transition-colors duration-150 whitespace-nowrap"
                        title="Add all items from this order to your cart"
                      >
                        {/* Refresh/reorder icon */}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reorder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerMenu() {
  const user = useAuthStore((s) => s.user);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const { data: categoriesRaw, isLoading: catsLoading } = useCategories();
  const { data: menuItemsRaw, isLoading: itemsLoading } = useMenuItems();

  const categories: Category[] = useMemo(() => {
    if (!categoriesRaw) return [];
    if (Array.isArray(categoriesRaw)) return categoriesRaw;
    if (Array.isArray(categoriesRaw.data)) return categoriesRaw.data;
    return [];
  }, [categoriesRaw]);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!menuItemsRaw) return [];
    if (Array.isArray(menuItemsRaw)) return menuItemsRaw;
    if (Array.isArray(menuItemsRaw.data)) return menuItemsRaw.data;
    return [];
  }, [menuItemsRaw]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return menuItems;
    return menuItems.filter((item) => item.category?.id === activeCategory);
  }, [menuItems, activeCategory]);

  const cartMap = useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((ci) => { map[ci.menuItem.id] = ci.quantity; });
    return map;
  }, [cartItems]);

  const cartCount = cartItems.reduce((s, ci) => s + ci.quantity, 0);

  const addToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci,
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((ci) => ci.menuItem.id !== itemId);
      return prev.map((ci) =>
        ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci,
      );
    });
  };

  const clearCart = () => setCartItems([]);

  // One-tap reorder: merge all items from a past order into the current cart,
  // respecting quantities (adds on top of whatever is already in the cart).
  const handleReorder = (items: { menuItem: MenuItem; quantity: number }[]) => {
    setCartItems((prev) => {
      let next = [...prev];
      items.forEach(({ menuItem, quantity }) => {
        const idx = next.findIndex((ci) => ci.menuItem.id === menuItem.id);
        if (idx >= 0) {
          next = next.map((ci, i) =>
            i === idx ? { ...ci, quantity: ci.quantity + quantity } : ci,
          );
        } else {
          next = [...next, { menuItem, quantity }];
        }
      });
      return next;
    });
  };

  const isLoading = catsLoading || itemsLoading;

  return (
    // Extra bottom padding on mobile so the sticky cart bar doesn't cover content
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* ── Header ── */}
      <header className="bg-[#0A3D39] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Wezete</h1>
            <p className="text-teal-200 text-xs mt-0.5 hidden sm:block">
              {user ? `Welcome, ${user.name}` : 'Browse our menu'}
            </p>
          </div>

          {/* Mobile: compact welcome text inline */}
          {user && (
            <span className="sm:hidden text-teal-200 text-xs truncate max-w-[140px]">
              Hi, {user.name}
            </span>
          )}

          {/* Mobile cart icon button in header (sm and below) */}
          <button
            onClick={() => setMobileCartOpen(true)}
            className="lg:hidden relative bg-white/10 hover:bg-white/20 transition-colors rounded-full p-2"
            aria-label="Open cart"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-[#0A3D39] text-xs font-extrabold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex gap-6">
        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">
          {/* Category filter pills — scrolls horizontally on all screen sizes */}
          <div className="overflow-x-auto pb-2 -mx-1 mb-5 sm:mb-6 scrollbar-none">
            <div className="flex gap-2 px-1 w-max">
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-150 ${
                  activeCategory === 'all'
                    ? 'bg-[#0A3D39] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#0A3D39] hover:text-[#0A3D39]'
                }`}
              >
                All Items
              </button>
              {categories
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-150 ${
                      activeCategory === cat.id
                        ? 'bg-[#0A3D39] text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#0A3D39] hover:text-[#0A3D39]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Loading skeleton — 1 col mobile, 2 sm, 3 lg */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 sm:h-44 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-8 bg-gray-200 rounded-full w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">No items in this category</p>
              <p className="text-sm mt-1">Try selecting a different category</p>
            </div>
          )}

          {/* Menu grid — 1 col mobile, 2 sm, 3 lg */}
          {!isLoading && filteredItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  cartQty={cartMap[item.id] ?? 0}
                  onAdd={() => addToCart(item)}
                  onRemove={() => removeFromCart(item.id)}
                />
              ))}
            </div>
          )}

          {/* Order history */}
          {!isLoading && (
            <div className="mt-10">
              <OrderHistory onReorder={handleReorder} />
            </div>
          )}
        </main>

        {/* ── Desktop cart sidebar ── */}
        <aside className="hidden lg:flex flex-col w-80 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <CartPanel
              cart={cartItems}
              onAdd={addToCart}
              onRemove={removeFromCart}
              onClear={clearCart}
              onOrderPlaced={(order) => setPlacedOrder(order)}
            />
          </div>
        </aside>
      </div>

      {/* ── Mobile sticky bottom cart bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
        <button
          onClick={() => setMobileCartOpen(true)}
          className="w-full flex items-center justify-between bg-[#0A3D39] hover:bg-[#0d4f4a] text-white font-semibold rounded-xl px-5 py-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>
              {cartCount === 0 ? 'Cart is empty' : `View Cart · ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          {cartCount > 0 && (
            <span className="bg-amber-400 text-[#0A3D39] text-xs font-extrabold rounded-full px-2.5 py-0.5">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile cart drawer (slides up from right) ── */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileCartOpen(false)}
          />
          {/* Panel — full height slide-in from right on sm+, bottom sheet feel on xs */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#0A3D39]">
              <h2 className="text-white font-bold">Your Cart</h2>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Close cart"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartPanel
                cart={cartItems}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onClear={clearCart}
                onOrderPlaced={(order) => {
                  setPlacedOrder(order);
                  setMobileCartOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Success overlay ── */}
      {placedOrder && (
        <SuccessBanner
          order={placedOrder}
          onDismiss={() => setPlacedOrder(null)}
        />
      )}

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0A3D39',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
}
