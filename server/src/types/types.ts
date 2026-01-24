export interface AppointmentDto {
  patientName: string;
  patientId: string;
  patientGender: string;
  patientAge: number;
  type: string;
  startTime: string; // ISO string
  durationMinutes: number;
  isPaid: boolean;
  notes: string;
  doctorId: string;
  cost: number;
};

export interface Appointment extends AppointmentDto {
  id: string;
}

export interface AbsenceDto {
  doctorId: string,
  date: Date, 
  startTime: string,
  endTime: string,
  reason: string,
  type: string
};

export interface Absence extends AbsenceDto {
  id: string;
}

export interface TimeRange {
  from: string;
  to: string;
}

export interface AvailabilityTemplateDto {
  doctorId: string;
  validFrom: string;
  validTo: string;       
  weekdays: number[];
  timeRanges: TimeRange[];
}

export interface AvailabilityTemplate extends AvailabilityTemplateDto {
  id: string;
}

export interface DoctorDto {
  firstName: string;
  lastName: string;
  title: string;
  specializations: string[];
  email: string;
}

export interface Doctor extends DoctorDto {
  id: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  pesel?: string;
  dateOfBirth?: string;
  role: UserRole;
  doctorId?: string;
  isBanned?: boolean;
  walletBalance?: number;
}

export type UserRole = 'patient' | 'doctor' | 'admin';

export type PersistenceMode = 'LOCAL' | 'SESSION' | 'NONE';

export interface DBUser extends User {
  password?: string;
  activeRefreshToken?: string | null;
  activeAccessToken?: string | null;
}

export interface Review {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface ReviewDto {
  doctorId: string;
  rating: number;
  comment: string;
}