import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import type { Appointment, Doctor, Review, ReviewDto } from "../interfaces/interfaces";
import { getBackend } from "../services/backendSelector";
import { useAuth } from "../hooks/AuthContext";
import { ReviewModal } from "../components/ReviewModal";

const Home = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const backend = getBackend();
  const { user } = useAuth(); 
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  
  const [modalShow, setModalShow] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [reviewToEdit, setReviewToEdit] = useState<Review | undefined>(undefined);

  useEffect(() => {
    backend.fetchDoctors()
      .then(data => {
        setDoctors(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    if (user && user.role === 'patient') {
       backend.fetchAppointments().then(allAppts => {
           const mine = allAppts.filter(a => 
               a.patientId === user.id && 
               new Date(a.startTime) < new Date()
           );
           setMyAppointments(mine);
       });
    }
  }, [user]);

  const hasVisited = (doctorId: string) => {
    return myAppointments.some(a => a.doctorId === doctorId);
  };

  const handleOpenReview = async (doctor: Doctor) => {
     setSelectedDoctor(doctor);
     
     const docReviews = await backend.getDoctorReviews(doctor.id);
     const existing = docReviews.find(r => r.patientId === user?.id);
     
     setReviewToEdit(existing);
     setModalShow(true);
  };

  // const handleDeleteReview = async (doctorId: string) => {
  //    if(!window.confirm("Czy na pewno chcesz usunąć opinię?")) return;
     
  //    const docReviews = await backend.getDoctorReviews(doctorId);
  //    const review = docReviews.find(r => r.patientId === user?.id);
     
  //    if (review) {
  //        await backend.deleteReview(review.id);
  //        alert("Usunięto opinię.");
  //    }
  // };

  const handleSaveReview = async (data: ReviewDto) => {
     if (!selectedDoctor || !user) return;
     
     if (reviewToEdit) {
        await backend.updateReview(reviewToEdit.id, data);
     } else {
        await backend.addReview({ ...data, doctorId: selectedDoctor.id }, user.id, user.firstName);
     }
     // Opcjonalnie tutaj można dodać odświeżenie listy lub alert sukcesu
  };

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;
  }

  return (
    <div className="container mt-4">
      <div className="text-center mb-5">
        <h1 className="display-4">Witamy w HealthClinic</h1>
        <p className="lead text-muted">Znajdź specjalistę i umów wizytę bez wychodzenia z domu.</p>
      </div>

      <h3 className="mb-4 border-bottom pb-2">Nasi Specjaliści</h3>

      <div className="row">
        {doctors.map((doctor) => (
          <div key={doctor.id} className="col-md-6 col-lg-4 mb-4">
            <div className="card h-100 shadow-sm hover-shadow">
              <div className="card-body">
                
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-3 me-3 text-primary">
                    <i className="bi bi-person-fill h4 mb-0"></i>
                  </div>
                  <div>
                    <h5 className="card-title mb-0">
                      {doctor.title} {doctor.firstName} {doctor.lastName}
                    </h5>
                    {/* --- ZMIANA 1: LINK DO LISTY OPINII --- */}
                    <Link to={`/${doctor.id}/reviews`} style={{ fontSize: '0.85rem', textDecoration: 'none' }}>
                        Zobacz opinie
                    </Link>
                  </div>
                </div>
                
                <h6 className="card-subtitle mb-2 text-muted">Specjalizacje:</h6>
                <div>
                  {doctor.specializations && doctor.specializations.length > 0 ? (
                    doctor.specializations.map((spec, index) => (
                      <span key={index} className="badge bg-info text-dark me-1">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted small">Brak danych</span>
                  )}
                </div>
              </div>
              
              {/* --- ZMIANA 2: STYLOWANIE FOOTERA (flex column) --- */}
              <div className="card-footer bg-white border-top-0 d-flex flex-column gap-2">
                 
                 {user?.role === 'patient' && (
                    <Link to="/patient/dashboard" className="btn btn-outline-primary w-100">
                      Sprawdź terminy
                    </Link>
                 )}

                 {/* --- ZMIANA 3: WARUNKOWY PRZYCISK OCENY --- */}
                 {user?.role === 'patient' && hasVisited(doctor.id) && (
                    <Button 
                        variant="warning" 
                        className="w-100 text-dark"
                        onClick={() => handleOpenReview(doctor)}
                    >
                        ⭐ Oceń / Edytuj opinię
                    </Button>
                 )}

                {!user && (
                    <Link to="/login" className="btn btn-outline-secondary w-100">
                      Zaloguj się, aby umówić
                    </Link>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ReviewModal 
         show={modalShow} 
         onHide={() => setModalShow(false)}
         onSubmit={handleSaveReview}
         initialData={reviewToEdit}
         doctorName={selectedDoctor ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}` : ""}
      />
    </div>
  );
};

export default Home;