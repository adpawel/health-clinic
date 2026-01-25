import { Absence, AbsenceDto, AppNotification, Appointment, AppointmentDto, AvailabilityTemplate, AvailabilityTemplateDto, Doctor, DoctorDto, PersistenceMode, User } from "src/types/types.js";

export interface DatabaseDAO {
  getAppointments(doctorId?: string): Promise<Appointment[]>;
  saveAppointment(appointment: AppointmentDto): Promise<string>;
  deleteAppointment(id: string): Promise<void>;
  
  markAppointmentsAsPaid(appointmentIds: string[]): Promise<void>;

  getAbsences(doctorId: string): Promise<Absence[]>;
  saveAbsence(absence: AbsenceDto): Promise<string>;

  getDoctorAvailability(doctorId: string): Promise<AvailabilityTemplate[]>;
  saveAvailability(template: AvailabilityTemplateDto): Promise<string>;

  getDoctors(): Promise<Doctor[]>;
  saveDoctor(doctor: DoctorDto): Promise<string>;
  deleteDoctor(id: string): Promise<void>;
  
  findDoctorByEmail(email: string): Promise<string | null>;
  findDoctorById(id: string): Promise<Doctor | null>;

  getUsers(): Promise<User[]>;
  saveUser(user: any): Promise<string>;
  toggleUserBan(userId: string, isBanned: boolean): Promise<void>;
  
  getPersistenceMode(): Promise<PersistenceMode>;
  setPersistenceMode(mode: PersistenceMode): Promise<void>;
  updateUserRefreshToken(userId: string, token: string | null): Promise<void>;
  saveNotification(notification: Omit<AppNotification, 'id'>): Promise<void>;
  getUserNotifications(userId: string): Promise<AppNotification[]>;

}