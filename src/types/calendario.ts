export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  category?: string | null;
  color?: string | null;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  specialties?: string[];
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  service_duration?: number;
  employee_id?: string | null;
  employee_name?: string | null;
  start_time: string; // ISO 8601 string
  end_time: string;   // ISO 8601 string
  status: AppointmentStatus;
  notes?: string | null;
  price?: number;
  location?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentFilterState {
  date_range?: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  employee_id?: string | 'all';
  service_id?: string | 'all';
  status?: AppointmentStatus | 'all';
  search?: string;
  view_mode?: 'month' | 'week' | 'day' | 'list';
}

export interface CreateAppointmentInput {
  title: string;
  description?: string | null;
  client_id?: string | null;
  service_id?: string | null;
  employee_id?: string | null;
  start_time: string; // ISO 8601
  end_time?: string | null; // ISO 8601 or calculated from duration
  duration_minutes?: number;
  status?: AppointmentStatus;
  notes?: string | null;
  price?: number;
  location?: string | null;
  metadata?: Record<string, any>;
}

export interface UpdateAppointmentInput extends Partial<CreateAppointmentInput> {
  id: string;
}
