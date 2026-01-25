import { isFirebaseAuth } from '../../services/backendSelector';
import { FirebaseNotificationService } from './FirebaseNotificationService';
import type { NotificationServiceAPI } from './notification.types';
import { SocketNotificationService } from './SocketService';

export const notificationService: NotificationServiceAPI = {
  connect(userId: string) {
    if (isFirebaseAuth()) {
      return FirebaseNotificationService.connect(userId);
    } else {
      return SocketNotificationService.connect(userId);
    }
  },

  disconnect() {
    if (isFirebaseAuth()) {
      return FirebaseNotificationService.disconnect();
    } else {
      return SocketNotificationService.disconnect();
    }
  },

  subscribe(callback) {
    if (isFirebaseAuth()) {
      return FirebaseNotificationService.subscribe(callback);
    } else {
      return SocketNotificationService.subscribe(callback);
    }
  },

  async send(notification) {
    if (isFirebaseAuth()) {
      return FirebaseNotificationService.send(notification);
    } else {
      return SocketNotificationService.send(notification);
    }
  }
};