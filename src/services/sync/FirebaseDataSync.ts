import { ref, onValue, off } from "firebase/database";
import { db } from "../firebaseConfig";
import type { DataSyncAPI, ResourceType } from "./dataSync.types";

const RESOURCE_MAP: Record<string, string> = {
  'availabilities': 'availability',
  'appointments': 'appointments',
  'doctors': 'doctors',
  'users': 'users',
  'absences': 'absences'
};

export const FirebaseDataSync: DataSyncAPI = {
  subscribe(resource: ResourceType, onUpdate: () => void) {
    
    const dbPath = RESOURCE_MAP[resource] || resource;

    console.log(`[FirebaseSync] Subskrypcja na ścieżkę: "${dbPath}" (dla zasobu: "${resource}")`);
    
    const dataRef = ref(db, dbPath);

    let isInitialLoad = true;

    const callback = (_snapshot: any) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return; 
      }
      console.log(`[Firebase Sync] Zmiana w ${dbPath} -> Odświeżam widok.`);
      onUpdate();
    };

    onValue(dataRef, callback);

    return () => {
      off(dataRef, 'value', callback);
    };
  }
};