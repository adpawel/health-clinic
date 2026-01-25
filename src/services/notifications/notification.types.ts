export interface AppNotification {
  id?: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS';
  message: string;
  timestamp: number;
  read?: boolean;
}

export interface NotificationServiceAPI {
  connect(userId: string): void;
  disconnect(): void;
  subscribe(callback: (notification: AppNotification) => void): () => void;
  send(notification: AppNotification): Promise<void>;
}