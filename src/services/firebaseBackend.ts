import { ref, get, push, update, set, remove, runTransaction, orderByChild, limitToLast, query } from "firebase/database";
import { db } from "./firebaseConfig";
import type { BackendAPI } from "./backend.types";
import type { Appointment, Absence, AvailabilityTemplate, PersistenceMode, AbsenceDto, Review, ReviewDto, Doctor } from "../interfaces/interfaces";
import type { AppNotification } from "./notifications/notification.types";

export const firebaseBackend: BackendAPI = {
  
  async fetchDoctorAppointments(doctorId) {
    const snapshot = await get(ref(db, "appointments"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    return Object.entries(data)
      .map(([key, value]: any) => ({
        ...value,
        id: key
      }))
      .filter((a: Appointment) => a.doctorId === doctorId);
  },

  async fetchAppointments() {
    const snapshot = await get(ref(db, "appointments"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    return Object.entries(data)
      .map(([key, value]: any) => ({
        ...value,
        id: key
      }));
  },

  async fetchDoctors() {
    const snapshot = await get(ref(db, "doctors"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    return Object.entries(data).map(([key, value]: any) => ({
      ...value,
      id: key
    }));
  },

  async fetchAbsences(doctorId) {
    const snapshot = await get(ref(db, "absences"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    return Object.entries(data)
      .map(([key, value]: any) => ({
        id: key, // ID z bazy
        ...value,
        date: new Date(value.date)
      }))
      .filter((a: Absence) => a.doctorId === doctorId);
  },

  async fetchDoctorAvailability(doctorId) {
    const snapshot = await get(ref(db, "availability"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    return Object.entries(data)
      .map(([key, value]: any) => ({
        id: key,
        ...value
      }))
      .filter((a: AvailabilityTemplate) => a.doctorId === doctorId);
  },

  async saveAppointment(appointment) {
    const newRef = push(ref(db, "appointments"));
    const newId = newRef.key as string;

    await set(newRef, {
      ...appointment,
      id: newId
    });

    return newId;
  },

// async saveAbsence(absence: AbsenceDto): Promise<string> {
//     const newRef = push(ref(db, "absences"));
//     const newId = newRef.key as string;

//     // Normalizacja daty absencji do stringa YYYY-MM-DD
//     const absenceDateString = absence.date instanceof Date 
//         ? absence.date.toISOString().split("T")[0] 
//         : absence.date;

//     await set(newRef, {
//       ...absence,
//       id: newId,
//       date: absenceDateString
//     });

//     const apptsSnapshot = await get(ref(db, 'appointments'));
    
//     if (apptsSnapshot.exists()) {
//         const allAppointments = Object.values(apptsSnapshot.val()) as Appointment[];
        
//         const affectedAppointments = allAppointments.filter(appt => {
//             if (appt.doctorId !== absence.doctorId) return false;

//             // split('T')[0] daje nam "2023-11-20"
//             const apptDate = appt.startTime.split('T')[0];

//             return apptDate === absenceDateString;
//         });

//         // Wysyłamy powiadomienia do znalezionych pacjentów
//         const notificationPromises = affectedAppointments.map(appt => {
//             const patientNotifRef = ref(db, `users/${appt.patientId}/notifications`);
            
//             return push(patientNotifRef, {
//                 type: 'ALERT',
//                 message: `Twoja wizyta zaplanowana na ${appt.startTime.replace('T', ' ').slice(0, 16)} została anulowana z powodu nieobecności lekarza!`,
//                 timestamp: Date.now()
//             });
//         });

//         await Promise.all(notificationPromises);
//     }

//     return newId;
// },

async saveAbsence(absence: AbsenceDto): Promise<string> {
    const newRef = push(ref(db, "absences"));
    const newId = newRef.key as string;

    const absenceDateString = absence.date instanceof Date 
        ? absence.date.toISOString().split("T")[0] 
        : absence.date;

    await set(newRef, {
      ...absence,
      id: newId,
      date: absenceDateString
    });

    const apptsSnapshot = await get(ref(db, 'appointments'));
    
    if (apptsSnapshot.exists()) {
        const allAppointments = Object.values(apptsSnapshot.val()) as Appointment[];
        
        const affectedAppointments = allAppointments.filter(appt => {
            if (appt.doctorId !== absence.doctorId) return false;
            const apptDate = appt.startTime.split('T')[0];
            return apptDate === absenceDateString;
        });

        
        // Mapa: PatientID -> Najwcześniejsza godzina wizyty (string)
        const patientsToNotify = new Map<string, string>();

        affectedAppointments.forEach(appt => {
            const currentEarliest = patientsToNotify.get(appt.patientId);
            
            // Jeśli nie ma jeszcze pacjenta na liście LUB ten slot jest wcześniejszy niż zapisany
            // (np. mamy slot 09:30, a teraz trafiliśmy na 09:00 -> bierzemy 09:00 jako start wizyty)
            if (!currentEarliest || appt.startTime < currentEarliest) {
                patientsToNotify.set(appt.patientId, appt.startTime);
            }
        });

        const notificationPromises = Array.from(patientsToNotify.entries()).map(([patientId, startTime]) => {
            const patientNotifRef = ref(db, `users/${patientId}/notifications`);
            
            return push(patientNotifRef, {
                type: 'ALERT',
                message: `Twoja wizyta zaplanowana na ${startTime.replace('T', ' ').slice(0, 16)} została anulowana z powodu nieobecności lekarza!`,
                timestamp: Date.now()
            });
        });

        await Promise.all(notificationPromises);
    }

    return newId;
},

  async saveAvailability(template) {
    const newRef = push(ref(db, "availability"));
    const newId = newRef.key as string;

    await set(newRef, {
      ...template,
      id: newId,
      validFrom: (template.validFrom as any) instanceof Date 
        ? (template.validFrom as any).toISOString().split("T")[0] 
        : template.validFrom,
      validTo: (template.validTo as any) instanceof Date 
        ? (template.validTo as any).toISOString().split("T")[0] 
        : template.validTo
    });

    return newId;
  },

  async saveDoctor(doctorData) {
    const newRef = push(ref(db, "doctors"));
    const newId = newRef.key as string;

    await set(newRef, {
      ...doctorData,
      id: newId
    });

    return newId;
  },

  async findDoctorById(id: string): Promise<Doctor | undefined> {
    try {
      const snapshot = await get(ref(db, `doctors/${id}`));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return data as Doctor;
      }
      return undefined;
    } catch (error) {
      console.error("Błąd pobierania lekarza:", error);
      return undefined;
    }
  },

  async deleteDoctor(doctorId: string) {
    await remove(ref(db, `doctors/${doctorId}`));
  },

  async cancelAppointment(appointmentId: string): Promise<void> {
    const apptRef = ref(db, `appointments/${appointmentId}`);
    const snapshot = await get(apptRef);

    if (!snapshot.exists()) {
       console.warn("Próba anulowania nieistniejącej wizyty.");
       return; 
    }

    const appt = snapshot.val() as Appointment;

    if (appt.isPaid) {
        console.log(`Dokonuję zwrotu ${appt.cost} PLN dla pacjenta ${appt.patientId}`);
        const userWalletRef = ref(db, `users/${appt.patientId}/walletBalance`);
        
        await runTransaction(userWalletRef, (currentBalance) => {
            return (currentBalance || 0) + appt.cost;
        });
    }

    await remove(apptRef);
  },

  async markAppointmentsAsPaid(appointmentIds: string[]) {
    const updates: any = {};
    
    appointmentIds.forEach(id => {
      updates[`/appointments/${id}/isPaid`] = true;
    });

    await update(ref(db), updates);
  },

  async getPersistenceMode(): Promise<PersistenceMode> {
    const snapshot = await get(ref(db, "system_config/persistenceMode"));
    if (!snapshot.exists()) {
      return 'LOCAL';
    }
    return snapshot.val() as PersistenceMode;
  },

  async setPersistenceMode(mode: PersistenceMode): Promise<void> {
    await set(ref(db, "system_config/persistenceMode"), mode);
  },

  async fetchUsers() {
    const snapshot = await get(ref(db, "users"));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.entries(data).map(([uid, userData]: any) => ({
      id: uid,
      ...userData
    }));
  },

  async toggleUserBan(userId: string, isBanned: boolean) {
    await update(ref(db, `users/${userId}`), {
      isBanned: isBanned
    });
  },

  async findDoctorByEmail(email: string): Promise<string | null> {
    const snapshot = await get(ref(db, "doctors"));
    if (!snapshot.exists()) return null;

    const data = snapshot.val();
    const entry = Object.entries(data).find(([key, doc]: any) => doc.email === email);
    
    return entry ? entry[0] : null;
  },

  async getDoctorReviews(doctorId: string): Promise<Review[]> {
    const reviewsRef = ref(db, 'reviews');
    const snapshot = await get(reviewsRef);
    
    if (!snapshot.exists()) return [];
    
    const allReviews = Object.values(snapshot.val()) as Review[];
    return allReviews.filter(r => r.doctorId === doctorId).sort((a, b) => b.createdAt - a.createdAt);
  },

  async addReview(reviewDto: ReviewDto, patientId: string, patientName: string): Promise<Review> {
    const allReviews = await this.getDoctorReviews(reviewDto.doctorId);
    const existingReview = allReviews.find(r => r.patientId === patientId);
    
    if (existingReview) {
      throw new Error("Już oceniłeś tego lekarza. Możesz edytować swoją opinię.");
    }

    const newRef = push(ref(db, 'reviews'));
    const newId = newRef.key!;
    
    const newReview: Review = {
      id: newId,
      patientId,
      patientName,
      createdAt: Date.now(),
      ...reviewDto
    };

    await set(newRef, newReview);
    return newReview;
  },

  async updateReview(reviewId: string, reviewDto: ReviewDto): Promise<void> {
    const reviewRef = ref(db, `reviews/${reviewId}`);
    await update(reviewRef, {
      rating: reviewDto.rating,
      comment: reviewDto.comment,
    });
  },

  async deleteReview(reviewId: string): Promise<void> {
    await remove(ref(db, `reviews/${reviewId}`));
  },

  async payForAppointment(appointmentId: string, cost: number, userId: string): Promise<void> {
     const userRef = ref(db, `users/${userId}/walletBalance`);
     const apptRef = ref(db, `appointments/${appointmentId}/isPaid`);

     await runTransaction(userRef, (currentBalance) => {
        if (currentBalance === null) return 1000; // Fallback
        if (currentBalance < cost) throw new Error("Niewystarczające środki!");
        return currentBalance - cost;
     });

     // Jeśli transakcja przeszła, oznaczamy wizytę
     await set(apptRef, true);
  },

  async fetchNotifications(userId: string): Promise<AppNotification[]> {
    const userNotifsRef = ref(db, `users/${userId}/notifications`);

    const q = query(userNotifsRef, orderByChild('timestamp'), limitToLast(50));
    const snapshot = await get(q);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();

    const notifications = Object.entries(data).map(([key, val]: any) => ({
      id: key,
      ...val
    })) as AppNotification[];

    return notifications.sort((a, b) => b.timestamp - a.timestamp);
  },
};