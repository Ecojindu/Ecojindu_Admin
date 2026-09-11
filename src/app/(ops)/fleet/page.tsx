"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BatteryCharging, Bus, MapPin, Plus, Route as RouteIcon, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Alert,
  Badge,
  type BadgeProps,
  EmptyState,
  Panel,
  PanelHeader,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { naira } from "@/lib/utils";
import type { AdminRoute } from "@/lib/admin-types";

export default function FleetPage() {
  const [tab, setTab] = React.useState<"vehicles" | "routes">("vehicles");

  return (
    <>
      <PageHeader title="Fleet & routes" description="The vehicles and the corridors they run." />

      <div className="mb-6 inline-flex rounded-lg border border-line bg-surface p-1" role="tablist">
        {(
          [
            { id: "vehicles", label: "Vehicles" },
            { id: "routes", label: "Routes & stops" },
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

      {tab === "vehicles" ? <VehiclesPanel /> : <RoutesPanel />}
    </>
  );
}

// ── Vehicles ─────────────────────────────────────────────────

const VEHICLE_STATUSES = ["active", "charging", "maintenance", "retired"];

function VehiclesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateVehicle(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast("Vehicle updated.", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't update.", "error"),
  });

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Add vehicle
        </Button>
      </div>

      {vehicles.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (vehicles.data ?? []).length === 0 ? (
        <Panel>
          <EmptyState
            icon={Bus}
            title="No vehicles yet"
            description="Add your EV minibuses so they can be assigned to departures."
            action={<Button size="sm" onClick={() => setCreating(true)}>Add the first vehicle</Button>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(vehicles.data ?? []).map((vehicle) => (
            <Panel key={vehicle.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-extrabold text-forest">{vehicle.name}</h3>
                  <p className="font-mono text-xs text-ink-soft">{vehicle.plate_no}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-leaf/12">
                  <BatteryCharging className="size-5 text-moss" aria-hidden />
                </span>
              </div>

              <p className="mt-3 text-sm text-ink-muted">{vehicle.model}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-xs text-ink-soft">Seats</dt>
                  <dd className="tabular font-bold text-forest">{vehicle.seat_capacity}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft">Range</dt>
                  <dd className="tabular font-bold text-forest">{vehicle.range_km} km</dd>
                </div>
              </dl>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Status</label>
                <Select
                  value={vehicle.status}
                  onValueChange={(status) => setStatus.mutate({ id: vehicle.id, status })}
                >
                  <SelectTrigger
                    className="h-11 text-sm"
                    aria-label={`Status for ${vehicle.name}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {creating && <NewVehicleDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function NewVehicleDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [model, setModel] = React.useState("Wuling EV Minibus");
  const [seats, setSeats] = React.useState(14);
  const [range, setRange] = React.useState(300);

  const create = useMutation({
    mutationFn: () =>
      api.createVehicle({
        name,
        plate_no: plate.toUpperCase(),
        model,
        seat_capacity: seats,
        range_km: range,
        status: "active",
      }),
    onSuccess: () => {
      toast("Vehicle added.", "success");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't add that vehicle.", "error"),
  });

  return (
    <Dialog title="Add a vehicle" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name" htmlFor="v_name" hint="How operations refers to it, e.g. Ugwumba 3.">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ugwumba 3" />
        </Field>
        <Field label="Plate number" htmlFor="v_plate">
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="ABJ-116-EV"
            className="font-mono"
          />
        </Field>
        <Field label="Model" htmlFor="v_model">
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seat capacity" htmlFor="v_seats">
            <Input
              type="number"
              min={1}
              max={60}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </Field>
          <Field label="Range (km)" htmlFor="v_range">
            <Input
              type="number"
              min={0}
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          block
          disabled={name.trim().length < 2 || plate.trim().length < 3}
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          Add vehicle
        </Button>
      </div>
    </Dialog>
  );
}

// ── Routes ───────────────────────────────────────────────────

const READINESS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  bookable: { label: "On sale", variant: "leaf" },
  no_timetable: { label: "No timetable", variant: "amber" },
  no_departures: { label: "No departures", variant: "amber" },
  withdrawn: { label: "Withdrawn", variant: "neutral" },
  charter: { label: "Charter only", variant: "teal" },
};

function RoutesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<AdminRoute | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [stopsFor, setStopsFor] = React.useState<AdminRoute | null>(null);

  const routes = useQuery({ queryKey: ["routes"], queryFn: api.routes });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.updateRoute(id, { is_active }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast(v.is_active ? "Route is back on sale." : "Route withdrawn from sale.", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't update.", "error"),
  });

  const rows = routes.data ?? [];
  const notReady = rows.filter((r) => r.is_active && !r.is_bookable && r.readiness !== "charter");

  if (routes.isLoading) {
    return (
      <Panel>
        <TableSkeleton rows={4} cols={5} />
      </Panel>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Routes added here appear on the customer website straight away.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Add route
        </Button>
      </div>

      {notReady.length > 0 && (
        <Alert
          variant="warning"
          className="mb-5"
          title={`${notReady.length} route${notReady.length === 1 ? " is" : "s are"} live but not sellable`}
        >
          <p>
            {notReady.map((r) => r.name).join(", ")} — a customer can see{" "}
            {notReady.length === 1 ? "it" : "them"} but will find no departures until the timetable
            is set and generated.
          </p>
        </Alert>
      )}

      <div className="space-y-5">
        {rows.map((route) => {
          const badge = READINESS[route.readiness] ?? READINESS.withdrawn;
          return (
            <Panel key={route.id}>
              <PanelHeader
                title={
                  <span className="flex items-center gap-2">
                    <RouteIcon className="size-4 text-moss" aria-hidden />
                    {route.name}
                  </span>
                }
                description={`${route.code} · ${route.distance_km} km · ${route.duration_mins} mins · ${naira(route.base_fare_kobo)}`}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <Button variant="outline" size="xs" onClick={() => setEditing(route)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => setStopsFor(route)}>
                      <MapPin aria-hidden />
                      Stops ({route.stops.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toggle.mutate({ id: route.id, is_active: !route.is_active })}
                    >
                      {route.is_active ? "Withdraw" : "Put on sale"}
                    </Button>
                  </div>
                }
              />

              <div className="p-5">
                {route.readiness_hint && (
                  <Alert variant={route.is_active ? "warning" : "info"} className="mb-4">
                    <p className="text-xs">{route.readiness_hint}</p>
                  </Alert>
                )}

                <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-ink-soft">Timetable slots</dt>
                    <dd className="tabular font-bold text-forest">
                      {route.active_template_count}/{route.template_count} active
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-soft">Upcoming departures</dt>
                    <dd className="tabular font-bold text-forest">{route.upcoming_trip_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-soft">From</dt>
                    <dd className="truncate text-ink">{route.origin_terminal}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-soft">To</dt>
                    <dd className="truncate text-ink">{route.destination}</dd>
                  </div>
                </dl>

                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Stops ({route.stops.length})
                </p>
                {route.stops.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    No stops yet — passengers board at the origin terminal.
                  </p>
                ) : (
                  <ol className="space-y-0">
                    {route.stops.map((stop, index) => (
                      <li key={stop.id} className="flex items-center gap-3 py-2">
                        <span className="relative flex size-5 shrink-0 items-center justify-center">
                          <span
                            className={`size-2.5 rounded-full ${
                              index === route.stops.length - 1 ? "bg-teal" : "bg-leaf"
                            }`}
                          />
                          {index < route.stops.length - 1 && (
                            <span
                              className="absolute left-1/2 top-4 h-5 w-px -translate-x-1/2 bg-line-strong"
                              aria-hidden
                            />
                          )}
                        </span>
                        <span className="flex-1 text-sm text-ink">{stop.name}</span>
                        <Badge variant={stop.pickup_allowed ? "outline" : "neutral"}>
                          {stop.pickup_allowed ? "Pickup" : "Drop-off only"}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {creating && <RouteDialog onClose={() => setCreating(false)} />}
      {editing && <RouteDialog route={editing} onClose={() => setEditing(null)} />}
      {stopsFor && <StopsDialog route={stopsFor} onClose={() => setStopsFor(null)} />}
    </>
  );
}

const SERVICE_TYPES = [
  { value: "airport", label: "Airport transfer — seats on the timetable" },
  { value: "rail", label: "Railway transfer — not yet on sale" },
  { value: "charter", label: "Charter — whole vehicle, quoted" },
];

function RouteDialog({ route, onClose }: { route?: AdminRoute; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = Boolean(route);

  const [form, setForm] = React.useState({
    name: route?.name ?? "",
    code: route?.code ?? "",
    origin_terminal: route?.origin_terminal ?? "",
    destination: route?.destination ?? "",
    distance_km: String(route?.distance_km ?? 0),
    duration_mins: String(route?.duration_mins ?? 60),
    fare_naira: String((route?.base_fare_kobo ?? 1_500_000) / 100),
    charter_naira: route?.charter_fare_kobo ? String(route.charter_fare_kobo / 100) : "",
    description: route?.description ?? "",
  });
  const [serviceType, setServiceType] = React.useState(route?.service_type ?? "airport");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const body = () => ({
    name: form.name.trim(),
    origin_terminal: form.origin_terminal.trim(),
    destination: form.destination.trim(),
    distance_km: Number(form.distance_km) || 0,
    duration_mins: Number(form.duration_mins) || 60,
    base_fare_kobo: Math.round(Number(form.fare_naira) * 100),
    charter_fare_kobo: form.charter_naira ? Math.round(Number(form.charter_naira) * 100) : null,
    service_type: serviceType,
    description: form.description.trim() || null,
  });

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? api.updateRoute(route!.id, body())
        : api.createRoute({ ...body(), code: form.code.trim().toUpperCase(), is_active: true }),
    onSuccess: () => {
      toast(
        isEdit
          ? "Route updated."
          : "Route created — it's live on the website. Add a timetable to make it bookable.",
        "success",
      );
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't save that route.", "error"),
  });

  const valid =
    form.name.trim().length > 2 &&
    form.origin_terminal.trim().length > 1 &&
    form.destination.trim().length > 1 &&
    Number(form.fare_naira) >= 0 &&
    (isEdit || form.code.trim().length >= 2);

  return (
    <Dialog
      title={isEdit ? "Edit route" : "Add a route"}
      description={
        isEdit ? route!.code : "It appears on the customer website as soon as you save."
      }
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Route name" htmlFor="r_name" hint="How it reads to a passenger.">
            <Input
              id="r_name"
              value={form.name}
              onChange={set("name")}
              placeholder="Sam Mbakwe Airport → Aba"
            />
          </Field>
          <Field
            label="Code"
            htmlFor="r_code"
            hint={isEdit ? "Codes can't change once set." : "Short and unique, e.g. OWA-ABA."}
          >
            <Input
              id="r_code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="OWA-ABA"
              className="font-mono"
              disabled={isEdit}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Departs from" htmlFor="r_origin">
            <Input
              id="r_origin"
              value={form.origin_terminal}
              onChange={set("origin_terminal")}
              placeholder="Sam Mbakwe International Cargo Airport, Owerri"
            />
          </Field>
          <Field label="Arrives at" htmlFor="r_dest">
            <Input
              id="r_dest"
              value={form.destination}
              onChange={set("destination")}
              placeholder="Aba Central Terminal"
            />
          </Field>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Service type</label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger aria-label="Service type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fare per seat (₦)" htmlFor="r_fare">
            <Input id="r_fare" type="number" min={0} step={500} value={form.fare_naira} onChange={set("fare_naira")} />
          </Field>
          <Field label="Journey time (mins)" htmlFor="r_duration">
            <Input id="r_duration" type="number" min={5} max={600} value={form.duration_mins} onChange={set("duration_mins")} />
          </Field>
          <Field label="Distance (km)" htmlFor="r_distance" optional>
            <Input id="r_distance" type="number" min={0} value={form.distance_km} onChange={set("distance_km")} />
          </Field>
        </div>

        <Field
          label="Whole-vehicle charter price (₦)"
          htmlFor="r_charter"
          optional
          hint="Shown as an indicative figure on the charter form. Operations still quote the binding price."
        >
          <Input id="r_charter" type="number" min={0} step={1000} value={form.charter_naira} onChange={set("charter_naira")} />
        </Field>

        <Field label="Description" htmlFor="r_desc" optional>
          <Input id="r_desc" value={form.description} onChange={set("description")} />
        </Field>
      </div>

      {!isEdit && (
        <Alert variant="info" className="mt-4">
          <p className="text-xs">
            Saving publishes the route immediately. It won&apos;t be bookable until you add a
            timetable entry under <strong>Trips &amp; timetable</strong> and generate departures.
          </p>
        </Alert>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button block disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>
          {isEdit ? "Save changes" : "Create route"}
        </Button>
      </div>
    </Dialog>
  );
}

function StopsDialog({ route, onClose }: { route: AdminRoute; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [pickup, setPickup] = React.useState(true);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["routes"] });

  const add = useMutation({
    mutationFn: () =>
      api.addStop(route.id, {
        name: name.trim(),
        order: route.stops.length,
        pickup_allowed: pickup,
        lat: null,
        lng: null,
      }),
    onSuccess: () => {
      toast("Stop added.", "success");
      setName("");
      refresh();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't add that stop.", "error"),
  });

  const remove = useMutation({
    mutationFn: (stopId: string) => api.deleteStop(stopId),
    onSuccess: () => {
      toast("Stop removed.", "success");
      refresh();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't remove that stop.", "error"),
  });

  return (
    <Dialog title="Stops" description={route.name} onClose={onClose}>
      {route.stops.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No stops yet. The first stop should be where passengers board.
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {route.stops.map((stop, index) => (
            <li key={stop.id} className="flex items-center gap-3 py-2.5">
              <span className="tabular w-5 shrink-0 text-xs font-bold text-ink-soft">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{stop.name}</span>
              <Badge variant={stop.pickup_allowed ? "outline" : "neutral"}>
                {stop.pickup_allowed ? "Pickup" : "Drop-off"}
              </Badge>
              <Button
                variant="ghost"
                size="xs"
                className="text-clay hover:bg-clay-light"
                onClick={() => remove.mutate(stop.id)}
                aria-label={`Remove ${stop.name}`}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 border-t border-line pt-5">
        <Field label="Add a stop" htmlFor="stop_name">
          <Input
            id="stop_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aba Town Hall"
          />
        </Field>
        <label className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-surface-muted p-3.5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Passengers can board here</span>
            <span className="block text-xs text-ink-soft">
              Turn off for drop-off-only stops like the airport terminal.
            </span>
          </span>
          <Switch checked={pickup} onCheckedChange={setPickup} aria-label="Pickup allowed" />
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Done
        </Button>
        <Button
          block
          disabled={name.trim().length < 2}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          Add stop
        </Button>
      </div>
    </Dialog>
  );
}
