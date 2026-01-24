import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,           
  browserLocalPersistence,  
  browserSessionPersistence,
  inMemoryPersistence 
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { nanoid } from "nanoid";
import { app, db } from "../firebaseConfig";
import type { AuthAPI } from "./auth.types";
import { getBackend } from "../backendSelector";
import type { PersistenceMode, User } from "../../interfaces/interfaces";
import { sessionManager } from "./SessionManager";
const auth = getAuth(app);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let observers: ((user: User | null) => void)[] = [];

const notifyObservers = (user: User | null) => {
  observers.forEach((callback) => callback(user));
};

onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
        try {
            const userRef = ref(db, `users/${firebaseUser.uid}`);
            let snapshot = await get(userRef);

            let attempts = 0;
            while (!snapshot.exists() && attempts < 5) {
                await delay(500);
                snapshot = await get(userRef);
                attempts++;
            }

            if (snapshot.exists()) {
                const dbData = snapshot.val();
                const fullUser: User = { 
                    id: firebaseUser.uid, 
                    email: firebaseUser.email!, 
                    ...dbData 
                };
                notifyObservers(fullUser);
            } else {
                console.warn("Brak profilu w bazie.");
                notifyObservers(null);
            }
        } catch (error) {
            console.error("Błąd listenera:", error);
            notifyObservers(null);
        }
    } else {
        notifyObservers(null);
    }
});

export const firebaseAuth: AuthAPI = {
  async login(email, password) {
    let mode: PersistenceMode = 'LOCAL';
    
    try {
        const configSnapshot = await get(ref(db, "system_config/persistenceMode"));
        mode = configSnapshot.exists() ? configSnapshot.val() : 'LOCAL';
        
        let persistenceType = browserLocalPersistence;
        if (mode === 'SESSION') persistenceType = browserSessionPersistence;
        if (mode === 'NONE') persistenceType = inMemoryPersistence;

        await setPersistence(auth, persistenceType);
    } catch (e) {
        await setPersistence(auth, browserLocalPersistence);
    }

    sessionManager.setMode(mode);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const newSessionId = nanoid();
    sessionManager.setSessionId(newSessionId);
    await set(ref(db, `users/${uid}/activeSessionId`), newSessionId);

    const snapshot = await get(ref(db, `users/${uid}`));
    return { id: uid, email, ...snapshot.val() };
  },

  async register(email, password, userData) {
    const backend = getBackend();
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const linkedDoctorId = await backend.findDoctorByEmail(email);
    const assignedRole = linkedDoctorId ? 'doctor' : 'patient';

    const newUser: User = {
      id: uid,
      email,
      role: assignedRole,
      ...userData
    };

    await set(ref(db, `users/${uid}`), {
      email: email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phoneNumber: newUser.phoneNumber || "",
      pesel: newUser.pesel || "",
      role: newUser.role,
      isBanned: false,
      walletBalance: userData.walletBalance,
      doctorId: linkedDoctorId || null
    });

    if (linkedDoctorId) {
       await update(ref(db, `doctors/${linkedDoctorId}`), { accountId: uid });
    }

    return newUser;
  },

  async logout() {
    const user = auth.currentUser;
    if (user) {
        await set(ref(db, `users/${user.uid}/activeSessionId`), null);
    }
    sessionManager.clearSessionId();

    await signOut(auth);
  },

  onAuthStateChange(callback) {
    observers.push(callback);

    return () => {
      observers = observers.filter(obs => obs !== callback);
    };
  }
};

