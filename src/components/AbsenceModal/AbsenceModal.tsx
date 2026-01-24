import { useState } from 'react';

interface AbsenceModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (date: string, reason?: string) => void;
}

const AbsenceModal = ({ show, onClose, onSave }: AbsenceModalProps) => {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Dodaj absencję (całodniową)</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Powód (opcjonalnie)</label>
              <input
                type="text"
                className="form-control"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (!date) {
                  alert('Wybierz datę absencji');
                  return;
                }
                onSave(date, reason);
                setDate('');
                setReason('');
              }}
            >
              Zapisz absencję
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsenceModal;
