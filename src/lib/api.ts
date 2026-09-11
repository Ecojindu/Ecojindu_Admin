"use client";

import { config } from "./config";
import type {
  AdminRoute,
  AdminTrip,
  AuditAction,
  AuditEntry,
  CharterRequest,
  Demographics,
  AnalyticsOverview,
  ChannelBreakdown,
  Driver,
  DriverProfile,
  DriverSummary,
  NotificationLogEntry,
  NotificationTemplate,
  OccupancySlot,
  Page,
  RevenuePoint,
  RoutePerformance,
  SubscriptionSales,
  TripManifest,
  TripTemplate,
  ValidateTicketResponse,
  Vehicle,
} from "./admin-types";
import type {
  AuthResponse,
  Booking,
  Plan,
  Route,
  Subscription,
  TokenPair,
  Trip,
  User,
} from "./types";

const ACCESS_KEY = "ejs.admin.access";
const REFRESH_KEY = "ejs.admin.refresh";
const USER_KEY = "ejs.admin.user";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string = "error",
    readonly status: number = 500,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  get user(): User | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  save(tokens: TokenPair, user?: User) {
    window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
    window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("ejs:auth"));
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("ejs:auth"));
  },
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Set false for the login endpoint itself. */
  auth?: boolean;
  raw?: boolean;
  _retried?: boolean;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const response = await fetch(`${config.apiBaseUrl}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!response.ok) {
    tokenStore.clear();
    return false;
  }
  const tokens = (await response.json()) as TokenPair;
  tokenStore.save(tokens, tokenStore.user ?? undefined);
  return true;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, auth = true, raw = false, _retried = false } = options;

  const url = new URL(`${config.apiBaseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = tokenStore.access;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the backend. Check it's running.", "network_error", 0);
  }

  if (response.status === 401 && auth && !_retried) {
    if (await refreshAccessToken()) {
      return request<T>(path, { ...options, _retried: true });
    }
  }

  if (raw) {
    if (!response.ok) throw new ApiError("Download failed", "error", response.status);
    return (await response.text()) as T;
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const err = payload?.error;
    throw new ApiError(
      err?.message ?? "Something went wrong.",
      err?.code ?? "error",
      response.status,
      err?.details ?? {},
    );
  }

  return payload as T;
}

// ── Endpoints ────────────────────────────────────────────────

export const api = {
  // Auth
  login: (identifier: string, password: string) =>
    request<AuthResponse>("/v1/auth/login", {
      method: "POST",
      body: { identifier, password },
      auth: false,
    }),
  me: () => request<User>("/v1/auth/me"),

  // ── Analytics ──
  overview: () => request<AnalyticsOverview>("/v1/admin/analytics/overview"),
  revenueSeries: (start: string, end: string, granularity: "day" | "week" | "month" = "day") =>
    request<RevenuePoint[]>("/v1/admin/analytics/revenue", {
      params: { start, end, granularity },
    }),
  routePerformance: (start: string, end: string) =>
    request<RoutePerformance[]>("/v1/admin/analytics/routes", { params: { start, end } }),
  occupancyBySlot: (start: string, end: string) =>
    request<OccupancySlot[]>("/v1/admin/analytics/occupancy", { params: { start, end } }),
  subscriptionSales: (start: string, end: string) =>
    request<SubscriptionSales[]>("/v1/admin/analytics/subscriptions", { params: { start, end } }),
  channels: (start: string, end: string) =>
    request<ChannelBreakdown[]>("/v1/admin/analytics/channels", { params: { start, end } }),
  exportCsvUrl: (start: string, end: string) =>
    `${config.apiBaseUrl}/v1/admin/analytics/export.csv?start=${start}&end=${end}`,
  exportCsv: (start: string, end: string) =>
    request<string>("/v1/admin/analytics/export.csv", { params: { start, end }, raw: true }),

  // ── Trips ──
  trips: (params: { route_id?: string; date_from?: string; date_to?: string; status?: string }) =>
    request<AdminTrip[]>("/v1/admin/trips", { params }),
  createTrip: (body: Record<string, unknown>) =>
    request<AdminTrip>("/v1/admin/trips", { method: "POST", body }),
  updateTrip: (id: string, body: Record<string, unknown>) =>
    request<AdminTrip>(`/v1/admin/trips/${id}`, { method: "PATCH", body }),
  cancelTrip: (id: string, reason: string, notify: boolean) =>
    request<{ message: string }>(`/v1/admin/trips/${id}/cancel`, {
      method: "POST",
      body: { reason, notify_passengers: notify },
    }),
  manifest: (id: string) => request<TripManifest>(`/v1/admin/trips/${id}/manifest`),
  generateTrips: (days: number) =>
    request<{ message: string }>("/v1/admin/templates/generate", {
      method: "POST",
      params: { days_ahead: days },
    }),

  // ── Timetable ──
  templates: (routeId?: string) =>
    request<TripTemplate[]>("/v1/admin/templates", { params: { route_id: routeId } }),
  createTemplate: (body: Record<string, unknown>) =>
    request<TripTemplate>("/v1/admin/templates", { method: "POST", body }),
  updateTemplate: (id: string, body: Record<string, unknown>) =>
    request<TripTemplate>(`/v1/admin/templates/${id}`, { method: "PATCH", body }),
  deactivateTemplate: (id: string) =>
    request<{ message: string }>(`/v1/admin/templates/${id}`, { method: "DELETE" }),

  // ── Bookings ──
  bookings: (params: {
    q?: string;
    status?: string;
    source?: string;
    trip_id?: string;
    page?: number;
    page_size?: number;
  }) => request<Page<Booking>>("/v1/admin/bookings", { params }),
  createBooking: (body: Record<string, unknown>) =>
    request<Booking>("/v1/admin/bookings", { method: "POST", body }),
  confirmBooking: (ref: string) =>
    request<{ message: string }>(`/v1/admin/bookings/${ref}/confirm`, { method: "POST" }),
  cancelBooking: (ref: string, reason?: string) =>
    request<Booking>(`/v1/bookings/${ref}/cancel`, { method: "POST", body: { reason } }),
  resendTicket: (ref: string) =>
    request<{ message: string }>(`/v1/bookings/${ref}/resend-ticket`, {
      method: "POST",
      body: { channels: ["email", "sms"] },
    }),

  // ── Tickets ──
  validateTicket: (qr_token: string, trip_id?: string) =>
    request<ValidateTicketResponse>("/v1/tickets/validate", {
      method: "POST",
      body: { qr_token, trip_id: trip_id ?? null },
    }),
  ticketImageUrl: (ref: string) => `${config.apiBaseUrl}/v1/tickets/${ref}/qr.png`,

  // ── Charter ──
  charters: (status?: string) =>
    request<CharterRequest[]>("/v1/charter/admin/requests", { params: { status, limit: 200 } }),
  charter: (reference: string) =>
    request<CharterRequest>(`/v1/charter/admin/requests/${reference}`),
  quoteCharter: (
    reference: string,
    body: {
      quoted_amount_kobo: number;
      quote_notes?: string | null;
      vehicle_id?: string | null;
      notify: boolean;
    },
  ) =>
    request<CharterRequest>(`/v1/charter/admin/requests/${reference}/quote`, {
      method: "POST",
      body,
    }),
  assignCharter: (
    reference: string,
    body: { vehicle_id: string; driver_id?: string | null; create_trip: boolean },
  ) =>
    request<CharterRequest>(`/v1/charter/admin/requests/${reference}/assign`, {
      method: "POST",
      body,
    }),
  declineCharter: (reference: string, reason: string, notify: boolean) =>
    request<{ message: string }>(`/v1/charter/admin/requests/${reference}/decline`, {
      method: "POST",
      body: { reason, notify },
    }),
  markCharterPaid: (reference: string) =>
    request<CharterRequest>(`/v1/charter/admin/requests/${reference}/mark-paid`, {
      method: "POST",
    }),

  // ── Demographics ──
  demographics: (start: string, end: string) =>
    request<Demographics>("/v1/admin/analytics/demographics", { params: { start, end } }),

  // ── Audit ──
  auditLogs: (params: {
    q?: string;
    action?: string;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => request<Page<AuditEntry>>("/v1/admin/audit-logs", { params }),
  auditActions: () => request<AuditAction[]>("/v1/admin/audit-logs/actions"),

  // ── Fleet & people ──
  routes: () => request<AdminRoute[]>("/v1/admin/routes"),
  createRoute: (body: Record<string, unknown>) =>
    request<AdminRoute>("/v1/admin/routes", { method: "POST", body }),
  updateRoute: (id: string, body: Record<string, unknown>) =>
    request<AdminRoute>(`/v1/admin/routes/${id}`, { method: "PATCH", body }),
  addStop: (routeId: string, body: Record<string, unknown>) =>
    request<unknown>(`/v1/admin/routes/${routeId}/stops`, { method: "POST", body }),
  deleteStop: (stopId: string) =>
    request<{ message: string }>(`/v1/admin/stops/${stopId}`, { method: "DELETE" }),

  vehicles: () => request<Vehicle[]>("/v1/admin/vehicles"),
  createVehicle: (body: Record<string, unknown>) =>
    request<Vehicle>("/v1/admin/vehicles", { method: "POST", body }),
  updateVehicle: (id: string, body: Record<string, unknown>) =>
    request<Vehicle>(`/v1/admin/vehicles/${id}`, { method: "PATCH", body }),

  drivers: () => request<Driver[]>("/v1/admin/drivers"),
  createDriver: (body: Record<string, unknown>) =>
    request<Driver>("/v1/admin/drivers", { method: "POST", body }),
  updateDriver: (id: string, body: Record<string, unknown>) =>
    request<Driver>(`/v1/admin/drivers/${id}`, { method: "PATCH", body }),

  // ── Subscriptions ──
  plans: () => request<Plan[]>("/v1/admin/plans"),
  createPlan: (body: Record<string, unknown>) =>
    request<Plan>("/v1/admin/plans", { method: "POST", body }),
  updatePlan: (id: string, body: Record<string, unknown>) =>
    request<Plan>(`/v1/admin/plans/${id}`, { method: "PATCH", body }),
  subscriptions: (status?: string) =>
    request<Subscription[]>("/v1/admin/subscriptions", { params: { status } }),

  // ── Users & settings ──
  users: (params: { q?: string; role?: string; page?: number; page_size?: number }) =>
    request<Page<User>>("/v1/admin/users", { params }),
  createStaff: (body: Record<string, unknown>, role: string) =>
    request<User>("/v1/admin/users/staff", { method: "POST", body, params: { role } }),
  setUserStatus: (id: string, isActive: boolean) =>
    request<User>(`/v1/admin/users/${id}/status`, {
      method: "PATCH",
      params: { is_active: isActive },
    }),

  notificationTemplates: () =>
    request<NotificationTemplate[]>("/v1/admin/notification-templates"),
  updateNotificationTemplate: (id: string, body: Record<string, unknown>) =>
    request<{ message: string }>(`/v1/admin/notification-templates/${id}`, {
      method: "PATCH",
      body,
    }),
  notificationLog: (limit = 100) =>
    request<NotificationLogEntry[]>("/v1/admin/notifications", { params: { limit } }),

  // ── Driver portal ──
  driverProfile: () => request<DriverProfile>("/v1/driver/me"),
  driverSummary: () => request<DriverSummary>("/v1/driver/summary"),
  driverTrips: (days = 7) => request<Trip[]>("/v1/driver/trips", { params: { days } }),
  driverTripsToday: () => request<Trip[]>("/v1/driver/trips/today"),
  driverManifest: (tripId: string) => request<TripManifest>(`/v1/driver/trips/${tripId}/manifest`),
  driverUpdateStatus: (tripId: string, status: string, notify = false) =>
    request<Trip>(`/v1/driver/trips/${tripId}/status`, {
      method: "POST",
      body: { status, notify_passengers: notify },
    }),
};
