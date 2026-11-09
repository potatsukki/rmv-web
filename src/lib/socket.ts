import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
// The newest access token. Every (re)connect reads it, so after a token refresh the socket does
// not keep retrying with an expired one and real-time notifications keep arriving.
let latestAccessToken: string | null = null;

export function connectSocket(accessToken?: string | null): Socket | null {
  latestAccessToken = accessToken ?? null;
  if (!accessToken) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket?.connected) return socket;

  // If socket exists but disconnected, just reconnect (auth reads the newest token)
  if (socket) {
    socket.connect();
    return socket;
  }

  socket = io('/', {
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    auth: (cb) => cb({ token: latestAccessToken }),
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  // A rejected handshake (e.g. an expired token) is not retried by socket.io itself; try again
  // once a newer token is available.
  socket.on('connect_error', () => {
    const rejectedToken = latestAccessToken;
    if (socket && !socket.active) {
      setTimeout(() => {
        if (socket && !socket.connected && latestAccessToken && latestAccessToken !== rejectedToken) socket.connect();
      }, 5000);
    }
  });

  socket.on('reconnect', (attempt) => {
    console.log('Socket reconnected after', attempt, 'attempts');
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
