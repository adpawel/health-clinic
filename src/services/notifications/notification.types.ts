export interface AppNotification {
  type: 'INFO' | 'ALERT' | 'SUCCESS';
  message: string;
  timestamp?: number;
}

export interface NotificationServiceAPI {
  connect(userId: string): void;
  disconnect(): void;
  subscribe(callback: (notification: AppNotification) => void): () => void;
  send(notification: AppNotification): Promise<void>;
}