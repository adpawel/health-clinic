import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import type { Review, ReviewDto } from '../interfaces/interfaces';

interface ReviewModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: ReviewDto) => Promise<void>;
  initialData?: Review;
  doctorName: string;
}

export const ReviewModal = ({ show, onHide, onSubmit, initialData, doctorName }: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setRating(initialData.rating);
      setComment(initialData.comment);
    } else {
      setRating(5);
      setComment("");
    }
  }, [initialData, show]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setError("Komentarz nie może być pusty.");
      return;
    }
    try {
      await onSubmit({ doctorId: initialData?.doctorId || "", rating, comment });
      onHide();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{initialData ? "Edytuj opinię" : "Dodaj opinię"} - {doctorName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Ocena</Form.Label>
            <div style={{ fontSize: '1.5rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star} 
                  onClick={() => setRating(star)}
                  style={{ color: star <= rating ? '#ffc107' : '#e4e5e9' }}
                >
                  ★
                </span>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Komentarz</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              value={comment}
              onChange={(e: any) => setComment(e.target.value)}
              placeholder="Opisz swoje doświadczenia..."
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Anuluj</Button>
        <Button variant="primary" onClick={handleSubmit}>Zapisz</Button>
      </Modal.Footer>
    </Modal>
  );
};