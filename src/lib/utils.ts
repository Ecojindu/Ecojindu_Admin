import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ₦15,000 — no decimals, because fares are always whole naira. */
export function naira(kobo: number | null | undefined): string {
  const value = (kobo ?? 0) / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function nairaCompact(kobo: number | null | undefined): string {
  const value = (kobo ?? 0) / 100;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}k`;
  return `₦${value}`;
}

const LAGOS = "Africa/Lagos";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: LAGOS,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: LAGOS,
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: LAGOS,
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** `YYYY-MM-DD` for today in Lagos, regardless of the device's timezone. */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: LAGOS });
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function humanDayLabel(isoDate: string): string {
  const today = todayISO();
  if (isoDate === today) return "Today";
  if (isoDate === addDaysISO(today, 1)) return "Tomorrow";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function durationLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** "Umuahia" from "Nnenna Otti Bus Terminal, Umuahia" — for tight card layouts. */
export function shortPlace(name: string): string {
  const parts = name.split(",").map((p) => p.trim());
  const last = parts[parts.length - 1];
  if (/airport/i.test(name)) return "Owerri Airport";
  return last.length <= 18 ? last : parts[0];
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Time left on a seat hold, as "4:32". Returns null once it has lapsed. */
export function countdownLabel(expiresAt: string | null, now: number = Date.now()): string | null {
  if (!expiresAt) return null;
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return null;
  const total = Math.floor(remaining / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function seatsBadge(available: number): {
  label: string;
  tone: "plenty" | "limited" | "scarce" | "none";
} {
  if (available <= 0) return { label: "Sold out", tone: "none" };
  if (available <= 2) return { label: `Only ${available} left`, tone: "scarce" };
  if (available <= 6) return { label: `${available} seats left`, tone: "limited" };
  return { label: `${available} seats left`, tone: "plenty" };
}
