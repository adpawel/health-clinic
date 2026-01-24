import type { Absence, AbsenceDto, Appointment, AppointmentDto, AvailabilityTemplate, AvailabilityTemplateDto, Doctor, DoctorDto, PersistenceMode, Review, ReviewDto, User } from "../interfaces/interfaces";

export interface BackendAPI {
  fetchAppointments(): Promise<Appointment[]>;
  fetchDoctorAppointments(doctorId: string): Promise<Appointment[]>;
  fetchAbsences(doctorId: string): Promise<Absence[]>;
  fetchDoctorAvailability(doctorId: string): Promise<AvailabilityTemplate[]>;
  fetchDoctors(): Promise<Doctor[]>;
  findDoctorById(id: string): Promise<Doctor | undefined>;
  fetchUsers(): Promise<User[]>;

  saveAppointment(appointment: AppointmentDto): Promise<string>;
  saveAbsence(absence: AbsenceDto): Promise<string>;
  saveAvailability(template: AvailabilityTemplateDto): Promise<string>;
  saveDoctor(doctorData: DoctorDto): Promise<string>;

  deleteDoctor(doctorId: string): Promise<void>;
  cancelAppointment(appointmentId: string): Promise<void>;

  markAppointmentsAsPaid(appointmentIds: string[]): Promise<void>;

  getPersistenceMode(): Promise<PersistenceMode>;
  setPersistenceMode(mode: PersistenceMode): Promise<void>;

  findDoctorByEmail(email: string): Promise<string | null>;
  toggleUserBan(userId: string, isBanned: boolean): Promise<void>;
  
  getDoctorReviews(doctorId: string): Promise<Review[]>;
  addReview(review: ReviewDto, patientId: string, patientName: string): Promise<Review>;
  updateReview(reviewId: string, review: ReviewDto): Promise<void>;
  deleteReview(reviewId: string): Promise<void>;
  payForAppointment(apptId: string, apptCost: number, userId: string): Promise<void>;
}
