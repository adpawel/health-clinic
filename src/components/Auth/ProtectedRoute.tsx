import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/AuthContext';
import type { UserRole } from '../../interfaces/interfaces';

export interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Weryfikacja uprawnień...</div>;

  if (!user) {
     return <Navigate to="/login" replace />;
  }

  if (user.isBanned) {
      return (
          <div className="container mt-5 alert alert-danger text-center">
              Twoje konto zostało zablokowane przez Administratora.
              Skontaktuj się z obsługą.
          </div>
      );
  }

  if (!allowedRoles.includes(user.role)) {
     return <Navigate to="/" replace />; 
  }

  return <Outlet />;
};