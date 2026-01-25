import { Server } from 'socket.io';
import { AppointmentService } from './AppointmentService.js';
import { AbsenceDto, AppNotification } from '../types/types.js';
import { LowDbDAO } from 'src/dao/LowDbDAO.js';
import { MongoDAO } from 'src/dao/MongoDbDAO.js';

export class AbsenceService {
  private db: MongoDAO | LowDbDAO;
  private io: Server;
  private appointmentService: AppointmentService;

  constructor(db: any, io: Server, appointmentService: AppointmentService) {
    this.db = db;
    this.io = io;
    this.appointmentService = appointmentService;
  }

  private isDateInPast(dateString: string | Date): boolean {
    const dateToCheck = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  }

async createAbsence(data: AbsenceDto) {
    if (this.isDateInPast(data.date)) {
        throw new Error("Nie można dodać nieobecności w przeszłości.");
    }

    const id = await this.db.saveAbsence(data);

    const allAppointments = await this.db.getAppointments(data.doctorId);
    const absenceDateString = new Date(data.date).toISOString().split('T')[0];

    const conflictingAppointments = allAppointments.filter((appt: any) => {
        if (appt.doctorId !== data.doctorId) return false;
        if (!appt.startTime) return false;
        
        const apptDateString = appt.startTime.split('T')[0];
        return apptDateString === absenceDateString;
    });

    for (const appt of conflictingAppointments) {
        const newNotification: Omit<AppNotification, 'id'> = {
          userId: appt.patientId,
          type: 'ALERT',
          message: `Twoja wizyta w dniu ${absenceDateString} została odwołana przez lekarza z powodu nieobecności. Środki zostały zwrócone.`,
          timestamp: Date.now(),
          read: false
        };

        await this.db.saveNotification(newNotification);

        this.io.to(appt.patientId).emit('notification', {
            type: 'ALERT',
            message: `Twoja wizyta w dniu ${absenceDateString} została odwołana przez lekarza z powodu nieobecności.`
        });

        try {
            await this.appointmentService.cancelAppointment(appt.id, 'SYSTEM', 'admin');
        } catch (e) {
            console.error(`Błąd przy automatycznym anulowaniu wizyty ${appt.id}:`, e);
        }
    }

    this.io.emit('DATA_CHANGED', { resource: 'absences' });
    this.io.emit('DATA_CHANGED', { resource: 'appointments' });
    this.io.emit('DATA_CHANGED', { resource: 'users' });
    
    return id;
}
}