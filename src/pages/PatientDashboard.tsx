import { useState, useEffect, useCallback } from "react";
import PatientCalendar from "../components/Calendar/Patient/PatientCalendar";
import type { Appointment, Absence, AvailabilityTemplate, Doctor, AppointmentDto } from "../interfaces/interfaces";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { getBackend } from "../services/backendSelector";
import Cart from "../components/Calendar/Patient/Cart";
import { useAuth } from "../hooks/AuthContext";
import { useRealtimeData } from "../hooks/useRealtimeData";

export interface PatientDashboardProps {
  userId: string;
}

export const PatientDashboard = ({ userId }: PatientDashboardProps) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  const backend = getBackend();
  const { user, refreshUser } = useAuth();

  const fetchAppointments = useCallback(() => {
    return backend.fetchAppointments();
  }, [backend]);

  const { data: rawAppointments, loading } = useRealtimeData<Appointment[]>(
    fetchAppointments,
    'appointments', 
    []
  );
  const appointments = rawAppointments || [];
  
  const fetchAbsences = useCallback(async () => {
    if (!selectedDoctor) 
      return [];
    return backend.fetchAbsences(selectedDoctor.id);
  }, [backend, selectedDoctor]);

  const { data: rawAbsences } = useRealtimeData<Absence[]>(
    fetchAbsences,
    'absences',
    [selectedDoctor]
  );
  const absences = rawAbsences || [];

  const fetchAvailability = useCallback(async () => {
    if (!selectedDoctor) return [];
    return backend.fetchDoctorAvailability(selectedDoctor.id);
  }, [backend, selectedDoctor]);

  const { data: rawTemplates } = useRealtimeData<AvailabilityTemplate[]>(
    fetchAvailability,
    'availabilities',
    [selectedDoctor]
  );
  const availabilityTemplates = rawTemplates || [];

  useEffect(() => {
    backend.fetchDoctors().then(setDoctors);
  }, []);

  const myAppointments = appointments.filter(app => app.patientId === userId);
  const cartAppointments = myAppointments.filter(app => !app.isPaid);
  const paidAppointments = myAppointments.filter(app => app.isPaid);

  const handleReservationSave = async (appointment: AppointmentDto) => {
    const { doctorId, startTime, durationMinutes } = appointment;
    const appointmentStart = parseISO(startTime);
    const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60000);

    const dateStr = format(appointmentStart, "yyyy-MM-dd");

    const availabilityForDay = availabilityTemplates
        .filter(a => a.doctorId === doctorId)
        .flatMap(a => {
        const days = eachDayOfInterval({
            start: parseISO(a.validFrom),
            end: parseISO(a.validTo)
        }).filter(d => a.weekdays.includes(d.getDay()));

        return days.map(d => ({
            date: format(d, "yyyy-MM-dd"),
            timeRanges: a.timeRanges
        }));
        })
        .find(a => a.date === dateStr);

    if (!availabilityForDay) {
        alert("Lekarz nie przyjmuje w tym dniu.");
        return;
    }

    const slotValid = availabilityForDay.timeRanges.some(range => {
        const rangeStart = parseISO(`${dateStr}T${range.from}`);
        const rangeEnd = parseISO(`${dateStr}T${range.to}`);
        return appointmentStart >= rangeStart && appointmentEnd <= rangeEnd;
    });

    if (!slotValid) {
        alert("Wybrany slot nie mieści się w dostępnych godzinach lekarza.");
        return;
    }

    const conflict = appointments.some(app => {
        if (app.doctorId !== doctorId) return false;
        const appStart = parseISO(app.startTime);
        const appEnd = new Date(appStart.getTime() + app.durationMinutes * 60000);
        return (appointmentStart < appEnd && appointmentEnd > appStart);
    });

    if (conflict) {
        alert("Wybrany slot koliduje z inną wizytą.");
        return;
    }

    await backend.saveAppointment(appointment);
  };

  const handlePay = async (appointmentsToPay: Appointment[]) => {
    if (!user) return false;
    
    const totalCost = appointmentsToPay.reduce((sum, app) => sum + app.cost, 0);

    if (user.walletBalance < totalCost) {
       alert(`Masz za mało środków w portfelu! (Wymagane: ${totalCost} PLN, Dostępne: ${user.walletBalance} PLN)`);
       return false;
    }

    if (!window.confirm(`Czy chcesz opłacić ${appointmentsToPay.length} wizyt za łączną kwotę ${totalCost} PLN?`)) {
        return false;
    }

    try {
        for (const appt of appointmentsToPay) {
            await backend.payForAppointment(appt.id, appt.cost, user.id);
        }
        await refreshUser(); 
        return true;
    } catch (e: any) {
        console.error(e);
        alert("Błąd płatności: " + e.message);
        return false;
    }
  };

  const handleCancelReservation = async (appointmentId: string) => {
    try {
      await backend.cancelAppointment(appointmentId);
    } catch (error) {
      console.error("Błąd podczas usuwania wizyty:", error);
      alert("Nie udało się usunąć wizyty.");
    }
  };

  useEffect(() => {
    if(!user?.walletBalance) {
      refreshUser();
    }
  }, []);

  return (
      !loading &&
      (<>
      <div className="row">
        <div className="col-md-2 mb-3">
          <div className="card p-2">
            <h6 className="small font-weight-bold">Lekarze</h6>
            <ul className="list-group list-group-flush small">
              {doctors.map(doc => (
                <li
                  key={doc.id}
                  className={`list-group-item px-2 ${selectedDoctor?.id === doc.id ? "active" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedDoctor(doc)}
                >
                  {doc.firstName} {doc.lastName}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-md-7">
          {selectedDoctor ? (
            <PatientCalendar
              appointments={appointments?.filter(app => app.doctorId === selectedDoctor.id)}
              absences={absences}
              availabilityTemplates={availabilityTemplates}
              doctorId={selectedDoctor.id}
              patientId={userId}
              onReservationSave={handleReservationSave}
              onCancelAppointment={handleCancelReservation}
            />
          ) : (
            <div className="alert alert-info mt-5 text-center">
              Wybierz lekarza z listy po lewej stronie.
            </div>
          )}
        </div>

        <div className="col-md-3">
            <Cart 
                appointments={cartAppointments} 
                onPay={handlePay} 
                onCancel={handleCancelReservation}
            />
            
            { paidAppointments && paidAppointments.length > 0 && (
              <div className="card mt-3">
                <div className="card-header bg-success text-white">
                  Twoje opłacone wizyty
                </div>
                <ul className="list-group list-group-flush">
                  {paidAppointments.map(app => (
                    <li key={app.id} className="list-group-item d-flex justify-content-between">
                      <span>{app.startTime.replace("T", " ")}</span>
                      <span className="badge bg-success">Opłacone</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-dark me-3">
              Portfel: <strong>{ user?.walletBalance?.toFixed(2) } PLN</strong>
            </div>
        </div>
      </div>
    </>
    ));
};