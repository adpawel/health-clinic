// import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
// import { firebaseAuth } from '../services/auth/firebaseAuth';
// import type { AuthAPI } from '../services/auth/auth.types';
// import type { User } from '../interfaces/interfaces';
// import { customAuthService } from '../services/auth/CustomAuthService';
// import { getBackend, isFirebaseAuth } from '../services/backendSelector';
// import { dataSyncService } from '../services/sync/syncSelector';
// import { sessionManager } from '../services/auth/SessionManager';
// import { onValue, ref } from 'firebase/database';
// import { db } from '../services/firebaseConfig';

// interface AuthContextType {
//   user: User | null;
//   loading: boolean;
//   authService: AuthAPI;
//   refreshUser: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);
  
//   const authService = isFirebaseAuth() ? firebaseAuth : customAuthService;
//   const backend = getBackend();

//   const refreshUser = useCallback(async () => {
//     if (!user) return;
//     try {
//       const freshUser = (await backend.fetchUsers()).find(u => u.id === user.id);
      
//       if (freshUser) {
//         setUser(prev => prev ? { ...prev, ...freshUser } : freshUser);
//       }
//     } catch (error) {
//       console.error("Błąd podczas odświeżania użytkownika:", error);
//     }
//   }, [user?.id, backend]);

//   useEffect(() => {
//     const unsubscribe = authService.onAuthStateChange((authUser) => {
//       setUser(authUser);
//       setLoading(false);
//     });

//     return () => unsubscribe();
//   }, []);

//   useEffect(() => {
//     if (!user) return;

//     const unsubscribeSync = dataSyncService.subscribe('users', () => {
//         refreshUser();
//     });

//     return () => {
//         unsubscribeSync();
//     };
//   }, [user?.id, refreshUser]);

//   useEffect(() => {
//     if (!user) return; //|| isFirebaseAuth()

//     const sessionRef = ref(db, `users/${user.id}/activeSessionId`);

//     const unsubscribe = onValue(sessionRef, (snapshot) => {
//       const remoteSessionId = snapshot.val();
//       const localSessionId = sessionManager.getSessionId();

//       if (remoteSessionId && localSessionId && remoteSessionId !== localSessionId) {
//          console.warn("Wykryto nową sesję na innym urządzeniu.");
         
//          sessionManager.clearSessionId();
         
//          authService.logout().then(() => {
//             alert("Zalogowano się na innym urządzeniu. Twoja sesja została zakończona.");
//             window.location.href = "/login";
//          });
//       }
//     });

//     return () => unsubscribe();
//   }, [user, authService]);
  
//   if (loading) {
//       return (
//           <div className="d-flex justify-content-center align-items-center vh-100">
//               <div className="spinner-border text-primary" role="status">
//                   <span className="visually-hidden">Ładowanie użytkownika...</span>
//               </div>
//           </div>
//       );
//   }
  
//   return (
//     <AuthContext.Provider value={{ user, loading, authService, refreshUser }}>
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error("useAuth must be used within an AuthProvider");
//   return context;
// };

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { firebaseAuth } from '../services/auth/firebaseAuth';
import type { AuthAPI } from '../services/auth/auth.types';
import type { User } from '../interfaces/interfaces';
import { customAuthService } from '../services/auth/CustomAuthService';
import { getBackend, isFirebaseAuth } from '../services/backendSelector';
import { dataSyncService } from '../services/sync/syncSelector';
import { sessionManager } from '../services/auth/SessionManager';
import { onValue, ref, get } from 'firebase/database';
import { db } from '../services/firebaseConfig';
import { socketClient } from '../services/sync/socketClient';

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
  
  const [authService] = useState(() => isFirebaseAuth() ? firebaseAuth : customAuthService);
  const backend = getBackend();

  // --- POPRAWIONY REFRESH USER ---
  // Nie wymaga metody findUserById w interfejsie backendu
  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      let freshUserData: User | undefined;

      if (isFirebaseAuth()) {
        // 1. DLA FIREBASE: Pobieramy bezpośrednio z bazy, omijając BackendAPI.
        // Dzięki temu nie musimy zmieniać interfejsu, a pobieramy TYLKO 1 usera (bez błędu uprawnień).
        const snapshot = await get(ref(db, `users/${user.id}`));
        if (snapshot.exists()) {
           // Łączymy ID z danymi
           freshUserData = { id: user.id, email: user.email, ...snapshot.val() };
        }
      } else {
        // 2. DLA NODE.JS: Używamy starej metody fetchUsers (tak jak chciałeś)
        // W Node.js zazwyczaj nie ma problemu z regułami security przy fetchUsers
        const allUsers = await backend.fetchUsers();
        freshUserData = allUsers.find(u => u.id === user.id);
      }

      // Aktualizacja stanu
      if (freshUserData) {
        setUser(prev => prev ? { ...prev, ...freshUserData } : freshUserData);
      }
    } catch (error) {
      console.error("Błąd podczas odświeżania użytkownika:", error);
    }
  }, [user?.id, user?.email, backend]);

  // 1. Obsługa logowania
  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {
        if (mounted && loading) setLoading(false);
    }, 3000);

    const unsubscribe = authService.onAuthStateChange((authUser) => {
      if (!mounted) return;
      setUser(authUser);
      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // 2. Synchronizacja danych (portfela itp.)
  useEffect(() => {
    if (!user) return;
    const unsubscribeSync = dataSyncService.subscribe('users', () => { 
        refreshUser(); 
    });
    return () => { unsubscribeSync(); };
  }, [user?.id, refreshUser]);

  // 3. OCHRONA SESJI (To naprawia problem z logowaniem na wielu kartach)
  useEffect(() => {
    if (!user) return; 

    if (isFirebaseAuth()) {
      const sessionRef = ref(db, `users/${user.id}/activeSessionId`);

      const unsubscribe = onValue(sessionRef, (snapshot) => {
        const remoteSessionId = snapshot.val();
        const localSessionId = sessionManager.getSessionId();

        // Ignorujemy, jeśli baza jest pusta
        if (!remoteSessionId) return;

        // Jeśli mamy inne ID niż w bazie -> Wyloguj
        if (localSessionId && remoteSessionId !== localSessionId) {
          console.warn("Wykryto sesję na innym urządzeniu. Wylogowywanie...");
          
          sessionManager.clearSessionId();
          authService.logout().then(() => {
              alert("Zalogowano się na innym urządzeniu.");
              window.location.href = "/login";
          });
        }
      });

      return () => unsubscribe();
    } else {
      const socket = socketClient.getSocket();
        if (!socket) return;

        const handleConflict = (data: { newSessionId: string }) => {
            const local = sessionManager.getSessionId();
            
            console.log(`[Socket] Otrzymano SESSION_CONFLICT. New: ${data.newSessionId}, Local: ${local}`);

            if (local && data.newSessionId !== local) {
                console.warn("Wykryto sesję na innym urządzeniu. Wylogowywanie...");
                sessionManager.clearSessionId();
                authService.logout().then(() => {
                    alert("Zalogowano się na innym urządzeniu.");
                    window.location.href = "/login";
                });
            }
        };

        socket.on('SESSION_CONFLICT', handleConflict);

        return () => {
            socket.off('SESSION_CONFLICT', handleConflict);
        };
    }

  }, [user, authService]); 
  
  if (loading) {
      return (
          <div className="d-flex justify-content-center align-items-center vh-100">
              <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Ładowanie...</span>
              </div>
          </div>
      );
  }
  
  return (
    <AuthContext.Provider value={{ user, loading, authService, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};