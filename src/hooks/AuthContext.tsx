import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { firebaseAuth } from '../services/auth/firebaseAuth';
import type { AuthAPI } from '../services/auth/auth.types';
import type { User } from '../interfaces/interfaces';
import { customAuthService } from '../services/auth/CustomAuthService';
import { getBackend, isFirebaseAuth } from '../services/backendSelector';
import { dataSyncService } from '../services/sync/syncSelector';
import { sessionManager } from '../services/auth/SessionManager';
import { onValue, ref } from 'firebase/database';
import { db } from '../services/firebaseConfig';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authService: AuthAPI;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const authService = isFirebaseAuth() ? firebaseAuth : customAuthService;
  const backend = getBackend();

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const freshUser = (await backend.fetchUsers()).find(u => u.id === user.id);
      
      if (freshUser) {
        setUser(prev => prev ? { ...prev, ...freshUser } : freshUser);
      }
    } catch (error) {
      console.error("Błąd podczas odświeżania użytkownika:", error);
    }
  }, [user?.id, backend]);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeSync = dataSyncService.subscribe('users', () => {
        refreshUser();
    });

    return () => {
        unsubscribeSync();
    };
  }, [user?.id, refreshUser]);

  useEffect(() => {
    if (!user || isFirebaseAuth()) return;

    const sessionRef = ref(db, `users/${user.id}/activeSessionId`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const remoteSessionId = snapshot.val();
      const localSessionId = sessionManager.getSessionId();

      if (remoteSessionId && localSessionId && remoteSessionId !== localSessionId) {
         console.warn("Wykryto nową sesję na innym urządzeniu.");
         
         sessionManager.clearSessionId();
         
         authService.logout().then(() => {
            alert("Zalogowano się na innym urządzeniu. Twoja sesja została zakończona.");
            window.location.href = "/login";
         });
      }
    });

    return () => unsubscribe();
  }, [user, authService]);
  
  if (loading) {
      return (
          <div className="d-flex justify-content-center align-items-center vh-100">
              <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Ładowanie użytkownika...</span>
              </div>
          </div>
      );
  }
  
  return (
    <AuthContext.Provider value={{ user, loading, authService, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};