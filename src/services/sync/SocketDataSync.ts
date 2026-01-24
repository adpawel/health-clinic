import type { DataSyncAPI, ResourceType } from "./dataSync.types";
import { socketClient } from "./socketClient";

const subscribers: Record<string, (() => void)[]> = {};
let isListening = false;

const setupListeners = () => {
  if (isListening) return;
  
  socketClient.on('DATA_CHANGED', (data: { resource: string }) => {
     console.log(`[Socket Sync] Otrzymano sygnał zmiany w: ${data.resource}`);
     if (subscribers[data.resource]) {
        subscribers[data.resource].forEach(cb => cb());
     }
  });
  
  isListening = true;
};

export const SocketDataSync: DataSyncAPI = {
  subscribe(resource: ResourceType, onUpdate: () => void) {
    setupListeners();

    if (!subscribers[resource]) {
      subscribers[resource] = [];
    }
    subscribers[resource].push(onUpdate);

    return () => {
      if (subscribers[resource]) {
        subscribers[resource] = subscribers[resource].filter(cb => cb !== onUpdate);
      }
    };
  }
};