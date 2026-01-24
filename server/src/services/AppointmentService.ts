import { Server } from 'socket.io';
import { LowDbDAO } from '../dao/LowDbDAO.js';
import { MongoDAO } from '../dao/MongoDbDAO.js';
import { AppointmentDto } from '../types/types.js';

export class AppointmentService {
  private db: MongoDAO | LowDbDAO;
  private io: Server;

  constructor(db: any, io: Server) {
    this.db = db;
    this.io = io;
  }
  
  private isDateInPast(dateString: string): boolean {
    return new Date(dateString) < new Date();
  }

  private async isSlotTaken(doctorId: string, startTime: string, durationMinutes: number): Promise<boolean> {
    const start = new Date(startTime).getTime();
    const end = start + durationMinutes * 60 * 1000;

    // Kolizja z innymi wizytami
    const appointments = await this.db.getAppointments(doctorId);
    const hasAppointmentConflict = appointments.some((appt: any) => {
      const apptStart = new Date(appt.startTime).getTime();
      const apptEnd = apptStart + (appt.durationMinutes || 30) * 60 * 1000;

      return start < apptEnd && end > apptStart;
    });

    if (hasAppointmentConflict) return true;

    // Kolizja z nieobecnościami
    const absences = await this.db.getAbsences(doctorId);
    const hasAbsenceConflict = absences.some((abs: any) => {
        const apptDateStr = startTime.split('T')[0];
        const absDateStr = abs.date instanceof Date 
            ? abs.date.toISOString().split('T')[0] 
            : abs.date.toString().split('T')[0];
            
        return apptDateStr === absDateStr;
    });

    return hasAbsenceConflict;
  }

  async createAppointment(data: AppointmentDto) {
    if (this.isDateInPast(data.startTime)) {
        throw new Error("Nie można umówić wizyty w przeszłości.");
    }

    const isTaken = await this.isSlotTaken(data.doctorId, data.startTime, data.durationMinutes);
    if (isTaken) {
        throw new Error("Ten termin jest już zajęty lub lekarz jest nieobecny.");
    }

    const id = await this.db.saveAppointment(data);
    
    this.io.emit('DATA_CHANGED', { resource: 'appointments' });
    
    return id;
  }

  async cancelAppointment(appointmentId: string, userId: string, userRole: string) {
    const appointments = await this.db.getAppointments();
    const appt = appointments.find((a: any) => a.id === appointmentId);

    if (!appt) {
        return;
    }

    if (userRole !== 'admin' && userRole !== 'doctor' && appt.patientId !== userId) {
        throw new Error("Nie masz uprawnień do usunięcia tej wizyty.");
    }

    if (appt.isPaid) {
        console.log(`[Service] Zwrot ${appt.cost} PLN dla usera ${appt.patientId}`);
        await this.db.updateUserBalance(appt.patientId, appt.cost);
    }

    await this.db.deleteAppointment(appointmentId);

    this.io.emit('DATA_CHANGED', { resource: 'appointments' });
    this.io.emit('DATA_CHANGED', { resource: 'users' });
  }

  async payWithWallet(appointmentId: string, userId: string) {
    const appointments = await this.db.getAppointments();
    const appt = appointments.find((a: any) => a.id === appointmentId);

    if (!appt) throw new Error("Wizyta nie istnieje.");
    if (appt.isPaid) throw new Error("Wizyta już opłacona.");
    if (appt.patientId !== userId) throw new Error("To nie Twoja wizyta.");

    await this.db.updateUserBalance(userId, -appt.cost);
    
    await this.db.markAppointmentsAsPaid([appointmentId]);
    
    this.io.emit('DATA_CHANGED', { resource: 'appointments' });
    this.io.emit('DATA_CHANGED', { resource: 'users' });

    return { status: 'success', message: "Opłacono pomyślnie" };
  }
}