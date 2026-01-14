// IntakeQ API Types

export interface IntakeQAppointment {
  Id: string;
  ClientId: number;
  ClientName: string;
  ClientEmail?: string;
  ClientPhone?: string;
  ClientDateOfBirth?: string;
  PractitionerId: string;
  PractitionerName: string;
  PractitionerEmail?: string;
  ServiceId?: string;
  ServiceName?: string;
  LocationId?: string;
  LocationName?: string;
  Date: string; // ISO date string
  StartTime: number; // Minutes from midnight
  EndTime: number; // Minutes from midnight
  Duration: number; // Minutes
  Status: AppointmentStatus;
  StatusName?: string;
  Price?: number;
  Notes?: string;
  CreatedDate?: string;
  Type?: string;
  ExternalClientId?: string;
}

export type AppointmentStatus =
  | 'Confirmed'
  | 'Unconfirmed'
  | 'Canceled'
  | 'Completed'
  | 'NoShow'
  | 'Rescheduled';

export interface IntakeQClient {
  Id: number;
  Name: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  DateOfBirth?: string;
  ExternalClientId?: string;
  Tags?: string[];
  CustomFields?: Record<string, unknown>;
  CreatedDate?: string;
  UpdatedDate?: string;
}

export interface IntakeQPractitioner {
  Id: string;
  Name: string;
  Email?: string;
  CompleteName?: string;
}

export interface IntakeQService {
  Id: string;
  Name: string;
  Duration?: number;
  Price?: number;
}

export interface IntakeQLocation {
  Id: string;
  Name: string;
  Address?: string;
}

export interface IntakeQAppointmentSettings {
  Practitioners: IntakeQPractitioner[];
  Services: IntakeQService[];
  Locations: IntakeQLocation[];
}

// Castro-specific types for calendar view
export interface CalendarAppointment {
  id: string;
  intakeqAppointmentId: string;
  clientId: number;
  clientName: string;
  practitionerName: string;
  serviceName?: string;
  locationName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // minutes
  status: AppointmentStatus;
  // Linked Castro session (if matched)
  linkedSessionId?: string;
  linkedSessionStatus?: string;
  hasNote?: boolean;
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  appointments: CalendarAppointment[];
  // Summary stats
  totalAppointments: number;
  completedNotes: number;
  pendingNotes: number;
  processingNotes: number;
}
