import type { PersistenceMode } from "../../interfaces/interfaces";

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

// Domyślny tryb (dopóki nie pobierzemy z configu)
let currentMode: PersistenceMode = 'LOCAL'; 

export const TokenManager = {
  setPersistenceMode(mode: PersistenceMode) {
    currentMode = mode;
    // Wyczyść tokeny przy zmianie trybu, aby wymusić ponowne logowanie
    this.clearTokens();
  },

  getPersistenceMode() {
    return currentMode;
  },

  saveTokens(accessToken: string, refreshToken: string) {
    if (currentMode === 'LOCAL') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } else if (currentMode === 'SESSION') {
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('refreshToken', refreshToken);
    } else {
      // NONE - pamięć RAM
      memoryAccessToken = accessToken;
      memoryRefreshToken = refreshToken;
    }
  },

  getAccessToken(): string | null {
    if (currentMode === 'LOCAL') return localStorage.getItem('accessToken');
    if (currentMode === 'SESSION') return sessionStorage.getItem('accessToken');
    return memoryAccessToken;
  },

  getRefreshToken(): string | null {
    if (currentMode === 'LOCAL') return localStorage.getItem('refreshToken');
    if (currentMode === 'SESSION') return sessionStorage.getItem('refreshToken');
    return memoryRefreshToken;
  },

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    memoryAccessToken = null;
    memoryRefreshToken = null;
  },

  isAccessTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const { exp } = JSON.parse(jsonPayload);

      if (!exp) return true;
      
      return Date.now() >= (exp * 1000) - 5000;

    } catch (e) {
      return true;
    }
  }
};