"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bus,
  CalendarDays,
  CheckCircle2,
  Mail,
  Phone,
  Send,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, Drawer } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Alert,
  Badge,
  type BadgeProps,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatDateTime, naira } from "@/lib/utils";
import type { CharterRequest } from "@/lib/admin-types";

const STATUS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  requested: { label: "Needs quote", variant: "amber" },
  quoted: { label: "Awaiting payment", variant: "teal" },
  confirmed: { label: "Paid", variant: "leaf" },
  assigned: { label: "Assigned", variant: "leaf" },
  completed: { label: "Completed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "clay" },
  declined: { label: "Declined", variant: "clay" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "requested", label: "Needs quote" },
  { value: "quoted", label: "Awaiting payment" },
  { value: "confirmed", label: "Paid, unassigned" },
  { value: "assigned", label: "Assigned" },
];

export default function CharterPage() {
  return (
    <Suspense fallback={null}>
      <CharterQueue />
    </Suspense>
  );
}

function CharterQueue() {
  const params = useSearchParams();
  const [status, setStatus] = React.useState(params.get("status") ?? "all");
  const [selected, setSelected] = React.useState<CharterRequest | null>(null);

  const charters = useQuery({
    queryKey: ["charters", status],
    queryFn: () => api.charters(status === "all" ? undefined : status),
    refetchInterval: 60_000,
  });

  // Memoised so the `??` doesn't produce a new array identity every render and
  // re-fire the effect below on a loop.
  const rows = React.useMemo(() => charters.data ?? [], [charters.data]);

  const needsQuote = rows.filter((c) => c.status === "requested").length;
  const awaitingPayment = rows.filter((c) => c.status === "quoted").length;
  const unassigned = rows.filter((c) => c.status === "confirmed").length;
  const pipeline = rows
    .filter((c) => ["quoted", "confirmed", "assigned"].includes(c.status))
    .reduce((sum, c) => sum + (c.quoted_amount_kobo ?? 0), 0);

  // Keep the selected charter in step with refetches, so the drawer never goes stale.
  React.useEffect(() => {
    if (!selected) return;
    const fresh = rows.find((c) => c.reference === selected.reference);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [rows, selected]);

  return (
    <>
      <PageHeader
        title="Charter"
        description="Whole-vehicle hire. Quote a request, take payment, then assign a vehicle."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Needs a quote"
          value={String(needsQuote)}
          sub="Customer is waiting"
          icon={Send}
          tone={needsQuote > 0 ? "amber" : "default"}
        />
        <Stat
          label="Awaiting payment"
          value={String(awaitingPayment)}
          sub="Quoted, not yet paid"
          icon={Wallet}
          tone="teal"
        />
        <Stat
          label="Paid, unassigned"
          value={String(unassigned)}
          sub="Needs a vehicle"
          icon={Bus}
          tone={unassigned > 0 ? "amber" : "leaf"}
        />
        <Stat label="Pipeline value" value={naira(pipeline)} sub="Quoted and confirmed" />
      </div>

      {needsQuote > 0 && (
        <Alert variant="warning" className="mt-5" title={`${needsQuote} request${needsQuote === 1 ? "" : "s"} waiting on a price`}>
          <p>
            Customers are told they&apos;ll hear back within one working day. Quote them from the
            table below.
          </p>
        </Alert>
      )}

      <Panel className="mt-6">
        <PanelHeader
          title={`${rows.length} charter${rows.length === 1 ? "" : "s"}`}
          action={
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-52 text-sm" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <div className="scroll-x">
          {charters.isLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Bus}
              title="No charter requests"
              description="Requests submitted from the website's charter form will appear here."
            />
          ) : (
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Journey</th>
                  <th scope="col">Date</th>
                  <th scope="col">Pax</th>
                  <th scope="col">Quote</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((charter) => (
                  <tr
                    key={charter.id}
                    onClick={() => setSelected(charter)}
                    className="cursor-pointer"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(charter);
                    }}
                  >
                    <td className="font-mono text-xs font-bold text-forest">{charter.reference}</td>
                    <td>
                      <p className="font-medium text-ink">{charter.contact_name}</p>
                      <p className="text-xs text-ink-soft">
                        {charter.organisation ?? charter.contact_phone}
                      </p>
                    </td>
                    <td className="max-w-[260px]">
                      <p className="truncate text-sm text-ink">
                        {charter.origin_text} → {charter.destination_text}
                      </p>
                      {charter.return_trip && (
                        <p className="text-xs text-teal-dark">Return trip</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs text-ink-muted">
                      {formatDate(`${charter.service_date}T09:00:00+01:00`)}
                      {charter.preferred_time && (
                        <>
                          <br />
                          {charter.preferred_time.slice(0, 5)}
                        </>
                      )}
                    </td>
                    <td className="tabular text-ink-muted">{charter.passengers}</td>
                    <td className="tabular font-semibold text-forest">
                      {charter.quoted_amount_kobo !== null
                        ? naira(charter.quoted_amount_kobo)
                        : "—"}
                    </td>
                    <td>
                      <Badge variant={(STATUS[charter.status] ?? STATUS.requested).variant}>
                        {(STATUS[charter.status] ?? { label: charter.status }).label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {selected && <CharterDrawer charter={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function CharterDrawer({ charter, onClose }: { charter: CharterRequest; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quoting, setQuoting] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [declining, setDeclining] = React.useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["charters"] });

  const markPaid = useMutation({
    mutationFn: () => api.markCharterPaid(charter.reference),
    onSuccess: () => {
      toast(`${charter.reference} marked as paid.`, "success");
      invalidate();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't update.", "error"),
  });

  const badge = STATUS[charter.status] ?? { label: charter.status, variant: "neutral" as const };

  return (
    <>
      <Drawer title={charter.reference} onClose={onClose}>
        <div className="flex items-center justify-between gap-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="text-xs text-ink-soft">
            Requested {formatDateTime(charter.created_at)}
          </span>
        </div>

        {/* Customer */}
        <div className="mt-5 rounded-lg border border-line p-4">
          <p className="text-sm font-bold text-ink">{charter.contact_name}</p>
          {charter.organisation && (
            <p className="text-xs text-ink-soft">{charter.organisation}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`tel:${charter.contact_phone}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold text-forest"
            >
              <Phone className="size-3.5" aria-hidden />
              {charter.contact_phone}
            </a>
            {charter.contact_email && (
              <a
                href={`mailto:${charter.contact_email}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold text-forest"
              >
                <Mail className="size-3.5" aria-hidden />
                {charter.contact_email}
              </a>
            )}
          </div>
        </div>

        {/* Journey */}
        <dl className="mt-5 divide-y divide-line text-sm">
          <Row label="From" value={charter.origin_text} />
          <Row label="To" value={charter.destination_text} />
          {charter.route_name && <Row label="Published route" value={charter.route_name} />}
          <Row label="Date" value={formatDate(`${charter.service_date}T09:00:00+01:00`)} />
          {charter.preferred_time && (
            <Row label="Preferred time" value={charter.preferred_time.slice(0, 5)} />
          )}
          <Row label="Passengers" value={String(charter.passengers)} />
          <Row label="Return trip" value={charter.return_trip ? "Yes" : "No"} />
          {charter.vehicle_name && <Row label="Vehicle" value={charter.vehicle_name} />}
          {charter.driver_name && <Row label="Driver" value={charter.driver_name} />}
        </dl>

        {charter.notes && (
          <div className="mt-4 rounded-lg bg-surface-muted p-3.5">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Customer notes
            </p>
            <p className="text-sm leading-relaxed text-ink">{charter.notes}</p>
          </div>
        )}

        {charter.quoted_amount_kobo !== null && (
          <div className="mt-5 rounded-lg border border-line p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Quoted
              </span>
              <span className="tabular text-2xl font-extrabold text-forest">
                {naira(charter.quoted_amount_kobo)}
              </span>
            </div>
            {charter.quote_notes && (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{charter.quote_notes}</p>
            )}
            {charter.quoted_at && (
              <p className="mt-2 text-xs text-ink-soft">Sent {formatDateTime(charter.quoted_at)}</p>
            )}
          </div>
        )}

        {charter.status === "assigned" && charter.trip_id && (
          <Alert variant="success" className="mt-5" title="Trip created">
            <p>
              The whole vehicle is reserved for this charter, so it never appears in public seat
              availability. The driver sees it on their portal and the manifest works as normal.
            </p>
          </Alert>
        )}

        {["cancelled", "declined"].includes(charter.status) && (
          <Alert variant="error" className="mt-5" title="Closed">
            <p>{charter.cancellation_reason}</p>
          </Alert>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-2">
          {["requested", "quoted"].includes(charter.status) && (
            <Button block onClick={() => setQuoting(true)}>
              <Send aria-hidden />
              {charter.status === "quoted" ? "Re-quote" : "Send a quote"}
            </Button>
          )}

          {charter.status === "quoted" && (
            <Button
              block
              variant="outline"
              onClick={() => markPaid.mutate()}
              loading={markPaid.isPending}
            >
              <CheckCircle2 aria-hidden />
              Record an off-platform payment
            </Button>
          )}

          {["confirmed", "assigned"].includes(charter.status) && (
            <Button block onClick={() => setAssigning(true)}>
              <Bus aria-hidden />
              {charter.status === "assigned" ? "Reassign vehicle" : "Assign vehicle & driver"}
            </Button>
          )}

          {!["cancelled", "declined", "completed"].includes(charter.status) && (
            <Button block variant="ghost" onClick={() => setDeclining(true)}>
              <XCircle aria-hidden />
              {["requested", "quoted"].includes(charter.status) ? "Decline" : "Cancel charter"}
            </Button>
          )}
        </div>
      </Drawer>

      {quoting && (
        <QuoteDialog charter={charter} onClose={() => setQuoting(false)} onDone={invalidate} />
      )}
      {assigning && (
        <AssignDialog charter={charter} onClose={() => setAssigning(false)} onDone={invalidate} />
      )}
      {declining && (
        <DeclineDialog
          charter={charter}
          onClose={() => setDeclining(false)}
          onDone={() => {
            invalidate();
            onClose();
          }}
        />
      )}
    </>
  );
}

function QuoteDialog({
  charter,
  onClose,
  onDone,
}: {
  charter: CharterRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = React.useState(
    charter.quoted_amount_kobo ? String(charter.quoted_amount_kobo / 100) : "",
  );
  const [notes, setNotes] = React.useState(charter.quote_notes ?? "");
  const [vehicleId, setVehicleId] = React.useState(charter.vehicle_id ?? "none");
  const [notify, setNotify] = React.useState(true);

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });

  // The customer saw an indicative figure of fare × capacity; surface the same
  // basis here so a quote isn't pulled out of thin air.
  const suggested = vehicles.data?.find((v) => v.id === vehicleId);

  const send = useMutation({
    mutationFn: () =>
      api.quoteCharter(charter.reference, {
        quoted_amount_kobo: Math.round(Number(amount) * 100),
        quote_notes: notes || null,
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        notify,
      }),
    onSuccess: () => {
      toast(
        notify
          ? `Quote sent to ${charter.contact_name}.`
          : "Quote saved without notifying the customer.",
        "success",
      );
      onDone();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't send that quote.", "error"),
  });

  const valid = Number(amount) > 0;

  return (
    <Dialog
      title={charter.status === "quoted" ? "Re-quote this charter" : "Send a quote"}
      description={`${charter.origin_text} → ${charter.destination_text} · ${charter.passengers} passengers`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field
          label="Price for the whole vehicle (₦)"
          htmlFor="amount"
          hint="This is the binding number the customer pays."
        >
          <Input
            id="amount"
            type="number"
            min={0}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="210000"
            className="text-lg font-bold"
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">
            Earmark a vehicle
          </label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger aria-label="Vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Decide later</SelectItem>
              {(vehicles.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} · {v.seat_capacity} seats
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggested && suggested.seat_capacity < charter.passengers && (
            <p className="mt-2 text-xs font-semibold text-clay-dark">
              {suggested.name} seats {suggested.seat_capacity} — this charter needs{" "}
              {charter.passengers}.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="quote_notes" className="mb-1.5 block text-sm font-semibold text-forest">
            What&apos;s included
          </label>
          <textarea
            id="quote_notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Includes return leg and luggage trailer. Waiting time up to 1 hour."
            className="w-full rounded-lg border-2 border-line bg-surface p-3 text-sm leading-relaxed text-ink focus:border-moss focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-soft">Shown to the customer with the quote.</p>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted p-3.5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Email and text the quote</span>
            <span className="block text-xs text-ink-soft">
              Includes a payment link they can use straight away.
            </span>
          </span>
          <Switch checked={notify} onCheckedChange={setNotify} aria-label="Notify the customer" />
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button block disabled={!valid} loading={send.isPending} onClick={() => send.mutate()}>
          <Send aria-hidden />
          {notify ? "Send quote" : "Save quote"}
        </Button>
      </div>
    </Dialog>
  );
}

function AssignDialog({
  charter,
  onClose,
  onDone,
}: {
  charter: CharterRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [vehicleId, setVehicleId] = React.useState(charter.vehicle_id ?? "");
  const [driverId, setDriverId] = React.useState(charter.driver_id ?? "none");

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });
  const drivers = useQuery({ queryKey: ["drivers"], queryFn: api.drivers });

  const assign = useMutation({
    mutationFn: () =>
      api.assignCharter(charter.reference, {
        vehicle_id: vehicleId,
        driver_id: driverId === "none" ? null : driverId,
        create_trip: true,
      }),
    onSuccess: () => {
      toast("Vehicle assigned and the trip created.", "success");
      onDone();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't assign that.", "error"),
  });

  const chosen = vehicles.data?.find((v) => v.id === vehicleId);
  const tooSmall = chosen ? chosen.seat_capacity < charter.passengers : false;

  return (
    <Dialog
      title="Assign vehicle & driver"
      description={`${charter.reference} · ${charter.passengers} passengers`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Vehicle</label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger aria-label="Vehicle" invalid={tooSmall}>
              <SelectValue placeholder="Choose a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {(vehicles.data ?? [])
                .filter((v) => v.status === "active")
                .map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} · {v.plate_no} · {v.seat_capacity} seats
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {tooSmall && (
            <p className="mt-2 text-xs font-semibold text-clay-dark">
              Too small — {chosen?.seat_capacity} seats for {charter.passengers} passengers. The
              backend will refuse this.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Driver</label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger aria-label="Driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign later</SelectItem>
              {(drivers.data ?? [])
                .filter((d) => d.is_active)
                .map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Alert variant="info">
          <p className="text-xs">
            Assigning creates a trip with every seat taken, so this charter can never show up in
            public availability — while still giving you a manifest and the driver a run on their
            portal.
          </p>
        </Alert>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          block
          disabled={!vehicleId || tooSmall}
          loading={assign.isPending}
          onClick={() => assign.mutate()}
        >
          Assign
        </Button>
      </div>
    </Dialog>
  );
}

function DeclineDialog({
  charter,
  onClose,
  onDone,
}: {
  charter: CharterRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const isDecline = ["requested", "quoted"].includes(charter.status);

  const act = useMutation({
    mutationFn: () => api.declineCharter(charter.reference, reason, notify),
    onSuccess: (r) => {
      toast(r.message, "success");
      onDone();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't do that.", "error"),
  });

  return (
    <Dialog
      title={isDecline ? "Decline this request" : "Cancel this charter"}
      description={charter.reference}
      onClose={onClose}
    >
      {!isDecline && (
        <Alert variant="warning" className="mb-4">
          <p>
            This charter has been paid for. Cancelling also cancels the trip, and a refund will be
            due.
          </p>
        </Alert>
      )}

      <Field label="Reason (the customer sees this)" htmlFor="reason">
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isDecline ? "No vehicle available on that date" : "Vehicle breakdown"}
        />
      </Field>

      <label className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-surface-muted p-3.5">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Let the customer know</span>
          <span className="block text-xs text-ink-soft">Sends an email and SMS.</span>
        </span>
        <Switch checked={notify} onCheckedChange={setNotify} aria-label="Notify the customer" />
      </label>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Keep it
        </Button>
        <Button
          variant="danger"
          block
          disabled={reason.trim().length < 3}
          loading={act.isPending}
          onClick={() => act.mutate()}
        >
          {isDecline ? "Decline" : "Cancel charter"}
        </Button>
      </div>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-xs text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
