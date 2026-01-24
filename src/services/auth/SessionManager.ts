import type { PersistenceMode } from "../../interfaces/interfaces";

class SessionManager {
  private mode: PersistenceMode = 'LOCAL';
  private memoryStorage: Record<string, string> = {};

  setMode(mode: PersistenceMode) {
    this.mode = mode;
  }

  setSessionId(id: string) {
    const key = 'firebase_session_id';
    switch (this.mode) {
      case 'LOCAL':
        localStorage.setItem(key, id);
        break;
      case 'SESSION':
        sessionStorage.setItem(key, id);
        break;
      case 'NONE':
        this.memoryStorage[key] = id;
        break;
    }
  }

  getSessionId(): string | null {
    const key = 'firebase_session_id';
    switch (this.mode) {
      case 'LOCAL':
        return localStorage.getItem(key);
      case 'SESSION':
        return sessionStorage.getItem(key);
      case 'NONE':
        return this.memoryStorage[key] || null;
      default:
        return null;
    }
  }

  clearSessionId() {
    const key = 'firebase_session_id';
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    delete this.memoryStorage[key];
  }
}

export const sessionManager = new SessionManager();