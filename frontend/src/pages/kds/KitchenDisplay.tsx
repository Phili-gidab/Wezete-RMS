import { useEffect, useState } from 'react';
import { useOrders, useUpdateOrderStatus } from '../../api/hooks';
import { useSocket } from '../../contexts/WebSocketContext';
import { useKdsAudioAlert } from '../../hooks/useKdsAudioAlert';

const STATUS_FLOW: Record<string, string> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
  PREPARING: 'bg-orange-100 text-orange-800 border-orange-300',
  READY: 'bg-green-100 text-green-800 border-green-300',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
};

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function KitchenDisplay() {
  useKdsAudioAlert();
  const socket = useSocket();
  const [, setNow] = useState(Date.now());

  // Fetch active orders (not COMPLETE/CANCELLED)
  const { data: pendingOrders } = useOrders({ status: 'PENDING', limit: 50 });
  const { data: acceptedOrders } = useOrders({ status: 'ACCEPTED', limit: 50 });
  const { data: preparingOrders } = useOrders({ status: 'PREPARING', limit: 50 });
  const { data: readyOrders } = useOrders({ status: 'READY', limit: 50 });
  const updateStatus = useUpdateOrderStatus();

  // Update timers every 30s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const allOrders = [
    ...(pendingOrders?.data || []),
    ...(acceptedOrders?.data || []),
    ...(preparingOrders?.data || []),
    ...(readyOrders?.data || []),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleAdvance = (orderId: string, currentStatus: string) => {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (nextStatus) {
      updateStatus.mutate({ id: orderId, status: nextStatus });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {allOrders.length} active order{allOrders.length !== 1 ? 's' : ''}
          </span>
          <span className={`h-2 w-2 rounded-full ${socket ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
      </div>

      {allOrders.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-xl text-slate-500">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const isUrgent = elapsed > 15;
            const statusColor = STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-800';
            const nextStatus = STATUS_FLOW[order.status];

            return (
              <div
                key={order.id}
                className={`rounded-xl border-2 bg-white p-4 transition-all ${
                  isUrgent ? 'border-red-400 shadow-lg shadow-red-500/20' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-lg font-bold text-slate-800">
                      {order.orderNumber}
                    </span>
                    {order.tableNumber && (
                      <span className="ml-2 text-sm text-slate-500">
                        Table {order.tableNumber}
                      </span>
                    )}
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColor}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>

                {/* Timer */}
                <div className={`text-sm font-mono mb-3 ${isUrgent ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                  {elapsed}m ago
                </div>

                {/* Items */}
                <div className="space-y-1.5 mb-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                        {item.quantity}
                      </span>
                      <span className="text-sm text-slate-700">{item.menuItem.name}</span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 mb-3">
                    Note: {order.notes}
                  </p>
                )}

                {/* Action button */}
                {nextStatus && (
                  <button
                    onClick={() => handleAdvance(order.id, order.status)}
                    disabled={updateStatus.isPending}
                    className="w-full rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0A3D39]/90 disabled:opacity-50"
                  >
                    {order.status === 'PENDING' && 'Accept Order'}
                    {order.status === 'ACCEPTED' && 'Start Preparing'}
                    {order.status === 'PREPARING' && 'Mark Ready'}
                  </button>
                )}

                {order.status === 'READY' && (
                  <div className="text-center text-sm font-semibold text-green-600 py-2">
                    Ready for pickup
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
