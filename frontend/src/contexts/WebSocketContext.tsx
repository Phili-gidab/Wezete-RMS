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

    // ── Global event listeners ──────────────────────────────────────────
    socket.on('order_status_changed', (data: { orderId: string; status: string }) => {
      toast(`Order #${data.orderId} → ${data.status}`, { icon: '📋' });
    });

    socket.on('low_stock_alert', (data: { item: string; remaining: number }) => {
      toast.error(`Low stock: ${data.item} (${data.remaining} left)`);
    });

    socket.on('payment_failed', (data: { orderId: string; reason: string }) => {
      toast.error(`Payment failed for #${data.orderId}: ${data.reason}`);
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
