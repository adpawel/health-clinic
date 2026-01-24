import type { User } from "../../interfaces/interfaces";
import type { AuthAPI } from "./auth.types";
import { TokenManager } from "./TokenManager";

const API_URL = "http://localhost:3000/api/auth";

// 1. Tablica do przechowywania funkcji nasłuchujących (to są te funkcje z AuthContext)
let observers: ((user: User | null) => void)[] = [];

// 2. Funkcja pomocnicza do powiadamiania wszystkich zainteresowanych (Contextu)
const notifyObservers = (user: User | null) => {
  observers.forEach((callback) => callback(user));
};

export const customAuthService: AuthAPI = {
  
  async login(email, password) {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Błąd logowania');
    }

    const data = await res.json();
    
    // Zapisz tokeny
    TokenManager.saveTokens(data.accessToken, data.refreshToken);

    // 3. KLUCZOWY MOMENT: Powiadamiamy AuthContext, że mamy użytkownika!
    notifyObservers(data.user);

    return data.user;
  },

  async register(email, password, userData) {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...userData })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Błąd rejestracji');
    }

    const data = await res.json();
    TokenManager.saveTokens(data.accessToken, data.refreshToken);
    
    // 3. KLUCZOWY MOMENT: Tu też powiadamiamy po rejestracji
    notifyObservers(data.user);
    
    return data.user;
  },

  async logout() {
    // Opcjonalny strzał do backendu wylogowania...
    
    TokenManager.clearTokens();
    
    // 3. KLUCZOWY MOMENT: Powiadamiamy, że użytkownik to teraz null
    notifyObservers(null);
    
    // Opcjonalnie: twarde odświeżenie, ale przy działającym Contexcie nie jest konieczne
    // window.location.href = "/login"; 
  },

  onAuthStateChange(callback) {
    observers.push(callback);

    const checkSession = async () => {
        let token = TokenManager.getAccessToken();
        const refreshToken = TokenManager.getRefreshToken();

        if (!token && !refreshToken) {
            callback(null);
            return;
        }

        if (token && refreshToken && TokenManager.isAccessTokenExpired(token)) {
            try {
                const refreshRes = await fetch(`${API_URL}/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: refreshToken })
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    TokenManager.saveTokens(data.accessToken, refreshToken);
                    token = data.accessToken; // Mamy nowy, świeży token!
                } else {
                    throw new Error("Refresh token expired");
                }
            } catch (e) {
                console.warn("Błąd proaktywnego odświeżania:", e);
                TokenManager.clearTokens();
                callback(null);
                return;
            }
        }
        try {
            const response = await fetch(`${API_URL}/me`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (response.ok) {
                const user = await response.json();
                callback(user);
            } else {
                throw new Error("Błąd pobierania profilu");
            }

        } catch (error) {
            TokenManager.clearTokens();
            callback(null);
        }
    };

    checkSession();

    return () => {
        observers = observers.filter(obs => obs !== callback);
    };
  }
};