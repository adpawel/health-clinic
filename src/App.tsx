import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthContext";
import Navbar from "./components/Navbar/Navbar";
import { Login } from "./components/Auth/Login";
import { Register } from "./components/Auth/Register";
import { PatientDashboard } from "./pages/PatientDashboard";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { useAuth } from "./hooks/AuthContext";
import { AdminDashboard } from "./pages/AdminDashboard";
import Home from "./pages/Home";
import { ManageUsers } from "./pages/ManageUsers";
import { ManageDoctors } from "./pages/ManageDoctors";
import { DoctorDashboard } from "./pages/DoctorDashboard";
import { NotificationToast } from "./components/NotificationToast";
import { DoctorPage } from "./pages/DoctorReviews";
import { GuestRoute } from "./components/Auth/GuestRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <NotificationToast />
        <Routes>
          {/* --- STREFA GOŚCIA --- */}
          <Route path="/" element={<Home />} />
          <Route element={<GuestRoute />}>
             <Route path="/login" element={<Login />} />
             <Route path="/register" element={<Register />} />
          </Route>
          <Route path="/:doctorId/reviews" element={<DoctorPage />} />

          {/* --- STREFA ADMINA --- */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/doctors" element={<ManageDoctors />} />
          </Route>

          {/* --- STREFA PACJENTA --- */}
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
             <Route path="/patient/dashboard" element={<PatientDashboardWrapper />} />
          </Route>

          {/* --- STREFA LEKARZA --- */}
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
             <Route path="/doctor/dashboard" element={<DoctorDashboardWrapper />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const PatientDashboardWrapper = () => {
  const { user } = useAuth();
  return <PatientDashboard userId={user!.id} />; 
};

const DoctorDashboardWrapper = () => {
  const { user } = useAuth();
  return <DoctorDashboard doctorId={user!.doctorId ?? ""} />;
};

export default App;