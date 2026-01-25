import { useState, useEffect } from "react";
import type { AppMode, PersistenceMode } from "../interfaces/interfaces";
import { getBackend, updateSystemMode } from "../services/backendSelector";

export const AdminDashboard = () => {
  const [currentMode, setCurrentMode] = useState<PersistenceMode>('LOCAL');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const backend = getBackend();
  const [appMode, setAppModeState] = useState<AppMode>();

  useEffect(() => {
    const fetchData = async () => {
        try {
            const pMode = await backend.getPersistenceMode();
            setCurrentMode(pMode);

            const res = await fetch("http://localhost:3000/api/config/global");
            if (res.ok) {
                const config = await res.json();
                setAppModeState(config.appMode);
            }
        } catch (error) {
            console.error("Błąd ładowania ustawień:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      await backend.setPersistenceMode(currentMode);
      setMessage("Zapisano! Wyloguj się i zaloguj ponownie, aby przetestować.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setMessage("Błąd zapisu.");
    }
  };

  const handleAppModeChange = async (targetMode: AppMode) => {
     if (targetMode === appMode) return;

     if (!window.confirm(`Czy zmienić globalny tryb na ${targetMode}?`)) return;

     try {
         setLoading(true);
         
         await updateSystemMode(targetMode);
         
         window.location.reload(); 

     } catch (e) {
         console.error(e);
         alert("Błąd zmiany trybu.");
         setLoading(false);
     }
};

  if (loading) return <div className="p-4">Ładowanie panelu admina...</div>;

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Panel Administratora</h2>
      
      <div className="card shadow mb-4">
        <div className="card-header text-dark bg-bright">
          <i className="bi bi-gear-fill me-2"></i>
          Konfiguracja Systemu
        </div>
        <div className="card-body">
          <h5>Tryb Uwierzytelniania (Persistence)</h5>
          <p className="text-muted small">
            To ustawienie decyduje, jak długo użytkownicy pozostają zalogowani.
            Zmiana wpłynie na <strong>nowe</strong> logowania.
          </p>

          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="persistence"
                id="modeLocal"
                checked={currentMode === 'LOCAL'}
                onChange={() => setCurrentMode('LOCAL')}
              />
              <label className="form-check-label" htmlFor="modeLocal">
                <strong>LOCAL</strong> - Sesja trwa nawet po zamknięciu przeglądarki.
              </label>
            </div>

            <div className="form-check mt-2">
              <input
                className="form-check-input"
                type="radio"
                name="persistence"
                id="modeSession"
                checked={currentMode === 'SESSION'}
                onChange={() => setCurrentMode('SESSION')}
              />
              <label className="form-check-label" htmlFor="modeSession">
                <strong>SESSION</strong> - Sesja wygasa po zamknięciu karty/okna.
              </label>
            </div>

            <div className="form-check mt-2">
              <input
                className="form-check-input"
                type="radio"
                name="persistence"
                id="modeNone"
                checked={currentMode === 'NONE'}
                onChange={() => setCurrentMode('NONE')}
              />
              <label className="form-check-label" htmlFor="modeNone">
                <strong>NONE</strong> - Sesja wygasa przy każdym odświeżeniu strony (F5).
              </label>
            </div>
          </div>

          {message && <div className="alert alert-info">{message}</div>}

          <button className="btn btn-secondary" onClick={handleSave}>
            Zapisz Ustawienia
          </button>
        </div>
      </div>
      <div className="card shadow mb-4">
        <div className="card-header bg-bright text-dark">
          <i className="bi bi-hdd-network-fill me-2"></i>
          Tryb Aplikacji (Backend & Auth)
        </div>
        <div className="card-body">
          <p className="text-muted small">
             Wybierz architekturę systemu. Zmiana wymaga przeładowania strony.
          </p>
          
          <div className="btn-group w-100" role="group">
            <button 
                type="button" 
                className={`btn ${appMode === 'FIREBASE' ? 'btn-brand' : 'btn-brand-outline'}`}
                onClick={() => handleAppModeChange('FIREBASE')}
            >
                Firebase (Auth + DB)
            </button>
            <button 
                type="button" 
                className={`btn ${appMode === 'CUSTOM_LOCAL' ? 'btn-brand' : 'btn-brand-outline'}`}
                onClick={() => handleAppModeChange('CUSTOM_LOCAL')}
            >
                Custom Auth + Plik JSON (LowDB)
            </button>
            <button 
                type="button" 
                className={`btn ${appMode === 'CUSTOM_MONGO' ? 'btn-brand' : 'btn-brand-outline'}`}
                onClick={() => handleAppModeChange('CUSTOM_MONGO')}
            >
                Custom Auth + MongoDB Atlas
            </button>
          </div>
          
          <div className="mt-3 alert alert-secondary small bg-bright text-dark">
            Aktualnie wybrany tryb: <strong>{appMode}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};