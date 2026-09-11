"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { QrScanner } from "@/components/qr-scanner";
import { Alert, Badge, Panel, PanelBody } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatTime, todayISO } from "@/lib/utils";
import type { ValidateTicketResponse } from "@/lib/admin-types";

export default function DriverScannerPage() {
  return (
    <Suspense fallback={null}>
      <DriverScanner />
    </Suspense>
  );
}

function DriverScanner() {
  const params = useSearchParams();
  const [tripId, setTripId] = React.useState(params.get("trip") ?? "any");
  const [session, setSession] = React.useState<ValidateTicketResponse[]>([]);

  const today = todayISO();
  const trips = useQuery({ queryKey: ["driver-trips-today"], queryFn: api.driverTripsToday });

  const boarded = session.filter((s) => s.valid).length;

  return (
    <>
      <Link
        href="/driver"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My trips
      </Link>

      <h1 className="text-xl font-extrabold text-forest">Check in passengers</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Point the camera at each passenger&apos;s QR ticket.
      </p>

      <Panel className="mt-4">
        <PanelBody>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Departure
          </label>
          <Select value={tripId} onValueChange={setTripId}>
            <SelectTrigger aria-label="Departure to check in against">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any of my trips today</SelectItem>
              {(trips.data ?? []).map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {formatTime(trip.departure_datetime)} · {trip.route_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tripId !== "any" && (
            <p className="mt-2 text-xs text-ink-soft">
              A ticket for a different departure will be refused.
            </p>
          )}
        </PanelBody>
      </Panel>

      <div className="mt-4">
        <QrScanner
          tripId={tripId === "any" ? undefined : tripId}
          onResult={(result) => setSession((s) => [result, ...s].slice(0, 30))}
        />
      </div>

      {session.length > 0 && (
        <Panel className="mt-5">
          <PanelBody className="flex items-center justify-between gap-3 border-b border-line">
            <p className="text-sm font-bold text-forest">This session</p>
            <div className="flex gap-2">
              <Badge variant="leaf">{boarded} boarded</Badge>
              {session.length - boarded > 0 && (
                <Badge variant="clay">{session.length - boarded} refused</Badge>
              )}
            </div>
          </PanelBody>
          <ul className="divide-y divide-line">
            {session.slice(0, 12).map((entry, index) => (
              <li key={`${entry.booking_ref}-${index}`} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`size-2 shrink-0 rounded-full ${entry.valid ? "bg-moss" : "bg-clay"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {entry.passenger_name ?? entry.booking_ref ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{entry.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Alert variant="info" className="mt-5">
        <p className="text-xs">
          The scanner needs camera permission. If it&apos;s blocked, type the booking reference
          instead — it works exactly the same.
        </p>
      </Alert>
    </>
  );
}
