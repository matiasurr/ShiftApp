// Hand-written types for the Supabase schema and RPC results.
// Keep in sync with supabase/migrations/*.sql.

export type AppointmentStatus = "booked" | "cancelled" | "completed";

export interface SalonSettings {
  id: string;
  capacity: number;
  open_time: string; // "09:00:00"
  close_time: string; // "18:00:00"
  slot_interval_minutes: number;
  timezone: string;
  open_days: number[]; // ISO weekday numbers (1=Mon ... 7=Sun)
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  active: boolean;
}

export interface Stylist {
  id: string;
  user_id: string | null;
  full_name: string;
  active: boolean;
}

export interface StylistService {
  stylist_id: string;
  service_id: string;
}

export interface Appointment {
  id: string;
  service_id: string;
  stylist_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  starts_at: string; // ISO timestamptz
  ends_at: string; // ISO timestamptz
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

// Result row of the get_available_slots() RPC.
export interface AvailableSlot {
  slot_start: string; // ISO timestamptz
  available_stylist_count: number;
}

// An appointment joined with service + stylist info for the stylist schedule view.
export interface ScheduledAppointment extends Appointment {
  service: Pick<Service, "name" | "duration_minutes">;
}
