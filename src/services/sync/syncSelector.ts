import { isFirebaseAuth } from '../backendSelector';
import { FirebaseDataSync } from './FirebaseDataSync';
import { SocketDataSync } from './SocketDataSync';
import type { DataSyncAPI } from './dataSync.types';

export const dataSyncService: DataSyncAPI = {
  subscribe(resource, onUpdate) {
    if (isFirebaseAuth()) {
      return FirebaseDataSync.subscribe(resource, onUpdate);
    } else {
      return SocketDataSync.subscribe(resource, onUpdate);
    }
  },
};