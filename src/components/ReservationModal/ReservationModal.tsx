import { useState } from "react";
import type { AppointmentDto } from "../../interfaces/interfaces";
import { useAuth } from "../../hooks/AuthContext";

interface ReservationModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (appointment: AppointmentDto) => void;
  date: string;
  hour: string;
  doctorId: string;
  patientId: string;
}

const consultationTypes = [
  "pierwsza wizyta",
  "wizyta kontrolna",
  "choroba przewlekła",
  "recepta"
];

const durations = [30, 60, 90];

const ReservationModal = ({ show, onClose, onSave, date, hour, doctorId, patientId }: ReservationModalProps) => {
  const [patientName, setPatientName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [age, setAge] = useState<number>(0);
  const [type, setType] = useState(consultationTypes[0]);
  const [duration, setDuration] = useState<number>(30);
  const [notes, setNotes] = useState("");
  const { user } = useAuth();

  if (!show) return null;

  const calculateCost = (durationMinutes: number) => {
    switch(durationMinutes){
      case 30:
        return 70;
      case 60:
        return 140;
      case 90:
        return 210;
      default:
        return 100;        
    }
  }

  const handleSave = () => {
    const startTime = `${date}T${hour}`;
    const newAppointment: AppointmentDto = {
      doctorId: doctorId,
      patientId: patientId,
      patientName: patientName,
      patientGender: gender,
      patientAge: age,
      type: type,
      startTime: startTime,
      isPaid: false,
      cost: calculateCost(duration),
      durationMinutes: duration,
      notes: notes
    };
    onSave(newAppointment);
    onClose();
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Rezerwacja konsultacji</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-2">
              <label className="form-label">Imię i nazwisko</label>
              <input 
                type="text" 
                className="form-control" 
                value={patientName}
                onChange={e => setPatientName(e.target.value)} 
              />
            </div>
            <div className="mb-2">
              <label className="form-label">Płeć</label>
              <select className="form-select" value={gender} onChange={e => setGender(e.target.value as "M" | "F")}>
                <option value="M">Mężczyzna</option>
                <option value="F">Kobieta</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label">Wiek</label>
              <input type="number" className="form-control" value={age} onChange={e => setAge(parseInt(e.target.value))} />
            </div>
            <div className="mb-2">
              <label className="form-label">Typ konsultacji</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                {consultationTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label">Czas trwania</label>
              <select className="form-select" value={duration} onChange={e => setDuration(parseInt(e.target.value))}>
                {durations.map(d => <option key={d} value={d}>{d} minut</option>)}
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label">Uwagi dla lekarza</label>
              <textarea className="form-control" rows={3} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
            <button className="btn btn-primary" onClick={handleSave}>Zarezerwuj</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
