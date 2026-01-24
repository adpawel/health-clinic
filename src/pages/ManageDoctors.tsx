import { useState, useEffect } from "react";
import type { Doctor, DoctorDto } from "../interfaces/interfaces";
import { getBackend } from "../services/backendSelector";

export const ManageDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stan formularza
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    title: "lek.",
    specializationsString: "",
    email: ""
});

  const backend = getBackend();

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await backend.fetchDoctors();
      setDoctors(data);
    } catch (error) {
      console.error("Błąd pobierania lekarzy", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const specsArray = formData.specializationsString
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (specsArray.length === 0) {
        alert("Podaj przynajmniej jedną specjalizację.");
        return;
    }

    const newDoctor: DoctorDto = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        title: formData.title,
        specializations: specsArray,
        email: formData.email
    };

    try {
        await backend.saveDoctor(newDoctor);
        
        setFormData({
            firstName: "",
            lastName: "",
            title: "lek.",
            specializationsString: "",
            email: "",
        });
        
        loadDoctors();
        alert("Dodano lekarza pomyślnie!");
    } catch (error) {
        console.error(error);
        alert("Błąd podczas dodawania lekarza.");
    }
  };

  const handleDelete = async (id: string) => {
      if(!window.confirm("Czy na pewno chcesz usunąć tego lekarza z listy?")) return;

      try {
          await backend.deleteDoctor(id);
          setDoctors(prev => prev.filter(d => d.id !== id));
      } catch (error) {
          alert("Nie udało się usunąć lekarza.");
      }
  };

  if (loading) return <div className="p-4">Ładowanie listy lekarzy...</div>;

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Zarządzanie Lekarzami</h2>

      {/* --- FORMULARZ DODAWANIA --- */}
      <div className="card shadow-sm mb-5">
        <div className="card-header bg-primary text-white">
            <i className="bi bi-person-plus-fill me-2"></i>
            Dodaj Nowego Lekarza
        </div>
        <div className="card-body">
            <form onSubmit={handleSubmit}>
                <div className="row">
                    <div className="col-md-2 mb-3">
                        <label className="form-label">Tytuł</label>
                        <select 
                            name="title" 
                            className="form-select" 
                            value={formData.title} 
                            onChange={handleInputChange}
                        >
                            <option value="lek.">lek.</option>
                            <option value="lek. stom.">lek. stom.</option>
                            <option value="dr n. med.">dr n. med.</option>
                            <option value="dr hab.">dr hab.</option>
                            <option value="prof.">prof.</option>
                        </select>
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label">Imię</label>
                        <input 
                            name="firstName" 
                            className="form-control" 
                            value={formData.firstName} 
                            onChange={handleInputChange} 
                            required 
                        />
                    </div>
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Nazwisko</label>
                        <input 
                            name="lastName" 
                            className="form-control" 
                            value={formData.lastName} 
                            onChange={handleInputChange} 
                            required 
                        />
                    </div>
                </div>
                <div className="col-md-6 mb-3">
                    <label className="form-label">Email Lekarza (do logowania)</label>
                    <input 
                        name="email" 
                        type="email"
                        className="form-control" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="jan.kowalski@healthclinic.pl"
                    />
                    <div className="form-text">
                        Lekarz użyje tego maila przy samodzielnej rejestracji.
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label">Specjalizacje (oddzielone przecinkami)</label>
                    <input 
                        name="specializationsString" 
                        className="form-control" 
                        placeholder="np. Kardiolog, Internista, Pediatra"
                        value={formData.specializationsString} 
                        onChange={handleInputChange} 
                        required 
                    />
                    <div className="form-text">Wpisz specjalizacje po przecinku.</div>
                </div>

                <button type="submit" className="btn btn-success">
                    <i className="bi bi-plus-circle me-1"></i> Dodaj Lekarza
                </button>
            </form>
        </div>
      </div>

      {/* --- TABELA LEKARZY --- */}
      <h4 className="mb-3">Lista Lekarzy w Systemie</h4>
      <div className="card shadow-sm">
        <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                    <tr>
                        <th>Tytuł i Nazwisko</th>
                        <th>Specjalizacje</th>
                        <th className="text-end">Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    {doctors.map(doc => (
                        <tr key={doc.id}>
                            <td>
                                <span className="text-muted small me-1">{doc.title}</span>
                                <strong>{doc.firstName} {doc.lastName}</strong>
                            </td>
                            <td>
                                {doc.specializations.map((spec, i) => (
                                    <span key={i} className="badge bg-info text-dark me-1">
                                        {spec}
                                    </span>
                                ))}
                            </td>
                            <td className="text-end">
                                <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(doc.id)}
                                >
                                    <i className="bi bi-trash-fill"></i> Usuń
                                </button>
                            </td>
                        </tr>
                    ))}
                    {doctors.length === 0 && (
                        <tr>
                            <td colSpan={3} className="text-center py-4 text-muted">
                                Brak lekarzy w bazie. Dodaj pierwszego powyżej.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};