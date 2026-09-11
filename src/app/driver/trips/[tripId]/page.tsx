"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  MapPin,
  Phone,
  PlayCircle,
  QrCode,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Alert,
  Badge,
  EmptyState,
  OccupancyBar,
  Panel,
  PanelBody,
  PanelHeader,
  Skeleton,
  TripStatusBadge,
} from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { formatDateLong, formatTime, naira } from "@/lib/utils";

/** Forward-only status flow, mirroring the backend's own guard. */
const NEXT_STATUS: Record<string, { status: string; label: string; icon: typeof PlayCircle } | null> = {
  scheduled: { status: "boarding", label: "Start boarding", icon: Users },
  boarding: { status: "departed", label: "Mark as departed", icon: PlayCircle },
  departed: { status: "arrived", label: "Mark as arrived", icon: Flag },
  arrived: null,
  cancelled: null,
};

export default function DriverTripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const manifest = useQuery({
    queryKey: ["driver-manifest", tripId],
    queryFn: () => api.driverManifest(tripId),
    refetchInterval: 30_000,
  });

  const advance = useMutation({
    mutationFn: ({ status, notify }: { status: string; notify: boolean }) =>
      api.driverUpdateStatus(tripId, status, notify),
    onSuccess: (trip) => {
      toast(`Trip marked as ${trip.status}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["driver-manifest", tripId] });
      queryClient.invalidateQueries({ queryKey: ["driver-trips"] });
      queryClient.invalidateQueries({ queryKey: ["driver-summary"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't update.", "error"),
  });

  if (manifest.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (manifest.isError || !manifest.data) {
    return (
      <Alert variant="error" title="Couldn't load this trip">
        <p>{(manifest.error as Error)?.message ?? "It may not be assigned to you."}</p>
        <Button asChild size="sm" variant="danger" className="mt-3">
          <Link href="/driver">Back to my trips</Link>
        </Button>
      </Alert>
    );
  }

  const { trip, passengers, total_passengers, checked_in_count, revenue_kobo } = manifest.data;
  const next = NEXT_STATUS[trip.status];
  const remaining = passengers.length - checked_in_count;

  return (
    <>
      <Link
        href="/driver"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My trips
      </Link>

      {/* Trip header */}
      <Panel>
        <PanelBody>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="tabular text-3xl font-extrabold text-forest">
                {formatTime(trip.departure_datetime)}
              </p>
              <p className="mt-0.5 text-sm text-ink">{trip.route_name}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {formatDateLong(trip.departure_datetime)}
              </p>
            </div>
            <TripStatusBadge status={trip.status} />
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-muted p-3 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-moss" aria-hidden />
            <span>
              <span className="block font-semibold text-ink">Pickup</span>
              <span className="text-ink-muted">{trip.origin_terminal}</span>
            </span>
          </p>

          <div className="mt-4 border-t border-line pt-4">
            <OccupancyBar booked={trip.seats_booked} total={trip.seats_total} />
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="tabular text-xl font-extrabold text-forest">{total_passengers}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft">Booked</p>
              </div>
              <div>
                <p className="tabular text-xl font-extrabold text-moss">{checked_in_count}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft">Boarded</p>
              </div>
              <div>
                <p className="tabular text-xl font-extrabold text-amber-dark">{remaining}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft">To board</p>
              </div>
            </div>
          </div>
        </PanelBody>
      </Panel>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        <Button asChild block size="lg" variant="forest">
          <Link href={`/driver/scanner?trip=${trip.id}`}>
            <QrCode aria-hidden />
            Scan tickets for this trip
          </Link>
        </Button>

        {next && (
          <Button
            block
            size="lg"
            loading={advance.isPending}
            onClick={() => advance.mutate({ status: next.status, notify: next.status !== "arrived" })}
          >
            <next.icon aria-hidden />
            {next.label}
          </Button>
        )}

        {trip.status === "arrived" && (
          <Alert variant="success" title="Trip complete">
            <p>Nice work. This run is closed and passengers have been notified.</p>
          </Alert>
        )}
      </div>

      {/* Manifest */}
      <section className="mt-6">
        <Panel>
          <PanelHeader
            title={`${passengers.length} passenger${passengers.length === 1 ? "" : "s"}`}
            description={`${naira(revenue_kobo)} on this run`}
          />
          {passengers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nobody booked"
              description="No passengers on this departure yet."
            />
          ) : (
            <ul className="divide-y divide-line">
              {passengers.map((passenger) => (
                <li key={passenger.booking_ref} className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${
                      passenger.checked_in_at
                        ? "bg-moss text-white"
                        : "bg-surface-sunken text-ink-muted"
                    }`}
                  >
                    {passenger.seat_numbers[0] ?? "—"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {passenger.passenger_name}
                    </p>
                    <p className="font-mono text-xs text-ink-soft">
                      {passenger.booking_ref}
                      {passenger.seats > 1 && ` · ${passenger.seats} seats`}
                    </p>
                    {passenger.pickup_stop && (
                      <p className="mt-0.5 truncate text-xs text-teal-dark">
                        Pickup: {passenger.pickup_stop}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {passenger.checked_in_at ? (
                      <Badge variant="leaf">
                        <CheckCircle2 className="size-3" aria-hidden />
                        Boarded
                      </Badge>
                    ) : (
                      <a
                        href={`tel:${passenger.passenger_phone}`}
                        className="tap-target grid place-items-center rounded-lg text-moss transition-colors hover:bg-leaf/10"
                        aria-label={`Call ${passenger.passenger_name}`}
                      >
                        <Phone className="size-4" aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </>
  );
}
