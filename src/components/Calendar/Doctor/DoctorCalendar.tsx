import { format, isSameDay, parseISO, isBefore, set } from 'date-fns';
import CalendarGrid from '../Shared/CalendarGrid';
import { typeColorMap, type Absence, type Appointment } from '../../../interfaces/interfaces';

export interface DoctorCalendarProps {
  appointments: Appointment[];
  absences: Absence[];
  availabilitySlots: any[];
};

const DoctorCalendar = ({appointments, absences, availabilitySlots}: DoctorCalendarProps) => {
  const getAppointmentCount = (date: Date) => {
    return appointments.filter(app => isSameDay(parseISO(app.startTime), date)).length;
  };

  const renderDoctorSlot = (date: Date, hour: string) => {
    const dateString = format(date, "yyyy-MM-dd");
    const now = new Date();

    const [hours, minutes] = hour.split(':').map(Number);
    
    const slotDateTime = set(date, { hours, minutes, seconds: 0, milliseconds: 0 });

    const isPast = isBefore(slotDateTime, now);

    const isAbsent = absences.find(
      (abs) =>
        format(abs.date, "yyyy-MM-dd") === dateString &&
        (abs.type === "all_day" || (hour >= abs.startTime && hour <= abs.endTime))
    );

    if (isAbsent) {
      return (
        <div className="w-100 h-100 bg-danger bg-opacity-25 d-flex align-items-center justify-content-center">
          <small className="text-danger fw-bold" style={{ fontSize: "0.6rem" }}>
            BRAK PRACY
          </small>
        </div>
      );
    }

    const dailyAvailability = availabilitySlots.find((slot) => slot.date === dateString);
    const isAvailable = dailyAvailability?.timeRanges.some(
      (range: any) => hour >= range.from && hour < range.to
    );

    const appointment = appointments.find(
      (app) =>
        isSameDay(parseISO(app.startTime), date) &&
        format(parseISO(app.startTime), "HH:mm") === hour
    );

    let backgroundClass = "";
    let textClass = "";
    let cursorStyle = {};

    if (isAvailable) {
        if (isPast) {
            backgroundClass = "bg-secondary bg-opacity-25";
            textClass = "text-secondary";
            cursorStyle = { pointerEvents: 'none', cursor: 'default' };
        } else {
            backgroundClass = "bg-success bg-opacity-10";
            textClass = "text-success";
            cursorStyle = { cursor: 'pointer' };
        }
    }

    return (
      <div
        className={`w-100 h-100 doctor-action-slot position-relative ${backgroundClass}`}
        style={(!appointment && isAvailable && isPast) ? { pointerEvents: 'none', opacity: 0.6 } : {}}
      >
        {isAvailable && !appointment && (
          <div
            className={`w-100 text-center ${textClass}`}
            style={{ fontSize: "0.55rem", opacity: isPast ? 0.8 : 0.5, fontWeight: isPast ? 'bold' : 'normal' }}
          >
            WOLNY
          </div>
        )}

        {appointment && (
          <div
            className="appointment-block p-1 shadow-sm text-white"
            style={{
              backgroundColor: isBefore(parseISO(appointment.startTime), now)
                ? "#6c757d" 
                : typeColorMap[appointment.type] || "#007bff",
              height: `${(appointment.durationMinutes / 30) * 100}%`,
              minHeight: "45px",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
              width: "95%",
              pointerEvents: 'auto'
            }}
            title={`${appointment.patientName} (${appointment.type}) - ${appointment.notes}`}
          >
            <div className="fw-bold small">{appointment.patientName}</div>
            <div style={{ fontSize: "0.65rem" }}>{appointment.type}</div>
          </div>
        )}
      </div>
    );
};

  return (
    <CalendarGrid 
      title="Grafik Lekarza" 
      renderSlot={renderDoctorSlot} 
      getAppointmentCount={getAppointmentCount}
    />
  );
};

export default DoctorCalendar;