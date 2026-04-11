import { useOrders } from '../../api/hooks';
import { useAuthStore } from '../../stores/useAuthStore';

const STATUS_STEPS = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVING', 'BILLING', 'PAYMENT', 'COMPLETE'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  ACCEPTED: 'bg-blue-400',
  PREPARING: 'bg-indigo-500',
  READY: 'bg-green-500',
  SERVING: 'bg-emerald-500',
  BILLING: 'bg-orange-400',
  PAYMENT: 'bg-amber-500',
  COMPLETE: 'bg-green-600',
  CANCELLED: 'bg-red-500',
};

export default function OrderTracking() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useOrders({ userId: user?.id });

  const orders = data?.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39] mb-6">My Orders</h1>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-2">No orders yet</p>
          <a
            href="/customer/menu"
            className="text-sm text-[#0A3D39] hover:underline font-medium"
          >
            Browse the menu
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const stepIndex = STATUS_STEPS.indexOf(order.status);
            const isCancelled = order.status === 'CANCELLED';
            const isComplete = order.status === 'COMPLETE';

            return (
              <div key={order.id} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{order.orderNumber}</h3>
                    <p className="text-xs text-slate-500">
                      {order.orderType.replace('_', ' ')}
                      {order.tableNumber ? ` - Table ${order.tableNumber}` : ''}
                      {' | '}
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${STATUS_COLORS[order.status] ?? 'bg-slate-400'}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Progress bar */}
                {!isCancelled && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1">
                      {STATUS_STEPS.map((step, i) => (
                        <div key={step} className="flex-1 flex items-center">
                          <div
                            className={`h-2 w-full rounded-full ${
                              i <= stepIndex
                                ? isComplete
                                  ? 'bg-green-500'
                                  : 'bg-[#0A3D39]'
                                : 'bg-slate-200'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">Placed</span>
                      <span className="text-[10px] text-slate-400">Complete</span>
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs text-red-600 font-medium">This order has been cancelled</p>
                  </div>
                )}

                {/* Items */}
                <div className="border-t border-slate-100 pt-3">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-1">
                      <span className="text-sm text-slate-700">
                        {item.quantity}x {item.menuItem?.name ?? 'Item'}
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        ETB {Number(item.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-2 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-800">Total</span>
                    <span className="text-sm font-bold text-[#0A3D39]">
                      ETB {Number(order.total).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Pickup time */}
                {order.pickupTime && (
                  <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                    <p className="text-xs text-blue-700">
                      Pickup time: {new Date(order.pickupTime).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
