// IntakeQ API Client
// Documentation: https://intakeq.com/api/v1/

import type {
  IntakeQAppointment,
  IntakeQClient,
  IntakeQAppointmentSettings,
  CalendarAppointment,
  DailySchedule,
} from './types';

const INTAKEQ_BASE_URL = 'https://intakeq.com/api/v1';

export interface IntakeQClientConfig {
  apiKey: string;
}

export class IntakeQApiClient {
  private apiKey: string;

  constructor(config: IntakeQClientConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${INTAKEQ_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IntakeQ API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // ==================== Appointments ====================

  /**
   * Get appointments for a date range
   */
  async getAppointments(params: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    practitionerId?: string;
    clientId?: number;
    status?: string;
    page?: number;
  }): Promise<IntakeQAppointment[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('StartDate', params.startDate);
    queryParams.set('EndDate', params.endDate);

    if (params.practitionerId) {
      queryParams.set('PractitionerId', params.practitionerId);
    }
    if (params.clientId) {
      queryParams.set('ClientId', params.clientId.toString());
    }
    if (params.status) {
      queryParams.set('Status', params.status);
    }
    if (params.page) {
      queryParams.set('Page', params.page.toString());
    }

    return this.request<IntakeQAppointment[]>(
      `/appointments?${queryParams.toString()}`
    );
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<IntakeQAppointment> {
    return this.request<IntakeQAppointment>(`/appointments/${appointmentId}`);
  }

  /**
   * Get appointment settings (practitioners, services, locations)
   */
  async getAppointmentSettings(): Promise<IntakeQAppointmentSettings> {
    return this.request<IntakeQAppointmentSettings>('/appointments/settings');
  }

  // ==================== Clients ====================

  /**
   * Search clients
   */
  async getClients(params?: {
    search?: string;
    page?: number;
    dateCreatedStart?: string;
    dateCreatedEnd?: string;
  }): Promise<IntakeQClient[]> {
    const queryParams = new URLSearchParams();

    if (params?.search) {
      queryParams.set('Search', params.search);
    }
    if (params?.page) {
      queryParams.set('Page', params.page.toString());
    }
    if (params?.dateCreatedStart) {
      queryParams.set('DateCreatedStart', params.dateCreatedStart);
    }
    if (params?.dateCreatedEnd) {
      queryParams.set('DateCreatedEnd', params.dateCreatedEnd);
    }

    const query = queryParams.toString();
    return this.request<IntakeQClient[]>(
      `/clients${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: number): Promise<IntakeQClient> {
    const clients = await this.request<IntakeQClient[]>(
      `/clients?ClientId=${clientId}`
    );
    if (clients.length === 0) {
      throw new Error(`Client not found: ${clientId}`);
    }
    return clients[0];
  }

  // ==================== Helper Methods ====================

  /**
   * Convert IntakeQ appointment to Castro calendar format
   */
  static toCalendarAppointment(
    appointment: IntakeQAppointment
  ): CalendarAppointment {
    // Convert minutes from midnight to HH:MM
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Extract date from ISO string
    const date = appointment.Date.split('T')[0];

    return {
      id: `intakeq-${appointment.Id}`,
      intakeqAppointmentId: appointment.Id,
      clientId: appointment.ClientId,
      clientName: appointment.ClientName,
      practitionerName: appointment.PractitionerName,
      serviceName: appointment.ServiceName,
      locationName: appointment.LocationName,
      date,
      startTime: formatTime(appointment.StartTime),
      endTime: formatTime(appointment.EndTime),
      duration: appointment.Duration,
      status: appointment.Status,
    };
  }

  /**
   * Get today's schedule formatted for calendar view
   */
  async getTodaySchedule(practitionerId?: string): Promise<DailySchedule> {
    const today = new Date().toISOString().split('T')[0];
    return this.getDaySchedule(today, practitionerId);
  }

  /**
   * Get schedule for a specific day
   */
  async getDaySchedule(
    date: string,
    practitionerId?: string
  ): Promise<DailySchedule> {
    const appointments = await this.getAppointments({
      startDate: date,
      endDate: date,
      practitionerId,
    });

    const calendarAppointments = appointments
      .map(IntakeQApiClient.toCalendarAppointment)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      date,
      appointments: calendarAppointments,
      totalAppointments: calendarAppointments.length,
      completedNotes: 0, // Will be updated when linking sessions
      pendingNotes: 0,
      processingNotes: 0,
    };
  }

  /**
   * Get week schedule
   */
  async getWeekSchedule(
    startDate: string,
    practitionerId?: string
  ): Promise<DailySchedule[]> {
    const start = new Date(startDate);
    const schedules: DailySchedule[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const schedule = await this.getDaySchedule(dateStr, practitionerId);
      schedules.push(schedule);
    }

    return schedules;
  }
}

// Singleton instance (initialized when API key is set)
let clientInstance: IntakeQApiClient | null = null;

export function initIntakeQClient(apiKey: string): IntakeQApiClient {
  clientInstance = new IntakeQApiClient({ apiKey });
  return clientInstance;
}

export function getIntakeQClient(): IntakeQApiClient {
  if (!clientInstance) {
    throw new Error('IntakeQ client not initialized. Call initIntakeQClient first.');
  }
  return clientInstance;
}

export function hasIntakeQClient(): boolean {
  return clientInstance !== null;
}
