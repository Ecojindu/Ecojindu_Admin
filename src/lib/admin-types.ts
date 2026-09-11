/** Admin- and driver-only response shapes, on top of the shared `types.ts`. */

import type { Trip } from "./types";

export interface Vehicle {
  id: string;
  name: string;
  plate_no: string;
  model: string;
  seat_capacity: number;
  range_km: number;
  status: string;
  photo_url: string | null;
  notes: string | null;
}

export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  license_no: string;
  photo_url: string | null;
  assigned_vehicle_id: string | null;
  assigned_vehicle_name: string | null;
  status: string;
  is_active: boolean;
}

export interface TripTemplate {
  id: string;
  route_id: string;
  route_name: string | null;
  departure_time: string;
  days_of_week: number[];
  vehicle_id: string | null;
  vehicle_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  fare_override_kobo: number | null;
  is_active: boolean;
}

export interface AdminTrip extends Trip {
  template_id: string | null;
  cancellation_reason: string | null;
  revenue_kobo: number;
  confirmed_bookings: number;
}

export interface ManifestPassenger {
  booking_ref: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string | null;
  seats: number;
  seat_numbers: string[];
  status: string;
  source: string;
  amount_kobo: number;
  checked_in_at: string | null;
  pickup_stop: string | null;
}

export interface TripManifest {
  trip: Trip;
  passengers: ManifestPassenger[];
  total_passengers: number;
  checked_in_count: number;
  revenue_kobo: number;
}

export interface ChannelBreakdown {
  source: string;
  bookings: number;
  seats: number;
  revenue_kobo: number;
  share_pct: number;
}

export interface DashboardSummary {
  date: string;
  trips_today: number;
  departures_remaining: number;
  seats_offered_today: number;
  seats_sold_today: number;
  occupancy_today_pct: number;
  revenue_today_kobo: number;
  revenue_week_kobo: number;
  revenue_month_kobo: number;
  bookings_today: number;
  bookings_week: number;
  bookings_month: number;
  active_subscriptions: number;
  subscription_revenue_month_kobo: number;
  cancellation_rate_pct: number;
  channel_breakdown: ChannelBreakdown[];
}

export interface OverviewTrip {
  trip_id: string;
  route_name: string;
  departure_datetime: string;
  status: string;
  seats_total: number;
  seats_booked: number;
  occupancy_pct: number;
  driver_name: string | null;
  vehicle_name: string | null;
}

export interface TripAlert {
  trip_id: string;
  severity: string;
  kind: string;
  message: string;
  departure_datetime: string;
}

export interface AnalyticsOverview {
  summary: DashboardSummary;
  todays_trips: OverviewTrip[];
  upcoming_departures: OverviewTrip[];
  alerts: TripAlert[];
}

export interface RevenuePoint {
  period: string;
  revenue_kobo: number;
  bookings: number;
  seats: number;
}

export interface RoutePerformance {
  route_id: string;
  route_name: string;
  trips: number;
  seats_offered: number;
  seats_sold: number;
  occupancy_pct: number;
  revenue_kobo: number;
}

export interface OccupancySlot {
  time_slot: string;
  trips: number;
  seats_offered: number;
  seats_sold: number;
  occupancy_pct: number;
}

export interface SubscriptionSales {
  plan_id: string;
  plan_name: string;
  sold: number;
  revenue_kobo: number;
  active: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ValidateTicketResponse {
  valid: boolean;
  status: string;
  message: string;
  booking_ref: string | null;
  passenger_name: string | null;
  seats: number | null;
  seat_numbers: string[];
  trip_summary: string | null;
  checked_in_at: string | null;
  already_checked_in: boolean;
}

export interface DriverSummary {
  date: string;
  trips_today: number;
  passengers_today: number;
  completed: number;
  next_departure: string | null;
}

export interface DriverProfile {
  driver_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  license_no: string;
  status: string;
  photo_url: string | null;
  assigned_vehicle: {
    id: string;
    name: string;
    plate_no: string;
    model: string;
    seat_capacity: number;
    range_km: number;
  } | null;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  channel: string;
  subject: string | null;
  body: string;
  description: string | null;
}

export interface NotificationLogEntry {
  id: string;
  channel: string;
  type: string;
  recipient: string;
  status: string;
  provider: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

// ── Charter ──────────────────────────────────────────────────

export type CharterStatus =
  | "requested"
  | "quoted"
  | "confirmed"
  | "assigned"
  | "completed"
  | "cancelled"
  | "declined";

export interface CharterRequest {
  id: string;
  reference: string;
  status: CharterStatus;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  organisation: string | null;
  route_id: string | null;
  route_name: string | null;
  origin_text: string;
  destination_text: string;
  service_date: string;
  preferred_time: string | null;
  passengers: number;
  return_trip: boolean;
  notes: string | null;
  quoted_amount_kobo: number | null;
  quote_notes: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  trip_id: string | null;
  quoted_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface Demographics {
  summary: {
    male: number;
    female: number;
    unspecified: number;
    total_seats: number;
    bookings: number;
    male_pct: number;
    female_pct: number;
    coverage_pct: number;
  };
  by_route: { route_name: string; male: number; female: number }[];
}


// ── Audit ────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  summary: string;
  changes: Record<string, [unknown, unknown]> | null;
  ip: string | null;
  created_at: string;
}

export interface AuditAction {
  action: string;
  count: number;
}

// ── Routes with readiness ────────────────────────────────────

export type RouteReadiness =
  | "bookable"
  | "no_timetable"
  | "no_departures"
  | "withdrawn"
  | "charter";

export interface AdminRoute {
  id: string;
  name: string;
  code: string;
  origin_terminal: string;
  destination: string;
  distance_km: number;
  duration_mins: number;
  base_fare_kobo: number;
  service_type: string;
  charter_fare_kobo: number | null;
  is_active: boolean;
  description: string | null;
  stops: {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    order: number;
    pickup_allowed: boolean;
  }[];
  template_count: number;
  active_template_count: number;
  upcoming_trip_count: number;
  is_bookable: boolean;
  readiness: RouteReadiness;
  readiness_hint: string | null;
}
