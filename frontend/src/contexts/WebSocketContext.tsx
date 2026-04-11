import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore';
import { ROLE_SOCKET_ROOMS } from '../constants/roles';
import { queryClient } from '../App';

// ─── Context ────────────────────────────────────────────────────────────────
const WebSocketContext = createContext<Socket | null>(null);

export function useSocket(): Socket | null {
  return useContext(WebSocketContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────
const WS_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // No session → stay disconnected
    if (!token || !user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    // Connect to the /notifications namespace (must match backend gateway)
    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Join the role-specific room
      const room = ROLE_SOCKET_ROOMS[user.roleId];
      socket.emit('joinRoom', room);
    });

    // ── Global event listeners with cache invalidation ─────────────────

    socket.on('orderStatusChanged', (data: any) => {
      toast(`Order ${data.orderNumber ?? data.orderId} → ${data.status}`, { icon: '📋' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('newOrder', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('orderReady', (data: any) => {
      toast.success(`Order ${data.message ?? 'ready'}`, { icon: '✅' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('paymentReceived', (data: any) => {
      toast.success(data.message ?? 'Payment received', { icon: '💰' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    });

    socket.on('paymentFailed', (data: any) => {
      toast.error(`Payment failed: ${data.message ?? data.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('lowStock', (data: any) => {
      toast.error(`Low stock: ${data.itemName} (${data.currentQty} left)`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    socket.on('outOfStock', (data: any) => {
      toast.error(`Out of stock: ${data.itemName}`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    });

    socket.on('approvalNeeded', (data: any) => {
      toast(data.message ?? 'New approval needed', { icon: '⚠️' });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    });

    // Legacy event names (in case frontend uses them)
    socket.on('order_status_changed', (data: any) => {
      toast(`Order #${data.orderId} → ${data.status}`, { icon: '📋' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('low_stock_alert', (data: any) => {
      toast.error(`Low stock: ${data.item} (${data.remaining} left)`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    socket.on('payment_failed', (data: any) => {
      toast.error(`Payment failed for #${data.orderId}: ${data.reason}`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socket.on('connect_error', () => {
      // Silently handle — socket.io will retry automatically
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  return (
    <WebSocketContext.Provider value={socketRef.current}>
      {children}
    </WebSocketContext.Provider>
  );
}
