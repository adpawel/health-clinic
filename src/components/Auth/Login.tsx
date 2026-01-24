import { useState } from 'react';
import { useAuth } from '../../hooks/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { authService, user} = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.login(email, password);
      
      switch(user?.role){
        case 'admin':
          navigate("/admin/dashboard");
          break;
        case 'patient':
          navigate("/patient/dashboard");
          break;
        case 'doctor':
          navigate("/doctor/dashboard");
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError("Błąd logowania");
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "400px" }}>
      <div className="card p-4">
        <h3>Logowanie</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Email</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label>Hasło</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-100" type="submit">Zaloguj się</button>
        </form>
      </div>
    </div>
  );
};