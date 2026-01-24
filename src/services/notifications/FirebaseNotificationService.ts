import { ref, onChildAdded, off } from "firebase/database";
import { db } from "../firebaseConfig";
import type { AppNotification, NotificationServiceAPI } from "./notification.types";

let currentUserId: string | null = null;

export const FirebaseNotificationService: NotificationServiceAPI = {
  
  connect(userId: string) {
    currentUserId = userId;
    console.log(`Firebase Notifications: Podłączono do skrzynki użytkownika ${userId}`);
  },

  disconnect() {
    currentUserId = null;
    // Listenery odpinamy w funkcji zwracanej przez subscribe
  },

  subscribe(callback) {
    if (!currentUserId) return () => {};

    const userNotifsRef = ref(db, `users/${currentUserId}/notifications`);

    const unsubscribe = onChildAdded(userNotifsRef, (snapshot) => {
      const data = snapshot.val();
      const now = Date.now();

      if (data.timestamp && now - data.timestamp < 10000) {
          callback(data as AppNotification);
      }
    });

    return () => {
      off(userNotifsRef, 'child_added', unsubscribe);
    };
  },

  async send(_notification: AppNotification) {
      console.warn("W modelu celowanym użyj logiki backendu do wysyłania powiadomień.");
  }
};