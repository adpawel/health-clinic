import { useEffect, useState, useMemo, useCallback } from "react";
import DoctorCalendar from "../components/Calendar/Doctor/DoctorCalendar";
import AvailabilityModal from "../components/AvailabilityModal/AvailabilityModal";
import type {
  Absence,
  AbsenceDto,
  Appointment,
  AvailabilityTemplate,
  AvailabilityTemplateDto,
  SaveAvailabilityPayload,
  TimeRange
} from "../interfaces/interfaces";
import { parseISO, eachDayOfInterval, getDay, format, isWithinInterval, endOfDay, startOfDay, isBefore } from "date-fns";
import AbsenceModal from "../components/AbsenceModal/AbsenceModal";
import { getBackend } from "../services/backendSelector";
import { useRealtimeData } from "../hooks/useRealtimeData";

export interface DoctorDashboardProps {
  doctorId: string;
}

function mergeAvailabilityByDate(slots: { date: string; timeRanges: TimeRange[] }[]) {
  const map = new Map<string, TimeRange[]>();

  slots.forEach(slot => {
    const existing = map.get(slot.date) || [];
    map.set(slot.date, [...existing, ...slot.timeRanges]);
  });

  return Array.from(map.entries()).map(([date, ranges]) => ({
    date,
    timeRanges: mergeTimeRanges(ranges)
  }));
}

function mergeTimeRanges(ranges: TimeRange[]) {
  const sorted = [...ranges].sort((a, b) => a.from.localeCompare(b.from));
  const result: TimeRange[] = [];

  for (const r of sorted) {
    const last = result[result.length - 1];
    if (!last || r.from > last.to) {
      result.push({ ...r });
    } else {
      last.to = last.to > r.to ? last.to : r.to;
    }
  }

  return result;
}

export const DoctorDashboard = ({ doctorId }: DoctorDashboardProps) => {
    const [showModal, setShowModal] = useState(false);
    const [showAbsenceModal, setShowAbsenceModal] = useState(false);

    const [absences, setAbsences] = useState<Absence[]>([]);
    const [availabilityTemplates, setAvailabilityTemplates] = useState<AvailabilityTemplate[]>([]);
    const backend = getBackend();

    const fetchDoctorAppointments = useCallback(() => {
      return backend.fetchDoctorAppointments(doctorId);
    }, [backend, doctorId]);

    const { data: rawAppointments, refresh } = useRealtimeData<Appointment[]>(
      fetchDoctorAppointments,
      'appointments',
      []
    );

    const appointments = rawAppointments || [];

    useEffect(() => {
        const loadData = async () => {

            try {
              const [absencesData, availabilityTemplatesData] = await Promise.all([
                  backend.fetchAbsences(doctorId),
                  backend.fetchDoctorAvailability(doctorId)
                ]);

              setAbsences(absencesData);
              setAvailabilityTemplates(availabilityTemplatesData);
            } catch (error) {
              console.error("Błąd ładowania danych lekarza:", error);
            }
        };

        loadData();
    }, [doctorId]);

  const generatedAvailability = useMemo(() => {
    return mergeAvailabilityByDate(
      availabilityTemplates.flatMap(template => {
        const days = eachDayOfInterval({
          start: parseISO(template.validFrom),
          end: parseISO(template.validTo)
        });

        return days
          .filter(d => template.weekdays.includes(getDay(d)))
          .map(d => ({
            date: format(d, "yyyy-MM-dd"),
            timeRanges: template.timeRanges
          }));
      })
    );
  }, [availabilityTemplates]);

  const hasAbsenceConflict = (
    startDate: string,
    endDate: string,
    selectedDays: number[]
  ) => {
    const rangeStart = startOfDay(parseISO(startDate));
    const rangeEnd = endOfDay(parseISO(endDate));

    return absences.some(abs => {
      const absDateObj = typeof abs.date === 'string' ? parseISO(abs.date) : abs.date;
      
      const isDayMatching = selectedDays.length === 0 || selectedDays.includes(getDay(absDateObj));

      return (
        isWithinInterval(absDateObj, {
          start: rangeStart,
          end: rangeEnd
        }) && isDayMatching
      );
    });
  };

  const handleSaveAvailability = async (data: SaveAvailabilityPayload) => {
    const { startDate, endDate, selectedDays, timeRanges } = data;

    const validRanges = timeRanges.filter(
      r => r.from && r.to && r.from < r.to
    );

    if (!startDate || !endDate || selectedDays.length === 0 || validRanges.length === 0) {
      alert("Niepoprawne dane");
      return;
    }

    if (hasAbsenceConflict(startDate, endDate, selectedDays)) {
      alert("Nie można dodać dostępności w dniu absencji");
      return;
    }

    const newTemplate: AvailabilityTemplateDto = {
      doctorId,
      validFrom: startDate,
      validTo: endDate,
      weekdays: selectedDays,
      timeRanges: validRanges.map(r => ({ ...r }))
    }

    const id = await backend.saveAvailability(newTemplate);
    setAvailabilityTemplates(prev => [...prev, {
      ...newTemplate,
      id: id
    }]);

    setShowModal(false);
  };

  const handleSaveAbsence = async (dateISO: string, reason = "") => {
    const absenceDate = new Date(dateISO);

    const today = startOfDay(new Date());
    const selectedDate = startOfDay(absenceDate);

    if (isBefore(selectedDate, today)) {
        alert("Nie można dodać absencji w dacie z przeszłości.");
        return;
    }

    const newAbsence: AbsenceDto = {
      doctorId,
      date: absenceDate,
      startTime: "00:00",
      endTime: "23:59",
      reason,
      type: "ABSENCE"
    };

    const id = await backend.saveAbsence(newAbsence);
    
    setAbsences(prev => [...prev, {
      ...newAbsence,
      id: id
    }]);
    
    const conflictedAppointments = appointments.filter(app =>
      format(parseISO(app.startTime), "yyyy-MM-dd") === format(absenceDate, "yyyy-MM-dd")
    );

    if (conflictedAppointments.length > 0) {
      conflictedAppointments.forEach(app => {
        backend.cancelAppointment(app.id);
        console.log(
          `Powiadomienie do ${app.patientName}: wizyta ${app.startTime} została odwołana`
        );
      });
      alert(`Dodano absencję. Anulowano ${conflictedAppointments.length} wizyt.`);
    }

    setShowAbsenceModal(false);
  };

  return (
    <>
      <div className="row">
        <div className="col-md-9">
          <DoctorCalendar
            appointments={appointments}
            absences={absences}
            availabilitySlots={generatedAvailability}
          />
        </div>

        <div className="col-md-3">
          <div className="card p-3 mb-3">
            <h6>Opcje Lekarza</h6>

            <button
              className="btn btn-sm btn-secondary mb-2"
              onClick={() => setShowModal(true)}
            >
              Definiuj Dostępność
            </button>

            <button
              className="btn btn-sm btn-danger"
              onClick={() => setShowAbsenceModal(true)}
            >
              Dodaj Absencję
            </button>
          </div>
        </div>
      </div>

      <AvailabilityModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAvailability}
      />

      <AbsenceModal 
        show={showAbsenceModal} 
        onClose={() => setShowAbsenceModal(false)} 
        onSave={handleSaveAbsence}/>
    </>
  );
};
