/** Mirrors the backend's Pydantic response models. Money is always kobo. */

export type UserRole = "passenger" | "driver" | "operations" | "super_admin";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled";

export type TripStatus = "scheduled" | "boarding" | "departed" | "arrived" | "cancelled";

export interface RouteStop {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  order: number;
  pickup_allowed: boolean;
}

export interface Route {
  id: string;
  name: string;
  code: string;
  origin_terminal: string;
  destination: string;
  distance_km: number;
  duration_mins: number;
  base_fare_kobo: number;
  is_active: boolean;
  description: string | null;
  stops: RouteStop[];
}

export interface Trip {
  id: string;
  route_id: string;
  route_name: string;
  origin_terminal: string;
  destination: string;
  service_date: string;
  departure_datetime: string;
  arrival_estimate: string | null;
  duration_mins: number;
  status: TripStatus;
  seats_total: number;
  seats_booked: number;
  seats_available: number;
  fare_kobo: number;
  vehicle_id: string | null;
  vehicle_name: string | null;
  vehicle_model: string | null;
  driver_id: string | null;
  driver_name: string | null;
  is_bookable: boolean;
}

export interface Ticket {
  qr_token: string;
  qr_image_url: string;
  issued_at: string;
  checked_in_at: string | null;
}

export interface Booking {
  id: string;
  booking_ref: string;
  trip_id: string;
  user_id: string | null;
  subscription_id: string | null;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string | null;
  seats: number;
  seat_numbers: string[];
  amount_kobo: number;
  source: string;
  status: BookingStatus;
  hold_expires_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  trip: Trip | null;
  ticket: Ticket | null;
}

export interface PaymentInit {
  reference: string;
  authorization_url: string;
  access_code: string;
  public_key: string;
  amount_kobo: number;
  email: string;
}

export interface BookingCreateResponse {
  booking: Booking;
  payment: PaymentInit | null;
  hold_expires_at: string | null;
  message: string;
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price_kobo: number;
  ride_credits: number;
  validity_days: number;
  description: string | null;
  perks: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string | null;
  subscriber_name: string | null;
  subscriber_phone: string | null;
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  starts_at: string | null;
  expires_at: string | null;
  status: string;
  amount_paid_kobo: number;
  created_at: string;
}

export interface SubscriptionPurchaseResponse {
  subscription: Subscription;
  payment: PaymentInit;
  message: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  role: UserRole;
  is_active: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface PaymentVerification {
  reference: string;
  status: string;
  amount_kobo: number;
  paid: boolean;
  booking_ref: string | null;
  subscription_id: string | null;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    request_id: string;
  };
}
