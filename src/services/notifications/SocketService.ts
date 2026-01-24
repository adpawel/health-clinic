import { socketClient } from "../sync/socketClient";
import type { AppNotification, NotificationServiceAPI } from "./notification.types";

export const SocketNotificationService: NotificationServiceAPI = {
  connect(userId: string) {
    socketClient.connect(userId);
  },

  subscribe(onNotification: (n: AppNotification) => void) {
    const handler = (data: any) => {
        const notification: AppNotification = {
            type: data.type || 'INFO',
            message: data.message,
            timestamp: Date.now(),
        };
        onNotification(notification);
    };

    socketClient.on('notification', handler);

    return () => {
        socketClient.off('notification', handler);
    };
  },

  disconnect() {
  },

  async send(_notification: AppNotification) {
     console.warn("W wersji Node, powiadomienia wysyła backend automatycznie.");
  }
};