import type { PersistenceMode, User } from "../../interfaces/interfaces";

export interface AuthAPI {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string, userData: Omit<User, "id" | "email" | "role">): Promise<User>;
  logout(): Promise<void>;
  
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

export interface SystemConfig {
  persistenceMode: PersistenceMode;
}