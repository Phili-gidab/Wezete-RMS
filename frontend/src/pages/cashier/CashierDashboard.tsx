import { useState } from 'react';
import {
  useOrders,
  useCreatePayment,
  useUpdateOrderStatus,
  useCreateApproval,
  useDownloadReceipt,
  useSalesReport,
} from '../../api/hooks';
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
  const { data: salesReport } = useSalesReport();

  const createPayment = useCreatePayment();
  const updateStatus = useUpdateOrderStatus();
  const createApproval = useCreateApproval();
  const downloadReceipt = useDownloadReceipt();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);

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

  const handleRefundRequest = async (orderId: string, orderNumber: string) => {
    const reason = window.prompt(
      `Enter reason for refund request on order ${orderNumber}:`,
    );
    if (!reason || !reason.trim()) return;

    setRefundingId(orderId);
    try {
      await createApproval.mutateAsync({ type: 'REFUND', orderId, reason: reason.trim() });
      toast.success('Refund request submitted for admin review');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit refund request');
    } finally {
      setRefundingId(null);
    }
  };

  const handleDownloadReceipt = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      await downloadReceipt.mutateAsync(orderId);
      toast.success('Receipt downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  const cashTotal = salesReport?.byMethod?.cash ?? 0;
  const chapaTotal = salesReport?.byMethod?.chapa ?? 0;
  const totalOrders = salesReport?.totalOrders ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39] mb-6">Cashier Dashboard</h1>

      {/* Main grid — single column on mobile, 3-col on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending Payments — full width on mobile, 2/3 on lg */}
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-lg font-bold text-slate-800">
                        {order.orderNumber}
                      </span>
                      {order.tableNumber && (
                        <span className="text-sm text-slate-500">
                          Table {order.tableNumber}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[order.status] || 'bg-slate-100'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-[#0A3D39]">
                      {Number(order.total).toFixed(2)} ETB
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="mb-3 text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                    {order.items.map((item: any) => (
                      <span key={item.id}>
                        {item.quantity}x {item.menuItem.name}
                      </span>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                    <span>Subtotal: {Number(order.subtotal).toFixed(2)}</span>
                    <span>Tax: {Number(order.tax).toFixed(2)}</span>
                    {Number(order.discount) > 0 && (
                      <span className="text-green-600">
                        Discount: -{Number(order.discount).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'BILLING' && (
                      <button
                        onClick={() => handleGenerateBill(order.id)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                      >
                        Generate Bill
                      </button>
                    )}
                    {order.status === 'PAYMENT' && (
                      <>
                        <button
                          onClick={() => handlePayment(order.id, 'CASH')}
                          disabled={processingId === order.id}
                          className="rounded-lg bg-[#0A3D39] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90 disabled:opacity-50 transition-colors"
                        >
                          {processingId === order.id ? 'Processing...' : 'Cash Payment'}
                        </button>
                        <button
                          onClick={() => handlePayment(order.id, 'CHAPA')}
                          disabled={processingId === order.id}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

        {/* Recent Completed — full width on mobile, 1/3 on lg */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Completed</h2>
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm divide-y divide-slate-100">
            {(recentComplete?.data || []).length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No completed orders yet</p>
            ) : (
              (recentComplete?.data || []).map((order: any) => (
                <div key={order.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-slate-700">
                      {order.orderNumber}
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {Number(order.total).toFixed(2)} ETB
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </p>

                  {/* Per-order actions */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      onClick={() => handleDownloadReceipt(order.id)}
                      disabled={downloadingId === order.id}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                      {downloadingId === order.id ? 'Downloading…' : 'Receipt'}
                    </button>
                    <button
                      onClick={() => handleRefundRequest(order.id, order.orderNumber)}
                      disabled={refundingId === order.id}
                      className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {refundingId === order.id ? 'Submitting…' : 'Request Refund'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── End-of-Shift Reconciliation Panel ───────────────────────────── */}
      <div className="mt-8 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setReconciliationOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          aria-expanded={reconciliationOpen}
        >
          <span className="font-semibold text-[#0A3D39] text-base">
            End-of-Shift Reconciliation
          </span>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${
              reconciliationOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Collapsible body */}
        {reconciliationOpen && (
          <div className="border-t border-slate-200 px-5 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Cash collected */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">
                  Cash Collected
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  {Number(cashTotal).toFixed(2)}
                  <span className="text-sm font-normal text-emerald-500 ml-1">ETB</span>
                </p>
              </div>

              {/* Chapa payments */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                  Chapa Payments
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {Number(chapaTotal).toFixed(2)}
                  <span className="text-sm font-normal text-blue-500 ml-1">ETB</span>
                </p>
              </div>

              {/* Total orders */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Orders Processed
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {totalOrders}
                  <span className="text-sm font-normal text-slate-400 ml-1">today</span>
                </p>
              </div>
            </div>

            {/* Totals row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div>
                <span className="text-sm text-slate-500">Total Revenue Today: </span>
                <span className="text-lg font-bold text-[#0A3D39]">
                  {Number(salesReport?.totalRevenue ?? 0).toFixed(2)} ETB
                </span>
              </div>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-[#0A3D39] px-5 py-2 text-sm font-medium text-white hover:bg-[#0A3D39]/90 transition-colors print:hidden"
              >
                Print Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
