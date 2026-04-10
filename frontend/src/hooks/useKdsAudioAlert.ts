import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/WebSocketContext';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Plays an audio chime when a `new_order` event arrives via WebSocket.
 * Only active for Kitchen (3) and Barista (2) roles.
 *
 * Place a `new-order.mp3` file in `public/sounds/`.
 */
export function useKdsAudioAlert() {
  const socket = useSocket();
  const roleId = useAuthStore((s) => s.user?.roleId);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Only fire for KDS roles
    if (!socket || (roleId !== 2 && roleId !== 3)) return;

    // Lazy-init audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/new-order.mp3');
    }

    const handleNewOrder = () => {
      const audio = audioRef.current;
      if (!audio) return;
      // Reset to start so rapid-fire orders each trigger the chime
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Browser may block autoplay until user interaction — safe to ignore
      });
    };

    socket.on('new_order', handleNewOrder);
    return () => {
      socket.off('new_order', handleNewOrder);
    };
  }, [socket, roleId]);
}
