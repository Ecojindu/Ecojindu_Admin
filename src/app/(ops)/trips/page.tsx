"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, ClipboardList, Plus, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Alert,
  Badge,
  EmptyState,
  OccupancyBar,
  Panel,
  PanelBody,
  PanelHeader,
  TableSkeleton,
  TripStatusBadge,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { addDaysISO, formatDate, formatTime, naira, todayISO } from "@/lib/utils";
import type { AdminTrip, TripTemplate } from "@/lib/admin-types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TripsPage() {
  const [tab, setTab] = React.useState<"trips" | "timetable">("trips");

  return (
    <>
      <PageHeader
        title="Trips & timetable"
        description="Concrete departures, and the recurring schedule they're generated from."
      />

      <div className="mb-6 inline-flex rounded-lg border border-line bg-surface p-1" role="tablist">
        {(
          [
            { id: "trips", label: "Departures" },
            { id: "timetable", label: "Timetable" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`tap-target rounded-md px-5 text-sm font-semibold transition-colors ${
              tab === item.id ? "bg-forest text-white" : "text-ink-muted hover:text-forest"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "trips" ? <TripsTable /> : <TimetablePanel />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
//  Departures
// ══════════════════════════════════════════════════════════════

function TripsTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = todayISO();
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(addDaysISO(today, 6));
  const [routeId, setRouteId] = React.useState("all");
  const [cancelling, setCancelling] = React.useState<AdminTrip | null>(null);
  const [assigning, setAssigning] = React.useState<AdminTrip | null>(null);

  const routes = useQuery({ queryKey: ["routes"], queryFn: api.routes });
  const trips = useQuery({
    queryKey: ["admin-trips", from, to, routeId],
    queryFn: () =>
      api.trips({
        date_from: from,
        date_to: to,
        route_id: routeId === "all" ? undefined : routeId,
      }),
  });

  const generate = useMutation({
    mutationFn: () => api.generateTrips(14),
    onSuccess: (result) => {
      toast(result.message, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Generation failed.", "error"),
  });

  const rows = trips.data ?? [];

  return (
    <>
      {/* Filters */}
      <Panel className="mb-5">
        <PanelBody className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px]">
            <label htmlFor="from" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              From
            </label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 w-full rounded-lg border-2 border-line bg-surface px-3 text-sm focus:border-moss focus:outline-none"
            />
          </div>
          <div className="min-w-[150px]">
            <label htmlFor="to" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              To
            </label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 w-full rounded-lg border-2 border-line bg-surface px-3 text-sm focus:border-moss focus:outline-none"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Route
            </label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by route">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                {(routes.data ?? []).map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => generate.mutate()}
            loading={generate.isPending}
            loadingText="Generating…"
          >
            <RefreshCw aria-hidden />
            Generate next 14 days
          </Button>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={`${rows.length} departure${rows.length === 1 ? "" : "s"}`}
          description={`${formatDate(`${from}T09:00:00+01:00`)} → ${formatDate(`${to}T09:00:00+01:00`)}`}
        />
        <div className="scroll-x">
          {trips.isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="No departures in this range"
              description="Generate trips from the timetable, or widen the date filter."
              action={
                <Button size="sm" onClick={() => generate.mutate()} loading={generate.isPending}>
                  Generate from timetable
                </Button>
              }
            />
          ) : (
            <table className="data-table min-w-[940px]">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Departs</th>
                  <th scope="col">Route</th>
                  <th scope="col">Vehicle / Driver</th>
                  <th scope="col">Occupancy</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((trip) => (
                  <tr key={trip.id}>
                    <td className="whitespace-nowrap text-ink-muted">
                      {formatDate(trip.departure_datetime)}
                    </td>
                    <td className="tabular whitespace-nowrap font-bold text-forest">
                      {formatTime(trip.departure_datetime)}
                    </td>
                    <td className="max-w-[220px] truncate text-ink">{trip.route_name}</td>
                    <td className="text-xs text-ink-muted">
                      <span className={trip.vehicle_name ? "" : "font-semibold text-amber-dark"}>
                        {trip.vehicle_name ?? "No vehicle"}
                      </span>
                      <br />
                      <span className={trip.driver_name ? "" : "font-semibold text-amber-dark"}>
                        {trip.driver_name ?? "No driver"}
                      </span>
                    </td>
                    <td className="min-w-[150px]">
                      <OccupancyBar booked={trip.seats_booked} total={trip.seats_total} />
                    </td>
                    <td className="tabular font-semibold text-forest">
                      {naira(trip.revenue_kobo)}
                    </td>
                    <td>
                      <TripStatusBadge status={trip.status} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="xs">
                          <Link href={`/manifest?trip=${trip.id}`}>
                            <ClipboardList aria-hidden />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setAssigning(trip)}>
                          Assign
                        </Button>
                        {trip.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-clay hover:bg-clay-light"
                            onClick={() => setCancelling(trip)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {cancelling && (
        <CancelTripDialog trip={cancelling} onClose={() => setCancelling(null)} />
      )}
      {assigning && <AssignDialog trip={assigning} onClose={() => setAssigning(null)} />}
    </>
  );
}

function CancelTripDialog({ trip, onClose }: { trip: AdminTrip; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reason, setReason] = React.useState("");
  const [notify, setNotify] = React.useState(true);

  const cancel = useMutation({
    mutationFn: () => api.cancelTrip(trip.id, reason, notify),
    onSuccess: (result) => {
      toast(result.message, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't cancel that.", "error"),
  });

  return (
    <Dialog title="Cancel this departure" onClose={onClose}>
      <p className="text-sm text-ink-muted">
        <strong className="text-forest">
          {formatTime(trip.departure_datetime)} · {trip.route_name}
        </strong>
        <br />
        {trip.seats_booked} seat{trip.seats_booked === 1 ? "" : "s"} booked across{" "}
        {trip.confirmed_bookings} confirmed booking{trip.confirmed_bookings === 1 ? "" : "s"}.
      </p>

      <Alert variant="warning" className="mt-4">
        <p>Every booking on this departure will be cancelled and its seats released.</p>
      </Alert>

      <div className="mt-4">
        <Field label="Reason (passengers will see this)" htmlFor="reason">
          <Input
            placeholder="Vehicle maintenance"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-surface-muted p-3.5">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Notify all passengers</span>
          <span className="block text-xs text-ink-soft">
            Sends an email and SMS to every affected booking.
          </span>
        </span>
        <Switch checked={notify} onCheckedChange={setNotify} aria-label="Notify all passengers" />
      </label>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Keep it
        </Button>
        <Button
          variant="danger"
          block
          disabled={reason.trim().length < 3}
          loading={cancel.isPending}
          loadingText="Cancelling…"
          onClick={() => cancel.mutate()}
        >
          Cancel departure
        </Button>
      </div>
    </Dialog>
  );
}

function AssignDialog({ trip, onClose }: { trip: AdminTrip; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [vehicleId, setVehicleId] = React.useState(trip.vehicle_id ?? "none");
  const [driverId, setDriverId] = React.useState(trip.driver_id ?? "none");

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });
  const drivers = useQuery({ queryKey: ["drivers"], queryFn: api.drivers });

  const save = useMutation({
    mutationFn: () =>
      api.updateTrip(trip.id, {
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        driver_id: driverId === "none" ? null : driverId,
      }),
    onSuccess: () => {
      toast("Assignment saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't save that.", "error"),
  });

  return (
    <Dialog title="Assign vehicle and driver" onClose={onClose}>
      <p className="text-sm text-ink-muted">
        {formatDate(trip.departure_datetime)} · {formatTime(trip.departure_datetime)}
        <br />
        {trip.route_name}
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Vehicle</label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger aria-label="Vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {(vehicles.data ?? []).map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.plate_no} ({vehicle.seat_capacity} seats)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Driver</label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger aria-label="Driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {(drivers.data ?? []).map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.full_name} · {driver.license_no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button block loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </div>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
//  Timetable
// ══════════════════════════════════════════════════════════════

function TimetablePanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);

  const templates = useQuery({ queryKey: ["templates"], queryFn: () => api.templates() });
  const routes = useQuery({ queryKey: ["routes"], queryFn: api.routes });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.updateTemplate(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast("Timetable updated.", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't update that.", "error"),
  });

  const grouped = React.useMemo(() => {
    const map = new Map<string, TripTemplate[]>();
    for (const template of templates.data ?? []) {
      const key = template.route_name ?? "Unassigned route";
      map.set(key, [...(map.get(key) ?? []), template]);
    }
    return [...map.entries()];
  }, [templates.data]);

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New timetable entry
        </Button>
      </div>

      {templates.isLoading ? (
        <Panel>
          <TableSkeleton rows={6} cols={4} />
        </Panel>
      ) : grouped.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CalendarPlus}
            title="No timetable yet"
            description="Add recurring departures and the nightly job will materialise trips from them."
            action={<Button size="sm" onClick={() => setCreating(true)}>Add the first entry</Button>}
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          {grouped.map(([routeName, entries]) => (
            <Panel key={routeName}>
              <PanelHeader
                title={routeName}
                description={`${entries.filter((e) => e.is_active).length} of ${entries.length} slots active`}
              />
              <ul className="divide-y divide-line">
                {entries
                  .slice()
                  .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
                  .map((template) => (
                    <li
                      key={template.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
                    >
                      <span className="tabular w-20 shrink-0 text-base font-extrabold text-forest">
                        {template.departure_time.slice(0, 5)}
                      </span>

                      <div className="flex shrink-0 gap-1">
                        {DAY_LABELS.map((label, index) => {
                          const on = template.days_of_week.includes(index + 1);
                          return (
                            <span
                              key={label}
                              title={label}
                              className={`grid size-6 place-items-center rounded text-[10px] font-bold ${
                                on ? "bg-moss text-white" : "bg-surface-sunken text-ink-soft/60"
                              }`}
                            >
                              {label[0]}
                            </span>
                          );
                        })}
                      </div>

                      <p className="min-w-[160px] flex-1 text-xs text-ink-soft">
                        {template.vehicle_name ?? "No vehicle"} ·{" "}
                        {template.driver_name ?? "No driver"}
                        {template.fare_override_kobo
                          ? ` · ${naira(template.fare_override_kobo)}`
                          : ""}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge variant={template.is_active ? "leaf" : "neutral"}>
                          {template.is_active ? "Active" : "Paused"}
                        </Badge>
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={(checked) =>
                            toggle.mutate({ id: template.id, is_active: checked })
                          }
                          aria-label={`${template.is_active ? "Pause" : "Activate"} the ${template.departure_time.slice(0, 5)} departure`}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {creating && (
        <NewTemplateDialog routes={routes.data ?? []} onClose={() => setCreating(false)} />
      )}
    </>
  );
}

function NewTemplateDialog({
  routes,
  onClose,
}: {
  routes: { id: string; name: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [routeId, setRouteId] = React.useState(routes[0]?.id ?? "");
  const [time, setTime] = React.useState("09:00");
  const [days, setDays] = React.useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });
  const drivers = useQuery({ queryKey: ["drivers"], queryFn: api.drivers });
  const [vehicleId, setVehicleId] = React.useState("none");
  const [driverId, setDriverId] = React.useState("none");

  const create = useMutation({
    mutationFn: () =>
      api.createTemplate({
        route_id: routeId,
        departure_time: `${time}:00`,
        days_of_week: days,
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        driver_id: driverId === "none" ? null : driverId,
        is_active: true,
      }),
    onSuccess: () => {
      toast("Timetable entry added. Generate trips to publish it.", "success");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't create that.", "error"),
  });

  return (
    <Dialog title="New timetable entry" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Route</label>
          <Select value={routeId} onValueChange={setRouteId}>
            <SelectTrigger aria-label="Route">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Field label="Departure time" htmlFor="time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-forest">Runs on</span>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, index) => {
              const day = index + 1;
              const on = days.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setDays((current) =>
                      current.includes(day)
                        ? current.filter((d) => d !== day)
                        : [...current, day].sort(),
                    )
                  }
                  className={`tap-target flex-1 rounded-lg text-xs font-bold transition-colors ${
                    on ? "bg-moss text-white" : "bg-surface-sunken text-ink-soft"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Vehicle</label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger aria-label="Vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign later</SelectItem>
              {(vehicles.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} · {v.plate_no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Driver</label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger aria-label="Driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign later</SelectItem>
              {(drivers.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          block
          disabled={!routeId || days.length === 0}
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          Create entry
        </Button>
      </div>
    </Dialog>
  );
}
