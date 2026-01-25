import { useEffect, useState } from 'react';
import type { AppNotification } from '../services/notifications/notification.types';
import { notificationService } from '../services/notifications/notificationsSelector';
import { useAuth } from '../hooks/AuthContext';

export const NotificationToast = () => {
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
        notificationService.connect(user.id);

        const unsubscribe = notificationService.subscribe((n) => {
            console.log("Otrzymano powiadomienie:", n);
            setNotification(n);
            setTimeout(() => setNotification(null), 5000);
        });

        return () => {
            unsubscribe();
        };
    }
  }, [user]);

  if (!notification) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: notification.type === 'ALERT' ? '#dc3545' : '#28a745',
      color: 'white',
      padding: '15px 25px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      animation: 'slideIn 0.5s ease-out'
    }}>
      <strong>Powiadomienie:</strong>
      <div>{notification.message}</div>
    </div>
  );
};