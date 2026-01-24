import { Server } from 'socket.io';
import { AvailabilityTemplateDto } from '../types/types.js';

export class AvailabilityService {
  private db: any; // MongoDAO | LowDbDAO
  private io: Server;

  constructor(db: any, io: Server) {
    this.db = db;
    this.io = io;
  }

  private isTimeRangeValid(from: string, to: string): boolean {
    return from < to;
  }

  async createAvailability(data: AvailabilityTemplateDto) {
    const { validFrom, validTo, weekdays, timeRanges, doctorId } = data;

    if (!validFrom || !validTo || !weekdays || weekdays.length === 0) {
        throw new Error("Niepoprawne dane: wymagane daty i dni tygodnia.");
    }

    if (new Date(validFrom) > new Date(validTo)) {
        throw new Error("Data końcowa nie może być wcześniejsza niż początkowa.");
    }

    if (!timeRanges || timeRanges.length === 0) {
        throw new Error("Wymagany przynajmniej jeden przedział czasowy.");
    }

    const areRangesValid = timeRanges.every(r => r.from && r.to && this.isTimeRangeValid(r.from, r.to));
    if (!areRangesValid) {
        throw new Error("Niepoprawne przedziały czasowe (godzina OD musi być przed godziną DO).");
    }

    const absences = await this.db.getAbsences(doctorId);
    
    const start = new Date(validFrom);
    const end = new Date(validTo);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    const hasConflict = absences.some((abs: any) => {
        const absDate = new Date(abs.date);
        absDate.setHours(0,0,0,0);

        const isInDateRange = absDate >= start && absDate <= end;
        
        if (!isInDateRange) return false;

        const absDayOfWeek = absDate.getDay();
        
        return weekdays.includes(absDayOfWeek);
    });

    if (hasConflict) {
        throw new Error("Nie można dodać dostępności – w tym terminie istnieje konflikt z absencją.");
    }

    const id = await this.db.saveAvailability(data);

    this.io.emit('DATA_CHANGED', { resource: 'availabilities' }); 

    return id;
  }
}