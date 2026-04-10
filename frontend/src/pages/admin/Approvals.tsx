import { useState } from 'react';
import { useApprovals, useDecideApproval } from '../../api/hooks';
import toast from 'react-hot-toast';

const TYPE_COLORS: Record<string, string> = {
  VOID: 'bg-red-100 text-red-800',
  DISCOUNT: 'bg-amber-100 text-amber-800',
  REFUND: 'bg-purple-100 text-purple-800',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function Approvals() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: approvals, isLoading } = useApprovals(filter);
  const decide = useDecideApproval();

  const handleDecide = (id: string, status: 'APPROVED' | 'REJECTED') => {
    decide.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Request ${status.toLowerCase()}`),
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
      },
    );
  };

  const filters = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A3D39] mb-6">Approval Requests</h1>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-[#0A3D39] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : !approvals?.length ? (
        <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-slate-500">
          No approval requests found
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval: any) => (
            <div
              key={approval.id}
              className="rounded-xl bg-white border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[approval.type] || 'bg-slate-100'}`}>
                    {approval.type}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[approval.status] || 'bg-slate-100'}`}>
                    {approval.status}
                  </span>
                  <span className="text-sm text-slate-500">
                    Order: <span className="font-medium text-slate-700">{approval.order?.orderNumber}</span>
                  </span>
                  {approval.order?.total && (
                    <span className="text-sm font-semibold text-[#0A3D39]">
                      {Number(approval.order.total).toFixed(2)} ETB
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(approval.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-slate-700 mb-2">
                <span className="font-medium">Reason:</span> {approval.reason}
              </p>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Requested by: {approval.requestedBy?.firstName} {approval.requestedBy?.lastName}
                  {approval.requestedBy?.role && (
                    <span className="ml-1 text-slate-400">({approval.requestedBy.role})</span>
                  )}
                  {approval.decidedBy && (
                    <span className="ml-3">
                      Decided by: {approval.decidedBy.firstName} {approval.decidedBy.lastName}
                    </span>
                  )}
                </div>

                {approval.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecide(approval.id, 'APPROVED')}
                      disabled={decide.isPending}
                      className="rounded-lg bg-[#0A3D39] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0A3D39]/90 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecide(approval.id, 'REJECTED')}
                      disabled={decide.isPending}
                      className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {approval.metadata && Object.keys(approval.metadata).length > 0 && (
                <div className="mt-2 text-xs text-slate-400 bg-slate-50 rounded p-2">
                  {JSON.stringify(approval.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
