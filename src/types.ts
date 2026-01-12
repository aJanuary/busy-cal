export interface CalendarEvent {
  start: Date;
  end: Date;
}

export type AvailabilityStatus = 'available' | 'not-available' | 'potentially-available';

export interface TimeSlot {
  start: Date;
  end: Date;
  status: AvailabilityStatus;
}

export interface DaySummary {
  date: Date;
  slots: TimeSlot[];
}
