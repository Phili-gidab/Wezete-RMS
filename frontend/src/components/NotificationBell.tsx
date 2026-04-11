import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../api/hooks';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: countData } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = typeof countData === 'number' ? countData : 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeColors: Record<string, string> = {
    NEW_ORDER: 'bg-blue-100 text-blue-700',
    ORDER_READY: 'bg-green-100 text-green-700',
    PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700',
    PAYMENT_FAILED: 'bg-red-100 text-red-700',
    LOW_STOCK: 'bg-orange-100 text-orange-700',
    OUT_OF_STOCK: 'bg-red-100 text-red-700',
    APPROVAL_NEEDED: 'bg-amber-100 text-amber-700',
    ORDER_STATUS_CHANGED: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-lg z-50">
          <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-[#0A3D39] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {!notifications || notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.slice(0, 30).map((n: any) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[n.type] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {n.type?.replace(/_/g, ' ')}
                    </span>
                    {!n.isRead && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-1">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
