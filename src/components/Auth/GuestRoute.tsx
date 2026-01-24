import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/AuthContext";

export const GuestRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
     return <div>Ładowanie...</div>; 
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};