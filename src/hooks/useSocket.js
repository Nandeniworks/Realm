import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../utils/apiClient';

export function useSocket(roomCode, user = null) {
  const [connectionState, setConnectionState] = useState('Connecting...');
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomCode) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://realm-backend-production.up.railway.app' : undefined);
    
    if (!socketUrl) {
      console.error("[Socket Client] VITE_SOCKET_URL and VITE_API_URL are both missing. Cannot connect to backend.");
      setConnectionState('Disconnected');
      return;
    }

    console.log(`[Socket Client] Connecting to ${socketUrl} for room ${roomCode}`);
    const socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      // Callback form: re-evaluated on every connect/reconnect attempt, so a
      // refreshed or newly-issued access token is always picked up. A plain
      // object here would freeze whatever token existed at the moment the
      // socket was first created -- meaning a reconnect after the 15-minute
      // access token expiry would silently authenticate as a Guest even for
      // a fully logged-in user.
      auth: (cb) => cb({ token: getAccessToken() })
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    const userPayload = user ? {
      id: user._id || user.id || user.uid,
      username: user.displayName || user.username || user.name
    } : null;

    socketInstance.on('connect', () => {
      console.log('Socket connected', socketInstance.id);
      console.log('Joining room', roomCode);
      setConnectionState('Connected');

      // Emit join-room immediately after connecting (Checklist Item 2)
      socketInstance.emit('join-room', roomCode, userPayload);
      socketInstance.emit('joinRealm', { code: roomCode, user: userPayload });
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket Client] Disconnected');
      setConnectionState('Disconnected');
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket Client] Connect error:', err.message);
      setConnectionState('Connecting...');
    });

    socketInstance.on('reconnect_attempt', () => {
      console.log('[Socket Client] Reconnect Attempt...');
      setConnectionState('Reconnecting...');
    });

    return () => {
      console.log('[Socket Client] Cleaning up connection');
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [roomCode]);

  return {
    socket: socket || socketRef.current,
    connectionState
  };
}
