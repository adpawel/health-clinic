import mongoose, { Schema, Model, Document } from 'mongoose';
import { 
  Appointment, AppointmentDto, Doctor, DoctorDto, Absence, AbsenceDto, 
  AvailabilityTemplate, AvailabilityTemplateDto, DBUser, UserRole, 
  PersistenceMode, Review, ReviewDto, 
  AppNotification
} from '../types/types.js';
import { DatabaseDAO } from './DatabaseDAO.js';

const UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  phoneNumber: String,
  pesel: String,
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  doctorId: String,
  isBanned: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  activeRefreshToken: String,
  activeAccessToken: String
}, { timestamps: true });

const DoctorSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  title: String,
  specializations: [String],
  email: { type: String, required: true, unique: true },
  accountId: String
});

const AppointmentSchema = new Schema({
  patientName: String,
  patientId: String,
  patientGender: String,
  patientAge: Number,
  type: String,
  startTime: String,
  durationMinutes: Number,
  isPaid: { type: Boolean, default: false },
  notes: String,
  doctorId: String,
  cost: Number,
  reservedAt: Number
});

const AbsenceSchema = new Schema({
  doctorId: String,
  date: Date,
  startTime: String,
  endTime: String,
  reason: String,
  type: String
});

const AvailabilitySchema = new Schema({
  doctorId: String,
  validFrom: String,
  validTo: String,
  weekdays: [Number],
  timeRanges: [{ from: String, to: String }]
});

const ReviewSchema = new Schema({
  doctorId: String,
  patientId: String,
  patientName: String,
  rating: Number,
  comment: String,
  createdAt: { type: Number, default: Date.now }
});

const ConfigSchema = new Schema({
  key: { type: String, unique: true, default: 'main_config' },
  persistenceMode: { type: String, enum: ['LOCAL', 'SESSION', 'NONE'], default: 'LOCAL' }
});

const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['ALERT', 'INFO', 'SUCCESS'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
  read: { type: Boolean, default: false }
});

const UserModel = mongoose.model('User', UserSchema);
const DoctorModel = mongoose.model('Doctor', DoctorSchema);
const AppointmentModel = mongoose.model('Appointment', AppointmentSchema);
const AbsenceModel = mongoose.model('Absence', AbsenceSchema);
const AvailabilityModel = mongoose.model('Availability', AvailabilitySchema);
const ReviewModel = mongoose.model('Review', ReviewSchema);
const ConfigModel = mongoose.model('Config', ConfigSchema);
const NotificationModel = mongoose.model('Notification', NotificationSchema);

export class MongoDAO implements DatabaseDAO {
  
  constructor() {
    this.connect();
  }

  private async connect() {
    if (mongoose.connection.readyState === 0) {
      try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/med-app';
        await mongoose.connect(uri);
        console.log("Połączono z MongoDB Atlas");
        
        const config = await ConfigModel.findOne({ key: 'main_config' });
        if (!config) {
            await ConfigModel.create({ key: 'main_config', persistenceMode: 'LOCAL' });
        }
      } catch (error) {
        console.error("Błąd połączenia z MongoDB:", error);
      }
    }
  }

  private mapDoc<T>(doc: any): T {
    if (!doc) return doc;
    const { _id, __v, ...rest } = doc.toObject ? doc.toObject() : doc;
    return { id: _id.toString(), ...rest } as T;
  }

  async getAppointments(doctorId?: string): Promise<Appointment[]> {
    const query = doctorId && doctorId !== 'wszystkie' ? { doctorId } : {};
    const docs = await AppointmentModel.find(query);
    return docs.map(this.mapDoc<Appointment>);
  }

  async saveAppointment(appointmentDto: AppointmentDto): Promise<string> {
    const newAppt = await AppointmentModel.create(appointmentDto);
    return newAppt._id.toString();
  }

  async deleteAppointment(id: string): Promise<void> {
    await AppointmentModel.findByIdAndDelete(id);
  }

  async markAppointmentsAsPaid(appointmentIds: string[]): Promise<void> {
    await AppointmentModel.updateMany(
      { _id: { $in: appointmentIds } },
      { $set: { isPaid: true } }
    );
  }

  async getAbsences(doctorId: string): Promise<Absence[]> {
    const docs = await AbsenceModel.find({ doctorId });
    return docs.map(this.mapDoc<Absence>);
  }

  async saveAbsence(absenceDto: AbsenceDto): Promise<string> {
    const newAbsence = await AbsenceModel.create(absenceDto);
    return newAbsence._id.toString();
  }

  async getDoctorAvailability(doctorId: string): Promise<AvailabilityTemplate[]> {
    const docs = await AvailabilityModel.find({ doctorId });
    return docs.map(this.mapDoc<AvailabilityTemplate>);
  }

  async saveAvailability(templateDto: AvailabilityTemplateDto): Promise<string> {
    const newTemplate = await AvailabilityModel.create(templateDto);
    return newTemplate._id.toString();
  }

  async getDoctors(): Promise<Doctor[]> {
    const docs = await DoctorModel.find();
    return docs.map(this.mapDoc<Doctor>);
  }

  async saveDoctor(doctorDto: DoctorDto): Promise<string> {
    const newDoctor = await DoctorModel.create(doctorDto);
    return newDoctor._id.toString();
  }

  async deleteDoctor(id: string): Promise<void> {
    await DoctorModel.findByIdAndDelete(id);
  }

  async findDoctorByEmail(email: string): Promise<string | null> {
    const doc = await DoctorModel.findOne({ email });
    return doc ? doc._id.toString() : null;
  }

  async findDoctorById(id: string): Promise<Doctor | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
    }

    const doc = await DoctorModel.findById(id);
    return doc ? this.mapDoc<Doctor>(doc) : null;
  }

  async getUsers(): Promise<DBUser[]> {
    const docs = await UserModel.find();
    return docs.map(this.mapDoc<DBUser>);
  }

  async findUserByEmail(email: string): Promise<DBUser | undefined> {
    const doc = await UserModel.findOne({ email });
    return doc ? this.mapDoc<DBUser>(doc) : undefined;
  }

  async findUserById(id: string): Promise<DBUser | undefined> {
    if (!mongoose.Types.ObjectId.isValid(id)) return undefined;
    const doc = await UserModel.findById(id);
    return doc ? this.mapDoc<DBUser>(doc) : undefined;
  }

  async saveUser(userData: any): Promise<string> {
    const { id, ...rest } = userData;
    const newUser = await UserModel.create({
        ...rest,
        walletBalance: 1000
    });
    return newUser._id.toString();
  }

  async toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { isBanned });
  }

  async updateUserBalance(userId: string, amountChange: number): Promise<number> {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("User not found");

    const currentBalance = user.walletBalance || 0;
    const newBalance = currentBalance + amountChange;

    if (newBalance < 0) {
        throw new Error("Niewystarczające środki");
    }

    user.walletBalance = newBalance;
    await user.save();
    return newBalance;
  }

  async updateUserRefreshToken(userId: string, token: string | null): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { activeRefreshToken: token });
  }

  async updateUserSessionToken(userId: string, token: string | null): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { activeAccessToken: token });
  }
  
  async clearAllRefreshTokens(): Promise<void> {
    await UserModel.updateMany({}, { activeRefreshToken: null, activeAccessToken: null });
  }

  async getPersistenceMode(): Promise<PersistenceMode> {
    const config = await ConfigModel.findOne({ key: 'main_config' });
    return (config?.persistenceMode as PersistenceMode) || 'LOCAL';
  }

  async setPersistenceMode(mode: PersistenceMode): Promise<void> {
    await ConfigModel.findOneAndUpdate(
        { key: 'main_config' }, 
        { persistenceMode: mode }, 
        { upsert: true }
    );
  }

  async getReviewsByDoctorId(doctorId: string): Promise<Review[]> {
    const docs = await ReviewModel.find({ doctorId });
    return docs.map(this.mapDoc<Review>);
  }

  async findReviewById(reviewId: string): Promise<Review | undefined> {
    const doc = await ReviewModel.findById(reviewId);
    return doc ? this.mapDoc<Review>(doc) : undefined;
  }

  async findReviewByPatientAndDoctor(patientId: string, doctorId: string): Promise<Review | undefined> {
    const doc = await ReviewModel.findOne({ patientId, doctorId });
    return doc ? this.mapDoc<Review>(doc) : undefined;
  }

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const newReview = await ReviewModel.create({
        ...reviewData,
        createdAt: Date.now()
    });
    return this.mapDoc<Review>(newReview);
  }

  async updateReview(reviewId: string, updateData: Partial<ReviewDto>): Promise<void> {
    await ReviewModel.findByIdAndUpdate(reviewId, updateData);
  }

  async deleteReview(reviewId: string): Promise<void> {
    await ReviewModel.findByIdAndDelete(reviewId);
  }

  async saveNotification(notificationData: Omit<AppNotification, 'id'>): Promise<void> {
    await NotificationModel.create({
        ...notificationData,
        timestamp: notificationData.timestamp || Date.now()
    });
  }

  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const docs = await NotificationModel.find({ userId }).sort({ timestamp: -1 });

    return docs.map(doc => this.mapDoc<AppNotification>(doc));
  }
}