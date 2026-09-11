"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  CalendarClock,
  ClipboardList,
  QrCode,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import {
  Alert,
  Badge,
  EmptyState,
  OccupancyBar,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
  TripStatusBadge,
} from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatTime, naira, nairaCompact } from "@/lib/utils";
import type { OverviewTrip, TripAlert } from "@/lib/admin-types";

export default function OverviewPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: api.overview,
    // The floor operator leaves this open all day.
    refetchInterval: 60_000,
  });

  if (isError) {
    return (
      <>
        <PageHeader title="Today" />
        <Alert variant="error" title="Couldn't load the dashboard">
          <p>{(error as Error).message}</p>
          <Button size="sm" variant="danger" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </Alert>
      </>
    );
  }

  const summary = data?.summary;

  return (
    <>
      <PageHeader
        title="Today"
        description={
          summary
            ? `${summary.trips_today} departures · ${summary.departures_remaining} still to leave`
            : undefined
        }
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/manifest">
                <ClipboardList aria-hidden />
                Manifests
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/scanner">
                <QrCode aria-hidden />
                Check-in scanner
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
        ) : (
          <>
            <Stat
              label="Revenue today"
              value={naira(summary.revenue_today_kobo)}
              sub={`${summary.bookings_today} booking${summary.bookings_today === 1 ? "" : "s"}`}
              icon={Wallet}
              tone="leaf"
            />
            <Stat
              label="Seats sold today"
              value={`${summary.seats_sold_today}/${summary.seats_offered_today}`}
              sub={`${summary.occupancy_today_pct}% occupancy`}
              icon={Users}
              tone={summary.occupancy_today_pct >= 50 ? "leaf" : "amber"}
            />
            <Stat
              label="Revenue this week"
              value={nairaCompact(summary.revenue_week_kobo)}
              sub={`${summary.bookings_week} bookings`}
              icon={TrendingUp}
            />
            <Stat
              label="Revenue this month"
              value={nairaCompact(summary.revenue_month_kobo)}
              sub={`${summary.active_subscriptions} active subscriptions`}
              icon={CalendarClock}
              tone="teal"
            />
          </>
        )}
      </div>

      {/* Alerts */}
      {data && data.alerts.length > 0 && (
        <Panel className="mt-6 border-amber/30">
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-dark" aria-hidden />
                Needs attention
              </span>
            }
            description={`${data.alerts.length} issue${data.alerts.length === 1 ? "" : "s"} on upcoming departures`}
          />
          <ul className="divide-y divide-line">
            {data.alerts.map((alert, index) => (
              <AlertRow key={`${alert.trip_id}-${alert.kind}-${index}`} alert={alert} />
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Today's trips */}
        <Panel>
          <PanelHeader
            title="Today's departures"
            description="Live occupancy across every run"
            action={
              <Button asChild variant="ghost" size="xs">
                <Link href="/trips">
                  All trips
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          />
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : data && data.todays_trips.length > 0 ? (
            <ul className="divide-y divide-line">
              {data.todays_trips.map((trip) => (
                <TripRow key={trip.trip_id} trip={trip} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Bus}
              title="No departures today"
              description="Generate trips from the timetable, or check that templates are active."
              action={
                <Button asChild size="sm">
                  <Link href="/trips">Open the timetable</Link>
                </Button>
              }
            />
          )}
        </Panel>

        <div className="space-y-6">
          {/* Channel mix */}
          <Panel>
            <PanelHeader title="Bookings by channel" description="This month" />
            <div className="p-5">
              {isLoading || !summary ? (
                <Skeleton className="h-28" />
              ) : summary.channel_breakdown.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-soft">No bookings yet this month.</p>
              ) : (
                <ul className="space-y-3.5">
                  {summary.channel_breakdown.map((channel) => (
                    <li key={channel.source}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold capitalize text-ink">
                          {channel.source === "subscription" ? "Ride credits" : channel.source}
                        </span>
                        <span className="tabular text-xs text-ink-soft">
                          {channel.bookings} · {naira(channel.revenue_kobo)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                        <span
                          className="block h-full rounded-full bg-moss"
                          style={{ width: `${channel.share_pct}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          {/* Upcoming ticker */}
          <Panel>
            <PanelHeader title="Next departures" description="Across all routes" />
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-lg" />
                ))}
              </div>
            ) : data && data.upcoming_departures.length > 0 ? (
              <ul className="divide-y divide-line">
                {data.upcoming_departures.slice(0, 6).map((trip) => (
                  <li key={trip.trip_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="tabular w-16 shrink-0 text-sm font-bold text-forest">
                      {formatTime(trip.departure_datetime)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{trip.route_name}</p>
                      <p className="text-xs text-ink-soft">
                        {trip.driver_name ?? "No driver"} · {trip.vehicle_name ?? "No vehicle"}
                      </p>
                    </div>
                    <Badge variant={trip.occupancy_pct >= 50 ? "leaf" : "outline"}>
                      {trip.seats_booked}/{trip.seats_total}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-center text-sm text-ink-soft">Nothing scheduled ahead.</p>
            )}
          </Panel>
        </div>
      </div>

      {/* Secondary stats */}
      {summary && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Cancellation rate"
            value={`${summary.cancellation_rate_pct}%`}
            sub="This month"
            tone={summary.cancellation_rate_pct > 15 ? "amber" : "default"}
          />
          <Stat
            label="Subscription revenue"
            value={nairaCompact(summary.subscription_revenue_month_kobo)}
            sub="This month"
            tone="teal"
          />
          <Stat
            label="Active subscribers"
            value={String(summary.active_subscriptions)}
            sub="With credits remaining"
            tone="leaf"
          />
        </div>
      )}
    </>
  );
}

function TripRow({ trip }: { trip: OverviewTrip }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="tabular w-16 shrink-0 text-sm font-bold text-forest">
        {formatTime(trip.departure_datetime)}
      </span>

      <div className="min-w-[140px] flex-1">
        <p className="truncate text-sm font-medium text-ink">{trip.route_name}</p>
        <p className="truncate text-xs text-ink-soft">
          {trip.driver_name ?? (
            <span className="font-semibold text-amber-dark">No driver assigned</span>
          )}
          {" · "}
          {trip.vehicle_name ?? (
            <span className="font-semibold text-amber-dark">No vehicle</span>
          )}
        </p>
      </div>

      <OccupancyBar
        booked={trip.seats_booked}
        total={trip.seats_total}
        className="w-32 shrink-0"
      />

      <TripStatusBadge status={trip.status} />

      <Button asChild variant="ghost" size="xs">
        <Link href={`/manifest?trip=${trip.trip_id}`}>Manifest</Link>
      </Button>
    </li>
  );
}

function AlertRow({ alert }: { alert: TripAlert }) {
  const tone =
    alert.severity === "high"
      ? "text-clay-dark bg-clay-light"
      : "text-amber-dark bg-amber-light";

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${tone}`}>
        {alert.severity}
      </span>
      <p className="min-w-[200px] flex-1 text-sm text-ink">{alert.message}</p>
      <Button asChild variant="ghost" size="xs">
        <Link href={`/trips?trip=${alert.trip_id}`}>Fix</Link>
      </Button>
    </li>
  );
}
