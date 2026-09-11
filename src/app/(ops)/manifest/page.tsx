"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Printer, QrCode, Users } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Badge,
  BookingStatusBadge,
  EmptyState,
  OccupancyBar,
  Panel,
  PanelBody,
  PanelHeader,
  SourceBadge,
  Skeleton,
  Stat,
  TableSkeleton,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, formatTime, naira, todayISO } from "@/lib/utils";

export default function ManifestPage() {
  return (
    <Suspense fallback={null}>
      <Manifest />
    </Suspense>
  );
}

function Manifest() {
  const params = useSearchParams();
  const today = todayISO();
  const [tripId, setTripId] = React.useState(params.get("trip") ?? "");
  const [date, setDate] = React.useState(today);

  const trips = useQuery({
    queryKey: ["admin-trips", date, date],
    queryFn: () => api.trips({ date_from: date, date_to: date }),
  });

  const manifest = useQuery({
    queryKey: ["manifest", tripId],
    queryFn: () => api.manifest(tripId),
    enabled: Boolean(tripId),
    refetchInterval: 30_000,
  });

  // Default to the next departure that hasn't left yet.
  React.useEffect(() => {
    if (tripId || !trips.data?.length) return;
    const upcoming = trips.data.find((t) => t.is_bookable) ?? trips.data[0];
    if (upcoming) setTripId(upcoming.id);
  }, [trips.data, tripId]);

  const data = manifest.data;

  return (
    <>
      <PageHeader
        title="Manifest"
        description="Who is on which shuttle, and who has already boarded."
        action={
          <div className="flex gap-2">
            {data && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer aria-hidden />
                Print
              </Button>
            )}
            <Button asChild size="sm">
              <Link href={`/scanner${tripId ? `?trip=${tripId}` : ""}`}>
                <QrCode aria-hidden />
                Scanner
              </Link>
            </Button>
          </div>
        }
      />

      <Panel className="mb-5 print:hidden">
        <PanelBody className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <label htmlFor="date" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Service date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTripId("");
              }}
              className="h-11 w-full rounded-lg border-2 border-line bg-surface px-3 text-sm focus:border-moss focus:outline-none"
            />
          </div>
          <div className="min-w-[280px] flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Departure
            </label>
            <Select value={tripId} onValueChange={setTripId}>
              <SelectTrigger className="h-11 text-sm" aria-label="Departure">
                <SelectValue placeholder="Choose a departure" />
              </SelectTrigger>
              <SelectContent>
                {(trips.data ?? []).map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {formatTime(trip.departure_datetime)} · {trip.route_name} (
                    {trip.seats_booked}/{trip.seats_total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PanelBody>
      </Panel>

      {!tripId ? (
        <Panel>
          <EmptyState
            icon={ClipboardList}
            title="Pick a departure"
            description="Choose a date and a departure above to see its passenger manifest."
          />
        </Panel>
      ) : manifest.isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[118px] rounded-xl" />
            ))}
          </div>
          <Panel className="mt-6">
            <TableSkeleton rows={6} cols={5} />
          </Panel>
        </>
      ) : data ? (
        <>
          {/* Trip header */}
          <Panel className="mb-5">
            <PanelBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="tabular text-2xl font-extrabold text-forest">
                  {formatTime(data.trip.departure_datetime)}
                </p>
                <p className="mt-0.5 text-sm text-ink">{data.trip.route_name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {formatDate(data.trip.departure_datetime)} ·{" "}
                  {data.trip.vehicle_name ?? "No vehicle"} ·{" "}
                  {data.trip.driver_name ?? "No driver"}
                </p>
              </div>
              <div className="w-full max-w-[220px]">
                <OccupancyBar booked={data.trip.seats_booked} total={data.trip.seats_total} />
              </div>
            </PanelBody>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Booked seats" value={String(data.total_passengers)} icon={Users} />
            <Stat
              label="Checked in"
              value={`${data.checked_in_count}/${data.passengers.length}`}
              tone="leaf"
            />
            <Stat
              label="Still to board"
              value={String(data.passengers.length - data.checked_in_count)}
              tone={data.passengers.length - data.checked_in_count > 0 ? "amber" : "default"}
            />
            <Stat label="Revenue" value={naira(data.revenue_kobo)} tone="teal" />
          </div>

          <Panel className="mt-6">
            <PanelHeader
              title={`${data.passengers.length} passenger${data.passengers.length === 1 ? "" : "s"}`}
              description="Sorted by booking time"
            />
            <div className="scroll-x">
              {data.passengers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No passengers yet"
                  description="Nobody has booked this departure."
                />
              ) : (
                <table className="data-table min-w-[820px]">
                  <thead>
                    <tr>
                      <th scope="col">Seat</th>
                      <th scope="col">Passenger</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Pickup</th>
                      <th scope="col">Channel</th>
                      <th scope="col">Boarding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.passengers.map((passenger) => (
                      <tr key={passenger.booking_ref}>
                        <td className="tabular font-bold text-forest">
                          {passenger.seat_numbers.join(", ") || "—"}
                        </td>
                        <td>
                          <p className="font-medium text-ink">{passenger.passenger_name}</p>
                          <p className="text-xs text-ink-soft">{passenger.passenger_phone}</p>
                        </td>
                        <td className="font-mono text-xs font-bold text-ink-muted">
                          {passenger.booking_ref}
                        </td>
                        <td className="text-xs text-ink-muted">{passenger.pickup_stop ?? "Terminal"}</td>
                        <td>
                          <SourceBadge source={passenger.source} />
                        </td>
                        <td>
                          {passenger.checked_in_at ? (
                            <Badge variant="leaf">
                              Boarded {formatTime(passenger.checked_in_at)}
                            </Badge>
                          ) : (
                            <BookingStatusBadge status={passenger.status} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>

          <p className="mt-4 text-xs text-ink-soft">
            Refreshes automatically every 30 seconds. Generated {formatDateTime(new Date().toISOString())}.
          </p>
        </>
      ) : null}
    </>
  );
}
