import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private pendingHandlers: Array<{ event: string; callback: (data: any) => void }> = [];

  connect(userId?: string) {
    if (this.socket && this.socket.connected) {
      return; 
    }

    if (this.socket) {
        this.socket.disconnect();
    }

    this.socket = io("/", {
      path: '/socket.io/',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      query: userId ? { userId } : {},
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.flushPendingHandlers();
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err.message);
    });

    this.flushPendingHandlers();
  }

  private flushPendingHandlers() {
    if (!this.socket) return;

    this.pendingHandlers.forEach(({ event, callback }) => {
      this.socket?.off(event, callback); 
      this.socket?.on(event, callback);
    });
    
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  on(event: string, callback: (data: any) => void) {
    this.pendingHandlers.push({ event, callback });

    if (this.socket) {
      this.socket.on(event, callback);
    } else {
        console.log(`[Socket] Listener dla '${event}' zakolejkowany (brak połączenia)`);
    }
  }

  off(event: string, callback: (data: any) => void) {
    this.pendingHandlers = this.pendingHandlers.filter(
        h => h.event !== event || h.callback !== callback
    );

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketClient = new SocketClient();