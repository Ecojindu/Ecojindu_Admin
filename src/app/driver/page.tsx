"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BatteryCharging, CalendarDays, ChevronRight, Clock, Users } from "lucide-react";

import {
  Badge,
  EmptyState,
  OccupancyBar,
  Panel,
  PanelBody,
  Skeleton,
  TripStatusBadge,
} from "@/components/ui/panel";
import { api } from "@/lib/api";
import { formatDate, formatTime, todayISO } from "@/lib/utils";
import type { Trip } from "@/lib/types";

export default function DriverHome() {
  const profile = useQuery({ queryKey: ["driver-profile"], queryFn: api.driverProfile });
  const summary = useQuery({ queryKey: ["driver-summary"], queryFn: api.driverSummary });
  const trips = useQuery({
    queryKey: ["driver-trips"],
    queryFn: () => api.driverTrips(7),
    refetchInterval: 60_000,
  });

  const today = todayISO();
  const all = trips.data ?? [];
  const todays = all.filter((t) => t.service_date === today);
  const upcoming = all.filter((t) => t.service_date > today);

  return (
    <>
      {/* Today at a glance */}
      <div className="rounded-xl bg-forest p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-leaf-light">Today</p>
        {summary.isLoading ? (
          <Skeleton className="mt-3 h-12 bg-white/10" />
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-5">
              <div>
                <p className="tabular text-4xl font-extrabold leading-none">
                  {summary.data?.trips_today ?? 0}
                </p>
                <p className="mt-1 text-xs text-cream-100/70">
                  {summary.data?.trips_today === 1 ? "trip" : "trips"}
                </p>
              </div>
              <div>
                <p className="tabular text-4xl font-extrabold leading-none">
                  {summary.data?.passengers_today ?? 0}
                </p>
                <p className="mt-1 text-xs text-cream-100/70">passengers</p>
              </div>
            </div>

            {summary.data?.next_departure && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm">
                <Clock className="size-4 shrink-0 text-leaf" aria-hidden />
                Next departure at{" "}
                <strong className="tabular">{formatTime(summary.data.next_departure)}</strong>
              </p>
            )}
          </>
        )}
      </div>

      {/* Vehicle */}
      {profile.data?.assigned_vehicle && (
        <Panel className="mt-4">
          <PanelBody className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-leaf/12">
              <BatteryCharging className="size-5 text-moss" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-forest">
                {profile.data.assigned_vehicle.name}
              </p>
              <p className="font-mono text-xs text-ink-soft">
                {profile.data.assigned_vehicle.plate_no} ·{" "}
                {profile.data.assigned_vehicle.seat_capacity} seats
              </p>
            </div>
            <Badge variant="leaf">{profile.data.assigned_vehicle.range_km} km</Badge>
          </PanelBody>
        </Panel>
      )}

      {/* Today's runs */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-soft">
          Today&apos;s runs
        </h2>

        {trips.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : todays.length === 0 ? (
          <Panel>
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled today"
              description="You have no assigned departures for today. Enjoy the break."
            />
          </Panel>
        ) : (
          <div className="space-y-3">
            {todays.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {/* Coming up */}
      {upcoming.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-soft">
            Coming up
          </h2>
          <Panel>
            <ul className="divide-y divide-line">
              {upcoming.map((trip) => (
                <li key={trip.id}>
                  <Link
                    href={`/driver/trips/${trip.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted"
                  >
                    <div className="w-16 shrink-0 text-center">
                      <p className="tabular text-sm font-extrabold text-forest">
                        {formatTime(trip.departure_datetime)}
                      </p>
                      <p className="text-[10px] text-ink-soft">
                        {formatDate(trip.departure_datetime).split(",")[0]}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{trip.route_name}</p>
                      <p className="text-xs text-ink-soft">
                        {trip.seats_booked}/{trip.seats_total} booked
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-ink-soft" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}
    </>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      href={`/driver/trips/${trip.id}`}
      className="block rounded-xl border border-line bg-surface p-4 shadow-panel transition-shadow hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-2xl font-extrabold text-forest">
            {formatTime(trip.departure_datetime)}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink">{trip.route_name}</p>
        </div>
        <TripStatusBadge status={trip.status} />
      </div>

      <p className="mt-3 truncate text-xs text-ink-soft">
        From {trip.origin_terminal.split(",")[0]}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
        <Users className="size-4 shrink-0 text-ink-soft" aria-hidden />
        <OccupancyBar booked={trip.seats_booked} total={trip.seats_total} className="flex-1" />
        <ChevronRight className="size-4 shrink-0 text-ink-soft" aria-hidden />
      </div>
    </Link>
  );
}
