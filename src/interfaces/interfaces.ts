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

export const typeColorMap: Record<string, string> = {
  "pierwsza wizyta": "#007bff",   
  "wizyta kontrolna": "#28a745",  
  "choroba przewlekła": "#ffc107", 
  "recepta": "#17a2b8"            
};

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

export interface SaveAvailabilityPayload {
  startDate: string;
  endDate: string;
  selectedDays: number[];
  timeRanges: TimeRange[];
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
  walletBalance: number;
}

export type UserRole = 'patient' | 'doctor' | 'admin';

export type PersistenceMode = 'LOCAL' | 'SESSION' | 'NONE';

export interface UserRegistrationDto extends Omit<User, 'id' | 'role' | 'isBanned'> {
  password: string; 
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

export type AppMode = 
  | 'FIREBASE'
  | 'CUSTOM_LOCAL'
  | 'CUSTOM_MONGO';