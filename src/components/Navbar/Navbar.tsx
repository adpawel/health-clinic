import { useAuth } from '../../hooks/AuthContext';
import './Navbar.css';

import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, authService } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-4 shadow-sm">
      <Link className="navbar-brand fw-bold" to="/">HealthClinic</Link>
      
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarNav">
        <div className="navbar-nav me-auto">

           {/* --- MENU PACJENTA --- */}
           {user?.role === 'patient' && (
             <>
               <Link to="/patient/dashboard" className="nav-link">Harmonogramy</Link>
               <Link className="nav-link" to="/patient/notifications">Powiadomienia</Link>
             </>
           )}

           {/* --- MENU LEKARZA --- */}
           {user?.role === 'doctor' && (
              <Link to="/doctor/dashboard" className="nav-link">Mój Harmonogram</Link>
           )}

           {/* --- MENU ADMINA --- */}
           {user?.role === 'admin' && (
             <>
               <Link to="/admin/dashboard" className="nav-link fw-bold">
                 Dashboard
               </Link>
               <Link to="/admin/users" className="nav-link ">
                 Zarządzaj użytkownikami
               </Link>
               <Link to="/admin/doctors" className="nav-link">
                 Zarządzaj lekarzami
               </Link>
             </>
           )}
        </div>

        <div className="d-flex align-items-center gap-3">
          {user ? (
            <>
              <span className="text-white small">
                {user.role === 'admin' && <span className="badge bg-warning text-dark me-2">ADMIN</span>}
                {user.role === 'doctor' && <span className="badge bg-info text-dark me-2">LEKARZ</span>}
                {user.firstName} {user.lastName}
              </span>
              <button onClick={handleLogout} className="btn btn-outline-light btn-sm">
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-light btn-sm text-primary fw-bold">Logowanie</Link>
              <Link to="/register" className="btn btn-outline-light btn-sm">Rejestracja</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;