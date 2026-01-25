import { useEffect, useState } from "react";
import type { AppNotification } from "../services/notifications/notification.types";
import { useAuth } from "../hooks/AuthContext";
import { getBackend } from "../services/backendSelector";

export const PatientNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const backend = getBackend(); 
      const data = await backend.fetchNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
};

  if (loading) return <div className="p-4">Ładowanie powiadomień...</div>;

  return (
    <div className="container mt-4">
      <h3>Centrum Powiadomień (Ostatnie 24h)</h3>

      {notifications.length === 0 ? (
        <div className="alert alert-light mt-3">Brak nowych powiadomień.</div>
      ) : (
        <div className="list-group mt-3">
          {notifications.map((n, index) => (
            <div 
                key={n.id || index} 
                className={`list-group-item list-group-item-action flex-column align-items-start ${n.type === 'ALERT' ? 'list-group-item-danger' : ''}`}
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">
                    {n.type === 'ALERT' ? 'Ważne' : 'Informacja'}
                </h5>
                <small className="text-muted">
                    {new Date(n.timestamp).toLocaleString()}
                </small>
              </div>
              <p className="mb-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};