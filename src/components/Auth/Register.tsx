import { useState } from 'react';
import { useAuth } from '../../hooks/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Register = () => {
  const [formData, setFormData] = useState({
    email: "", password: "", firstName: "", lastName: "", pesel: "", phoneNumber: ""
  });
  const [error, setError] = useState("");
  const { authService } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.register(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        pesel: formData.pesel,
        phoneNumber: formData.phoneNumber,
        walletBalance: 1000
      });
      navigate("/");
    } catch (err: any) {
      setError("Błąd rejestracji: " + err.message);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "500px" }}>
      <div className="card p-4">
        <h3>Rejestracja</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-6 mb-3">
               <label>Imię</label>
               <input name="firstName" className="form-control" onChange={handleChange} required />
            </div>
            <div className="col-6 mb-3">
               <label>Nazwisko</label>
               <input name="lastName" className="form-control" onChange={handleChange} required />
            </div>
          </div>
          <div className="mb-3">
            <label>Email</label>
            <input name="email" type="email" className="form-control" onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label>Hasło</label>
            <input name="password" type="password" className="form-control" onChange={handleChange} required />
          </div>
          <button className="btn btn-brand w-100" type="submit">Zarejestruj się</button>
        </form>
      </div>
    </div>
  );
};