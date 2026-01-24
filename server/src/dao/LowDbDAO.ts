import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DatabaseDAO } from './DatabaseDAO.js'; 
import { 
    Appointment, 
    Doctor, 
    Absence, 
    AvailabilityTemplate,
    PersistenceMode, 
    DBUser,
    Review,
    ReviewDto
} from '../types/types.js';

interface Data {
  appointments: Record<string, Appointment>;
  doctors: Record<string, Doctor>;
  users: Record<string, DBUser>;
  absences: Record<string, Absence>;
  availabilities: Record<string, AvailabilityTemplate>;
  reviews: Review[];
  system_config: { persistenceMode: PersistenceMode };
}

const defaultData: Data = {
  appointments: {},
  doctors: {},
  users: {},
  absences: {},
  availabilities: {},
  reviews: [],
  system_config: { persistenceMode: 'LOCAL' }
};

export class LowDbDAO implements DatabaseDAO {
  private db: Low<Data>;

  constructor() {
    const adapter = new JSONFile<Data>('db.json');
    this.db = new Low(adapter, defaultData);
  }

  private async init() {
    await this.db.read();
    this.db.data ||= defaultData;
    this.db.data.appointments ||= {};
    this.db.data.doctors ||= {};
    this.db.data.users ||= {};
    this.db.data.absences ||= {};
    this.db.data.availabilities ||= {};
    this.db.data.reviews ||= [];
    this.db.data.system_config ||= { persistenceMode: 'LOCAL' };
  }

  async getAppointments(doctorId?: string): Promise<Appointment[]> {
    await this.init();
    const all = Object.values(this.db.data.appointments);
    if (doctorId && doctorId !== 'wszystkie') {
      return all.filter((a) => a.doctorId === doctorId);
    }
    return all;
  }

  async saveAppointment(appointmentData: any): Promise<string> {
    await this.init();
    const id = appointmentData.id || `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newAppointment = { ...appointmentData, id } as Appointment;
    this.db.data.appointments[id] = newAppointment;
    
    await this.db.write();
    return id;
  }

  async deleteAppointment(id: string): Promise<void> {
    await this.init();
    if (this.db.data.appointments[id]) {
        delete this.db.data.appointments[id];
        await this.db.write();
    }
  }

  async markAppointmentsAsPaid(appointmentIds: string[]): Promise<void> {
    await this.init();
    let changed = false;
    for (const id of appointmentIds) {
      if (this.db.data.appointments[id]) {
        this.db.data.appointments[id].isPaid = true;
        changed = true;
      }
    }
    if (changed) await this.db.write();
  }

  async getAbsences(doctorId: string): Promise<Absence[]> {
    await this.init();
    const all = Object.values(this.db.data.absences);
    return all.filter(a => a.doctorId === doctorId);
  }

  async saveAbsence(absenceData: any): Promise<string> {
    await this.init();
    const id = absenceData.id || `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newAbsence = { ...absenceData, id } as Absence;
    this.db.data.absences[id] = newAbsence;
    
    await this.db.write();
    return id;
  }

  async getDoctorAvailability(doctorId: string): Promise<AvailabilityTemplate[]> {
    await this.init();
    const all = Object.values(this.db.data.availabilities);
    return all.filter(t => t.doctorId === doctorId);
  }

  async saveAvailability(templateData: any): Promise<string> {
    await this.init();
    const id = templateData.id || `avail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTemplate = { ...templateData, id } as AvailabilityTemplate;
    this.db.data.availabilities[id] = newTemplate;
    
    await this.db.write();
    return id;
  }

  async getDoctors(): Promise<Doctor[]> {
    await this.init();
    return Object.values(this.db.data.doctors);
  }

  async saveDoctor(doctorData: any): Promise<string> {
    await this.init();
    const id = doctorData.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newDoctor = { ...doctorData, id } as Doctor;
    this.db.data.doctors[id] = newDoctor;
    
    await this.db.write();
    return id;
  }

  async deleteDoctor(id: string): Promise<void> {
    await this.init();
    if(this.db.data.doctors[id]) {
        delete this.db.data.doctors[id];
        await this.db.write();
    }
  }

  async findDoctorByEmail(email: string): Promise<string | null> {
    await this.init();
    const doctors = Object.values(this.db.data.doctors);
    const found = doctors.find(d => d.email === email);
    return found ? found.id : null;
  }

  async getUsers(): Promise<DBUser[]> {
    await this.init();
    return Object.values(this.db.data.users);
  }

  async findUserByEmail(email: string): Promise<DBUser | undefined> {
    await this.init();
    const users = Object.values(this.db.data.users);
    return users.find(u => u.email === email);
  }

  async findUserById(id: string): Promise<DBUser | undefined> {
    await this.init();
    return this.db.data.users[id];
  }

  async saveUser(userData: DBUser): Promise<string> {
    await this.init();
    const id = `user_${Date.now()}`;
    
    const newUser = { 
      ...userData, 
      id,
      walletBalance: 1000
    } as DBUser;

    this.db.data.users[id] = newUser;
    
    await this.db.write();
    return id;
  }

  async toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
    await this.init();
    if (this.db.data.users[userId]) {
      this.db.data.users[userId].isBanned = isBanned;
      await this.db.write();
    }
  }

  async getPersistenceMode(): Promise<PersistenceMode> {
    await this.init();
    return this.db.data.system_config.persistenceMode;
  }

  async setPersistenceMode(mode: PersistenceMode): Promise<void> {
    await this.init();
    this.db.data.system_config.persistenceMode = mode;
    await this.db.write();
  }

  async updateUserRefreshToken(userId: string, token: string | null) {
    await this.init();
    if (this.db.data.users[userId]) {
        this.db.data.users[userId].activeRefreshToken = token;
        await this.db.write();
    }
  }

  async clearAllRefreshTokens(): Promise<void> {
    await this.init();
    const users = Object.values(this.db.data.users);
    
    users.forEach(user => {
        user.activeRefreshToken = null;
    });
    
    await this.db.write();
  }

  async getReviewsByDoctorId(doctorId: string): Promise<Review[]> {
    await this.init();
    return this.db.data.reviews.filter((r) => r.doctorId === doctorId);
  }

  async findReviewById(reviewId: string): Promise<Review | undefined> {
    await this.init();
    return this.db.data.reviews.find((r) => r.id === reviewId);
  }

  async findReviewByPatientAndDoctor(patientId: string, doctorId: string): Promise<Review | undefined> {
    await this.init();
    return this.db.data.reviews.find((r) => r.patientId === patientId && r.doctorId === doctorId);
  }

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    await this.init();
    
    const newReview: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      ...reviewData
    };

    this.db.data.reviews.push(newReview);
    await this.db.write();
    return newReview;
  }

  async updateReview(reviewId: string, updateData: Partial<ReviewDto>): Promise<void> {
    await this.init();
    const reviewIndex = this.db.data.reviews.findIndex((r) => r.id === reviewId);
    
    if (reviewIndex >= 0) {
      this.db.data.reviews[reviewIndex] = {
        ...this.db.data.reviews[reviewIndex],
        ...updateData
      };
      await this.db.write();
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    await this.init();
    // Filtrowanie tablicy w celu usunięcia elementu
    const initialLength = this.db.data.reviews.length;
    this.db.data.reviews = this.db.data.reviews.filter((r) => r.id !== reviewId);
    
    if (this.db.data.reviews.length !== initialLength) {
        await this.db.write();
    }
  }

  async updateUserBalance(userId: string, amountChange: number): Promise<number> {
    await this.init();
    const user = this.db.data.users[userId];
    if (!user) throw new Error("User not found");

    user.walletBalance = (user.walletBalance || 0) + amountChange;
    
    if (user.walletBalance < 0) throw new Error("Niewystarczające środki");

    await this.db.write();
    return user.walletBalance;
  }

  async updateUserSessionToken(userId: string, token: string | null): Promise<void> {
    await this.init();
    if (this.db.data.users[userId]) {
        this.db.data.users[userId].activeAccessToken = token;
        await this.db.write();
    }
  }
}