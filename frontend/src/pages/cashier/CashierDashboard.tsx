import { useState } from 'react';
import { useOrders, useCreatePayment, useUpdateOrderStatus } from '../../api/hooks';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  BILLING: 'bg-indigo-100 text-indigo-800',
  PAYMENT: 'bg-purple-100 text-purple-800',
  COMPLETE: 'bg-emerald-100 text-emerald-800',
};

export default function CashierDashboard() {
  const { data: billingOrders } = useOrders({ status: 'BILLING', limit: 50 });
  const { data: paymentOrders } = useOrders({ status: 'PAYMENT', limit: 50 });
  const { data: recentComplete } = useOrders({ status: 'COMPLETE', limit: 10 });
  const createPayment = useCreatePayment();
  const updateStatus = useUpdateOrderStatus();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingPayments = [
    ...(billingOrders?.data || []),
    ...(paymentOrders?.data || []),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleGenerateBill = (orderId: string) => {
    updateStatus.mutate(
      { id: orderId, status: 'PAYMENT' },
      {
        onSuccess: () => toast.success('Bill generated'),
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
      },
    );
  };

  const handlePayment = async (orderId: string, method: 'CASH' | 'CHAPA') => {
    setProcessingId(orderId);
    try {
      const result = await createPayment.mutateAsync({ orderId, method });
      if (method === 'CHAPA' && result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank');
        toast.success('Chapa checkout opened');
      } else {
        toast.success('Payment processed successfully');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39] mb-6">Cashier Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Payments */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Pending Payments</h2>

          {pendingPayments.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-slate-500">
              No pending payments
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl bg-white border border-slate-200 shadow-sm p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-800">
                        {order.orderNumber}
                      </span>
                      {order.tableNumber && (
                        <span className="text-sm text-slate-500">
                          Table {order.tableNumber}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-slate-100'}`}>
                        {order.status}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-[#0A3D39]">
                      {Number(order.total).toFixed(2)} ETB
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="mb-3 text-sm text-slate-600">
                    {order.items.map((item: any) => (
                      <span key={item.id} className="mr-3">
                        {item.quantity}x {item.menuItem.name}
                      </span>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex gap-4 text-xs text-slate-500 mb-3">
                    <span>Subtotal: {Number(order.subtotal).toFixed(2)}</span>
                    <span>Tax: {Number(order.tax).toFixed(2)}</span>
                    {Number(order.discount) > 0 && (
                      <span className="text-green-600">Discount: -{Number(order.discount).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {order.status === 'BILLING' && (
                      <button
                        onClick={() => handleGenerateBill(order.id)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Generate Bill
                      </button>
                    )}
                    {order.status === 'PAYMENT' && (
                      <>
                        <button
                          onClick={() => handlePayment(order.id, 'CASH')}
                          disabled={processingId === order.id}
                          className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90 disabled:opacity-50"
                        >
                          {processingId === order.id ? 'Processing...' : 'Cash Payment'}
                        </button>
                        <button
                          onClick={() => handlePayment(order.id, 'CHAPA')}
                          disabled={processingId === order.id}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Pay via Chapa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Completed</h2>
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100">
            {(recentComplete?.data || []).length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No completed orders yet</p>
            ) : (
              (recentComplete?.data || []).map((order: any) => (
                <div key={order.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-slate-700">{order.orderNumber}</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {Number(order.total).toFixed(2)} ETB
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
