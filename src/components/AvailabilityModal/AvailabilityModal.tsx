import { useState } from 'react';
import type { SaveAvailabilityPayload, TimeRange } from '../../interfaces/interfaces';

interface AvailabilityModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: SaveAvailabilityPayload) => void;
}

const AvailabilityModal = ({ show, onClose, onSave }: AvailabilityModalProps) => {
  const [activeTab, setActiveTab] = useState<'cyclic' | 'single'>('cyclic');
  const [singleDate, setSingleDate] = useState('');
  const days = [
    { label: 'Pon', value: 1 }, { label: 'Wt', value: 2 }, { label: 'Śr', value: 3 },
    { label: 'Czw', value: 4 }, { label: 'Pt', value: 5 }, { label: 'Sob', value: 6 }, { label: 'Ndz', value: 0 }
  ];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([{ from: '08:00', to: '12:00' }]);

  const today = new Date().toISOString().split('T')[0];

  if (!show) return null;

  const toggleDay = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const addTimeRange = () => setTimeRanges([...timeRanges, { from: '', to: '' }]);

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Definiowanie dostępności</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'cyclic' ? 'active' : ''}`} onClick={() => setActiveTab('cyclic')}>Cykliczna</button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>Jednodniowa</button>
              </li>
            </ul>

            {activeTab === 'cyclic' ? (
              <div className="container">
                <div className="row mb-3">
                  <div className="col">
                    <label className="form-label">Data od</label>
                    <input type="date" className="form-control" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="col">
                    <label className="form-label">Data do</label>
                    <input type="date" className="form-control" value={endDate} min={startDate || today} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label d-block">Maska dni tygodnia </label>
                  <div className="btn-group w-100">
                    {days.map(day => (
                      <button 
                        key={day.value}
                        type="button"
                        className={`btn btn-outline-primary ${selectedDays.includes(day.value) ? 'active' : ''}`}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Maska konsultacji (przedziały czasowe)</label>
                  {timeRanges.map((range, index) => (
                    <div key={index} className="d-flex gap-2 mb-2 align-items-center">
                      <input type="time" className="form-control" value={range.from} onChange={e => {
                        const newRanges = [...timeRanges];
                        newRanges[index].from = e.target.value;
                        setTimeRanges(newRanges);
                      }} />
                      <span>do</span>
                      <input type="time" className="form-control" value={range.to} onChange={e => {
                        const newRanges = [...timeRanges];
                        newRanges[index].to = e.target.value;
                        setTimeRanges(newRanges);
                      }} />
                    </div>
                  ))}
                  <button className="btn btn-sm btn-secondary" onClick={addTimeRange}>+ Dodaj przedział</button>
                </div>
              </div>
            ) : (
              <div className="container">
                <div className="mb-3">
                  <label className="form-label">Data</label>
                  <input
                    type="date"
                    className="form-control"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Dostępne godziny</label>
                  {timeRanges.map((range, index) => (
                    <div key={index} className="d-flex gap-2 mb-2 align-items-center">
                      <input
                        type="time"
                        className="form-control"
                        value={range.from}
                        onChange={e => {
                          const copy = [...timeRanges];
                          copy[index] = { ...copy[index], from: e.target.value };
                          setTimeRanges(copy);
                        }}
                      />
                      <span>do</span>
                      <input
                        type="time"
                        className="form-control"
                        value={range.to}
                        onChange={e => {
                          const copy = [...timeRanges];
                          copy[index] = { ...copy[index], to: e.target.value };
                          setTimeRanges(copy);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={addTimeRange}
                  >
                    + Dodaj przedział
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (activeTab === 'cyclic') {
                  onSave({
                    startDate,
                    endDate,
                    selectedDays,
                    timeRanges
                  });
                } else {
                  if (!singleDate) {
                    alert('Wybierz datę');
                    return;
                  }
                  const weekday = new Date(singleDate).getDay();
                  onSave({
                    startDate: singleDate,
                    endDate: singleDate,
                    selectedDays: [weekday],
                    timeRanges
                  });
                }
              }}
            >
              Zapisz dostępność
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;