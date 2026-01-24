import type { 
  Appointment, 
  Doctor, 
  User, 
  Absence, 
  AvailabilityTemplate, 
  PersistenceMode,
  AbsenceDto,
  AppointmentDto,
  AvailabilityTemplateDto,
  ReviewDto,
  Review,
} from '../interfaces/interfaces';
import type { BackendAPI } from './backend.types';
import { TokenManager } from "./auth/TokenManager";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export class HttpBackendAPI implements BackendAPI {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async performRefresh(): Promise<string | null> {
    // Jeśli odświeżanie już trwa, zwracamy istniejącą obietnicę (wszyscy czekają na ten sam wynik)
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    isRefreshing = true;
    const refreshToken = TokenManager.getRefreshToken();

    if (!refreshToken) {
        isRefreshing = false;
        return null;
    }

    // Tworzymy obietnicę odświeżania
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken })
        });

        if (res.ok) {
          const data = await res.json();
          // Zapisujemy nowe tokeny
          TokenManager.saveTokens(data.accessToken, data.refreshToken || refreshToken);
          return data.accessToken;
        } else {
          console.error("Refresh failed with status:", res.status);
          TokenManager.clearTokens();
          return null;
        }
      } catch (e) {
        console.error("Refresh network error:", e);
        return null;
      } finally {
        // Zwalniamy blokadę
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  public async request<T>(endpoint: string, method: string = 'GET', body?: any, isRetry: boolean = false): Promise<T> {
    
    let token = TokenManager.getAccessToken();
    if (token && TokenManager.isAccessTokenExpired(token)) {
       await this.performRefresh();
       token = TokenManager.getAccessToken();
    }

    const headers: any = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

      if ((response.status === 401 || response.status === 403) && !isRetry) {
        console.warn(`[HttpBackend] 401 detected at ${endpoint}. Waiting for refresh...`);
        
        const newToken = await this.performRefresh();

        if (newToken) {
          return this.request<T>(endpoint, method, body, true);
        } else {
          TokenManager.clearTokens();
          window.location.href = '/login';
          throw new Error("Sesja wygasła.");
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      if (response.status === 204) {
          return {} as T;
      }

      const text = await response.text();
      try {
        return text ? JSON.parse(text) : ({} as T);
      } catch {
        return {} as T;
      }

    } catch (error) {
      console.error(`Request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  async fetchAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/appointments');
  }

  async fetchDoctorAppointments(doctorId: string): Promise<Appointment[]> {
    return this.request<Appointment[]>(`/appointments?doctorId=${encodeURIComponent(doctorId)}`);
  }

  async saveAppointment(appointment: AppointmentDto): Promise<string> {
    const result = await this.request<{ id: string }>('/appointments', 'POST', appointment);
    return result.id;
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    await this.request<void>(`/appointments/${appointmentId}`, 'DELETE');
  }

  async markAppointmentsAsPaid(appointmentIds: string[]): Promise<void> {
    await this.request<void>('/appointments/pay', 'POST', { ids: appointmentIds });
  }

  async fetchAbsences(doctorId: string): Promise<Absence[]> {
    return this.request<Absence[]>(`/absences?doctorId=${encodeURIComponent(doctorId)}`);
  }

  async saveAbsence(absence: AbsenceDto): Promise<string> {
    const result = await this.request<{ id: string }>('/absences', 'POST', absence);
    return result.id;
  }

  async fetchDoctorAvailability(doctorId: string): Promise<AvailabilityTemplate[]> {
    return this.request<AvailabilityTemplate[]>(`/availabilities?doctorId=${encodeURIComponent(doctorId)}`);
  }

  async saveAvailability(template: AvailabilityTemplateDto): Promise<string> {
    const result = await this.request<{ id: string }>('/availabilities', 'POST', template);
    return result.id;
  }

  async fetchDoctors(): Promise<Doctor[]> {
    return this.request<Doctor[]>('/doctors');
  }

  async findDoctorById(id: string): Promise<Doctor | undefined> {
    const doctors = await this.fetchDoctors();
    return doctors.find(d => d.id === id);
  }

  async saveDoctor(doctorData: any): Promise<string> {
    const result = await this.request<{ id: string }>('/doctors', 'POST', doctorData);
    return result.id;
  }

  async deleteDoctor(doctorId: string): Promise<void> {
    await this.request<void>(`/doctors/${doctorId}`, 'DELETE');
  }

  async findDoctorByEmail(email: string): Promise<string | null> {
    try {
      const result = await this.request<{ id: string } | null>(`/doctors/search?email=${encodeURIComponent(email)}`);
      return result ? result.id : null;
    } catch (e) {
      return null;
    }
  }

  async fetchUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async toggleUserBan(userId: string, isBanned: boolean): Promise<void> {
    await this.request<void>(`/users/${userId}/ban`, 'PATCH', { isBanned });
  }

  async getPersistenceMode(): Promise<PersistenceMode> {
     try {
         const result = await this.request<{ mode: PersistenceMode }>('/config/persistence');
         TokenManager.setPersistenceMode(result.mode);
         return result.mode;
     } catch (e) {
         return 'LOCAL';
     }
  }

  async setPersistenceMode(mode: PersistenceMode): Promise<void> {
    await this.request<void>('/config/persistence', 'POST', { mode });
  }

  async getDoctorReviews(doctorId: string): Promise<Review[]> {
    return this.request<Review[]>(`/doctors/${doctorId}/reviews`);
  }

  async addReview(review: ReviewDto, patientId: string, patientName: string): Promise<Review> {
    return this.request<Review>('/reviews', 'POST', {
      ...review,
      patientName
    });
  }

  async updateReview(reviewId: string, review: ReviewDto): Promise<void> {
    await this.request(`/reviews/${reviewId}`, 'PUT', {
      rating: review.rating,
      comment: review.comment
    });
  }

  async deleteReview(reviewId: string): Promise<void> {
    await this.request(`/reviews/${reviewId}`, 'DELETE');
  }

  async payForAppointment(appointmentId: string, cost: number): Promise<void> {
    await this.request(`/appointments/${appointmentId}/pay`, 'POST', { cost });
  }
}