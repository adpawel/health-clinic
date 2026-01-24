import { useEffect, useState } from "react";
import { socketClient } from "./sync/socketClient";
import { setBackendImplementation } from "./backendSelector";
import { TokenManager } from "./auth/TokenManager";

export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const fetchGlobalConfig = async () => {
    try {
      const res = await fetch("/api/config/global");
      if (!res.ok) throw new Error("Błąd pobierania konfiguracji");
      
      const config = await res.json();
      console.log("[AppInit] Tryb serwera:", config.appMode);
      
      setBackendImplementation(config.appMode);
      
      const persistRes = await fetch("/config/persistence");
      if (persistRes.ok) {
          const persistData = await persistRes.json();
          console.log("[AppInit] Tryb sesji:", persistData.mode);    
          TokenManager.setPersistenceMode(persistData.mode);
      }

      setReady(true);
    } catch (e) {
      console.error(e);
      setError("Nie można połączyć się z serwerem. Upewnij się, że backend działa.");
    }
  };

  useEffect(() => {
    fetchGlobalConfig();

    const socket = socketClient.getSocket();
    if(socket) {
        socket.on('SYSTEM_MODE_CHANGED', (data: any) => {
            console.log("Serwer zmienił tryb!", data);
            alert("Administrator zmienił tryb działania systemu. Strona zostanie przeładowana.");
            window.location.reload();
        });
    }
  }, []);

  if (error) {
    return (
        <div className="d-flex justify-content-center align-items-center vh-100 flex-column">
            <h3 className="text-danger">Błąd Systemu</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Spróbuj ponownie</button>
        </div>
    );
  }

  if (!ready) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading configuration...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};