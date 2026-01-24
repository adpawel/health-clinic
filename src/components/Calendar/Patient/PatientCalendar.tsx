import { format, parseISO, addMinutes, set, isBefore, isSameMinute } from 'date-fns';
import CalendarGrid from '../Shared/CalendarGrid';
import { useState } from 'react';
import ReservationModal from '../../ReservationModal/ReservationModal';
import type { Absence, Appointment, AppointmentDto, AvailabilityTemplate, TimeRange } from '../../../interfaces/interfaces';
import './PatientCalendar.css';

export interface PatientCalendarProps {
  doctorId: string;
  appointments: Appointment[] | undefined;
  absences: Absence[];
  patientId: string;
  availabilityTemplates: AvailabilityTemplate[];
  onReservationSave: (appointment: AppointmentDto) => void;
  onCancelAppointment: (id: string) => void;
}

const PatientCalendar = ({ doctorId, appointments, absences, availabilityTemplates, onReservationSave, patientId, onCancelAppointment }: PatientCalendarProps) => {
  const [modalData, setModalData] = useState<{ date: string; hour: string } | null>(null);

const renderPatientSlot = (date: Date, hour: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const now = new Date();

    const [hours, minutes] = hour.split(':').map(Number);
    const slotDateTime = set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
    const isPast = isBefore(slotDateTime, now);

    const isAbsent = absences.some(abs => format(abs.date, "yyyy-MM-dd") === dateStr);
    if (isAbsent) return (
      <div className="w-100 h-100 bg-danger bg-opacity-25 text-center small fw-bold d-flex align-items-center justify-content-center">
        Niedostępny
      </div>
    );

    const foundAppointment = appointments?.find(app => {
      const appDateStr = format(parseISO(app.startTime), "yyyy-MM-dd");
      if (appDateStr !== dateStr) return false;

      const appStart = parseISO(app.startTime);
      const duration = app.durationMinutes || 30; 
      const appEnd = addMinutes(appStart, duration);

      return slotDateTime >= appStart && slotDateTime < appEnd && app.isPaid === true;
    });

    if (foundAppointment) {
      const appStart = parseISO(foundAppointment.startTime);
      
      const isStartSlot = isSameMinute(slotDateTime, appStart);

      if (!isStartSlot) {
          return null; 
      }

      const duration = foundAppointment.durationMinutes || 30;
      const heightPercent = (duration / 30) * 100;

      if (foundAppointment.patientId === patientId) {
        return (
          <div 
            className="bg-primary text-white p-1 d-flex flex-column justify-content-center align-items-center shadow-sm" 
            style={{ 
                fontSize: '0.7rem',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${heightPercent}%`,
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.2)'
            }}
          >
             {!isPast && (
                <button 
                  className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center"
                  style={{ width: '20px', height: '20px', lineHeight: 1, fontSize: '14px', margin: '2px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelAppointment(foundAppointment.id);
                  }}
                  title="Anuluj wizytę"
                >
                  &times;
                </button>
             )}
             
             <div className="fw-bold text-center">MOJA WIZYTA</div>
             <div className="text-center small">{foundAppointment.type}</div>
             <div className="text-center small opacity-75">
                {format(appStart, 'HH:mm')} - {format(addMinutes(appStart, duration), 'HH:mm')}
             </div>
          </div>
        );
      }

      return (
        <div 
            className="bg-secondary bg-opacity-25 text-center small d-flex align-items-center justify-content-center"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${heightPercent}%`,
                zIndex: 5,
                borderBottom: '1px solid rgba(0,0,0,0.1)'
            }}
        >
          Zajęty
        </div>
      );
    }

    const dailyAvailability = availabilityTemplates.flatMap(template => {
      const start = parseISO(template.validFrom);
      const end = parseISO(template.validTo);
      const weekday = date.getDay(); 
      
      const checkDate = new Date(dateStr);
      const fromDate = new Date(format(start, "yyyy-MM-dd"));
      const toDate = new Date(format(end, "yyyy-MM-dd"));

      if (checkDate >= fromDate && checkDate <= toDate && template.weekdays.includes(weekday)) {
          return template.timeRanges;
      }
      return [];
    });

    const isAvailable = dailyAvailability.some((range: TimeRange) => hour >= range.from && hour < range.to);
    
    if (!isAvailable) return <div className="w-100 h-100"></div>;

    if (isPast) {
        return (
            <div 
                className="w-100 h-100 bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center"
                style={{ cursor: 'default', opacity: 0.6 }}
            >
                <small className="text-secondary fw-bold" style={{ fontSize: '0.7rem' }}>WOLNY</small>
            </div>
        );
    }

    return (
      <div
        className="w-100 h-100 bg-success bg-opacity-10 cursor-pointer clickable d-flex align-items-center justify-content-center"
        onClick={() => setModalData({ date: dateStr, hour })}
      >
        <small className="text-success fw-bold" style={{ fontSize: '0.7rem' }}>WOLNY</small>
      </div>
    );
  };

  return (
    <>
      <CalendarGrid title="Rezerwacja Wizyty" renderSlot={renderPatientSlot} />
      {modalData && (
        <ReservationModal
          show={!!modalData}
          onClose={() => setModalData(null)}
          onSave={onReservationSave}
          date={modalData.date}
          hour={modalData.hour}
          doctorId={doctorId}
          patientId={patientId}
        />
      )}
    </>
  );
};

export default PatientCalendar;

