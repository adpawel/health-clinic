import { startOfWeek, addWeeks, subWeeks, addDays, format, isSameDay, differenceInMinutes, set } from 'date-fns';
import { pl } from 'date-fns/locale';
import './CalendarGrid.css';
import { useEffect, useState } from 'react';

interface CalendarGridProps {
  title: string;
  renderSlot: (date: Date, hour: string) => React.ReactNode;
  getAppointmentCount?: (date: Date) => number; 
}

const CalendarGrid = ({ title, renderSlot, getAppointmentCount }: CalendarGridProps) => {
  const hours = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00",
    "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
    "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

  const [weekStart, setWeekStart] = useState<Date>(() => 
      startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const handleNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));
  const handlePrevWeek = () => setWeekStart(prev => subWeeks(prev, 1));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTimeIndicatorTop = (columnDate: Date, slotTime: string): number | null => {
    if (!isSameDay(columnDate, now)) return null;

    const [hours, minutes] = slotTime.split(':').map(Number);
    
    const slotStart = set(columnDate, { hours, minutes, seconds: 0, milliseconds: 0 });
    
    const diff = differenceInMinutes(now, slotStart);

    if (diff >= 0 && diff < 30) {
      return (diff / 30) * 100;
    }

    return null;
  };

  return (
    <div className="calendar-card card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <div className="d-flex align-items-center gap-3">
          <span className="fw-bold">{format(weekDays[0], 'dd.MM')} - {format(weekDays[6], 'dd.MM')}</span>
          <div className="btn-group">
            <button className="btn btn-secondary btn-sm" onClick={handlePrevWeek}>&larr;</button>
            <button className="btn btn-secondary btn-sm" onClick={handleNextWeek}>&rarr;</button>
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered mb-0 calendar-table">
          <thead>
            <tr className="bg-light sticky-top">
              <th className="time-col">Godzina</th>
              {weekDays.map(date => (
                <th key={date.toString()} className={`text-center day-header ${isSameDay(date, today) ? 'today-header' : ''}`}>
                  <div className="text-capitalize">{format(date, 'EEEE', { locale: pl })}</div>
                  <small className="text-muted">{format(date, 'dd.MM.yyyy')}</small>
                  {getAppointmentCount && (
                    <div className="mt-1">
                      <span className="badge rounded-pill bg-blue text-light">
                        Wizyt: {getAppointmentCount(date)}
                      </span>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(hour => (
              <tr key={hour}>
                <td className="time-cell text-center align-middle">{hour}</td>
                {weekDays.map(date => {
                  const indicatorPosition = getTimeIndicatorTop(date, hour);
                  
                  return (
                    <td 
                      key={`${date.toString()}-${hour}`} 
                      className="slot-cell p-0 position-relative"
                    >
                      {indicatorPosition !== null && (
                        <div 
                          className="current-time-indicator"
                          style={{ top: `${indicatorPosition}%` }}
                          title={`Aktualny czas: ${format(now, 'HH:mm')}`}
                        />
                      )}
                      
                      {renderSlot(date, hour)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalendarGrid;