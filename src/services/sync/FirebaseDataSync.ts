import { ref, onValue, off } from "firebase/database";
import { db } from "../firebaseConfig";
import type { DataSyncAPI, ResourceType } from "./dataSync.types";

export const FirebaseDataSync: DataSyncAPI = {
  subscribe(resource: ResourceType, onUpdate: () => void) {
    const dataRef = ref(db, resource);

    // Firebase onValue odpala się zawsze raz na start (z danymi początkowymi).
    // Musimy to zignorować, żeby nie robić podwójnego pobierania przy montowaniu komponentu.
    let isInitialLoad = true;

    const callback = (_snapshot: any) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return; 
      }
      console.log(`[Firebase Sync] Zmiana w ${resource} -> Odświeżam widok.`);
      onUpdate();
    };

    onValue(dataRef, callback);

    return () => {
      off(dataRef, 'value', callback);
    };
  }
};