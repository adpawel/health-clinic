import type { BackendAPI } from "./backend.types";
import type { AppMode } from "../interfaces/interfaces";
import { HttpBackendAPI } from "./httpBackendApi";
import { firebaseBackend } from "./firebaseBackend";

const API_URL = "http://localhost:3000";
const httpBackendInstance = new HttpBackendAPI("http://localhost:3000");

let currentBackend: BackendAPI = httpBackendInstance;
let currentMode: AppMode = 'CUSTOM_LOCAL';

export const setBackendImplementation = (mode: AppMode) => {
  currentMode = mode;
  console.log(`[BackendSelector] Ustawiam tryb: ${mode}`);
  
  if (mode === 'FIREBASE') {
    currentBackend = firebaseBackend;
  } else {
    currentBackend = httpBackendInstance;
  }
};

export function getBackend(): BackendAPI {
  return currentBackend;
}

export const isFirebaseAuth = () => {
    return currentMode === 'FIREBASE';
}

export const updateSystemMode = async (newMode: AppMode) => {
    
    try {
        const response = await fetch(`${API_URL}/api/config/global`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ appMode: newMode })
        });

        if (!response.ok) {
            throw new Error(`Błąd zmiany trybu: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Critical error switching modes:", error);
        throw error;
    }
};