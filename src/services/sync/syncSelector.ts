import { isFirebaseAuth } from "../backendSelector";
import { FirebaseDataSync } from "./FirebaseDataSync";
import { SocketDataSync } from "./SocketDataSync";
import type { DataSyncAPI } from "./dataSync.types";

export const dataSyncService: DataSyncAPI = 
    isFirebaseAuth() ? FirebaseDataSync : SocketDataSync;