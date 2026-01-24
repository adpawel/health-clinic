import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBackend } from '../services/backendSelector';
import { Card, Button, Container, Spinner } from 'react-bootstrap';
import type { Doctor, Review } from '../interfaces/interfaces';

export const DoctorPage = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const backend = getBackend();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!doctorId) return;
      try {
        const [docData, revData] = await Promise.all([
          backend.findDoctorById(doctorId),
          backend.getDoctorReviews(doctorId)
        ]);
        setDoctor(docData || null);
        setReviews(revData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [doctorId]);

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (!doctor) return <div className="text-center mt-5">Nie znaleziono lekarza.</div>;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : "Brak ocen";

  return (
    <Container className="mt-4">
      <Button variant="outline-secondary" className="mb-3" onClick={() => navigate(-1)}>
        ← Wróć
      </Button>
      
      <Card className="mb-4 text-center p-4 bg-light">
        <h2>Dr {doctor.firstName} {doctor.lastName}</h2>
        <h4 className="text-warning">★ {averageRating}</h4>
        <p className="text-muted">Liczba opinii: {reviews.length}</p>
      </Card>

      <h3>Opinie pacjentów:</h3>
      {reviews.length === 0 ? (
         <p>Ten lekarz nie ma jeszcze żadnych opinii.</p>
      ) : (
        reviews.map(review => (
          <Card key={review.id} className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <Card.Title>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: i < review.rating ? '#ffc107' : '#e4e5e9' }}>★</span>
                  ))}
                </Card.Title>
                <small className="text-muted">{new Date(review.createdAt).toLocaleDateString()}</small>
              </div>
              <Card.Subtitle className="mb-2 text-muted">{review.patientName}</Card.Subtitle>
              <Card.Text>{review.comment}</Card.Text>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
};