import { isFirebaseAuth } from "../backendSelector";
import { FirebaseNotificationService } from "./FirebaseNotificationService";
import { SocketNotificationService } from "./SocketService";
import type { NotificationServiceAPI } from "./notification.types";


export const notificationService: NotificationServiceAPI = 
    isFirebaseAuth() ? FirebaseNotificationService : SocketNotificationService;