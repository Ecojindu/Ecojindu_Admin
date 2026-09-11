"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Search, Send, Ticket, XCircle } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, Drawer } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Alert,
  BookingStatusBadge,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SourceBadge,
  TableSkeleton,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { formatDateTime, naira, todayISO } from "@/lib/utils";
import type { Booking } from "@/lib/types";

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SOURCES = [
  { value: "all", label: "All channels" },
  { value: "web", label: "Web" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "subscription", label: "Ride credits" },
  { value: "admin", label: "Admin" },
  { value: "agent", label: "AI agent" },
];

export default function BookingsPage() {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Booking | null>(null);
  const [creating, setCreating] = React.useState(false);

  // Debounce so typing a phone number doesn't fire nine requests.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const bookings = useQuery({
    queryKey: ["bookings", debounced, status, source, page],
    queryFn: () =>
      api.bookings({
        q: debounced || undefined,
        status: status === "all" ? undefined : status,
        source: source === "all" ? undefined : source,
        page,
        page_size: 25,
      }),
  });

  const rows = bookings.data?.items ?? [];
  const total = bookings.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${total} booking${total === 1 ? "" : "s"} matching your filters`}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Manual booking
          </Button>
        }
      />

      <Panel className="mb-5">
        <PanelBody className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="q" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <Input
                id="q"
                placeholder="Reference, name, phone or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-10 text-sm"
              />
            </div>
          </div>

          <div className="min-w-[170px]">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[170px]">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Channel
            </label>
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <div className="scroll-x">
          {bookings.isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No bookings match"
              description="Try a different search term, or clear the filters."
            />
          ) : (
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Passenger</th>
                  <th scope="col">Trip</th>
                  <th scope="col">Seats</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => setSelected(booking)}
                    className="cursor-pointer"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(booking);
                    }}
                  >
                    <td className="font-mono text-xs font-bold text-forest">
                      {booking.booking_ref}
                    </td>
                    <td>
                      <p className="font-medium text-ink">{booking.passenger_name}</p>
                      <p className="text-xs text-ink-soft">{booking.passenger_phone}</p>
                    </td>
                    <td className="max-w-[240px]">
                      <p className="truncate text-sm text-ink">{booking.trip?.route_name ?? "—"}</p>
                      <p className="text-xs text-ink-soft">
                        {booking.trip ? formatDateTime(booking.trip.departure_datetime) : "—"}
                      </p>
                    </td>
                    <td className="tabular text-ink-muted">{booking.seats}</td>
                    <td className="tabular font-semibold text-forest">
                      {booking.subscription_id ? "Credit" : naira(booking.amount_kobo)}
                    </td>
                    <td>
                      <SourceBadge source={booking.source} />
                    </td>
                    <td>
                      <BookingStatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
            <p className="text-xs text-ink-soft">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {selected && <BookingDrawer booking={selected} onClose={() => setSelected(null)} />}
      {creating && <ManualBookingDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function BookingDrawer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const resend = useMutation({
    mutationFn: () => api.resendTicket(booking.booking_ref),
    onSuccess: (r) => toast(r.message, "success"),
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't resend.", "error"),
  });

  const confirm = useMutation({
    mutationFn: () => api.confirmBooking(booking.booking_ref),
    onSuccess: (r) => {
      toast(r.message, "success");
      invalidate();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't confirm.", "error"),
  });

  const cancel = useMutation({
    mutationFn: () => api.cancelBooking(booking.booking_ref, "Cancelled by operations"),
    onSuccess: () => {
      toast(`${booking.booking_ref} cancelled and seats released.`, "success");
      invalidate();
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't cancel.", "error"),
  });

  const confirmed = ["confirmed", "checked_in"].includes(booking.status);

  return (
    <Drawer title={booking.booking_ref} onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <BookingStatusBadge status={booking.status} />
        <SourceBadge source={booking.source} />
      </div>

      <dl className="mt-5 divide-y divide-line text-sm">
        <Row label="Passenger" value={booking.passenger_name} />
        <Row label="Phone" value={booking.passenger_phone} />
        <Row label="Email" value={booking.passenger_email ?? "—"} />
        <Row label="Route" value={booking.trip?.route_name ?? "—"} />
        <Row
          label="Departs"
          value={booking.trip ? formatDateTime(booking.trip.departure_datetime) : "—"}
        />
        <Row
          label="Seats"
          value={
            booking.seat_numbers.length
              ? `${booking.seats} (${booking.seat_numbers.join(", ")})`
              : String(booking.seats)
          }
        />
        <Row
          label="Amount"
          value={booking.subscription_id ? "Paid with ride credit" : naira(booking.amount_kobo)}
        />
        <Row label="Booked" value={formatDateTime(booking.created_at)} />
        {booking.confirmed_at && <Row label="Confirmed" value={formatDateTime(booking.confirmed_at)} />}
        {booking.cancelled_at && <Row label="Cancelled" value={formatDateTime(booking.cancelled_at)} />}
      </dl>

      {confirmed && (
        <div className="mt-5 rounded-lg border border-line p-4 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Boarding pass
          </p>
          <img
            src={api.ticketImageUrl(booking.booking_ref)}
            alt={`QR ticket for ${booking.booking_ref}`}
            width={180}
            height={180}
            className="mx-auto size-[180px]"
          />
        </div>
      )}

      <div className="mt-5 space-y-2">
        {confirmed && (
          <Button block variant="outline" onClick={() => resend.mutate()} loading={resend.isPending}>
            <Send aria-hidden />
            Resend ticket by email and SMS
          </Button>
        )}

        {booking.status === "pending_payment" && (
          <Button block onClick={() => confirm.mutate()} loading={confirm.isPending}>
            <CheckCircle2 aria-hidden />
            Mark as paid and issue ticket
          </Button>
        )}

        {["pending_payment", "confirmed"].includes(booking.status) &&
          (confirmCancel ? (
            <Alert variant="warning" title="Cancel this booking?">
              <p className="mb-3">The seats are released immediately. Any credit is refunded.</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => cancel.mutate()} loading={cancel.isPending}>
                  Yes, cancel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                  Keep it
                </Button>
              </div>
            </Alert>
          ) : (
            <Button block variant="ghost" onClick={() => setConfirmCancel(true)}>
              <XCircle aria-hidden />
              Cancel booking
            </Button>
          ))}
      </div>
    </Drawer>
  );
}

function ManualBookingDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = todayISO();
  const [tripId, setTripId] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [seats, setSeats] = React.useState(1);
  const [markPaid, setMarkPaid] = React.useState(true);

  const trips = useQuery({
    queryKey: ["admin-trips", today, "manual"],
    queryFn: () => api.trips({ date_from: today, date_to: todayISO() }),
  });

  const bookable = (trips.data ?? []).filter((t) => t.is_bookable);

  const create = useMutation({
    mutationFn: () =>
      api.createBooking({
        trip_id: tripId,
        passenger_name: name,
        passenger_phone: phone,
        passenger_email: email || null,
        seats,
        source: "admin",
        mark_confirmed: markPaid,
      }),
    onSuccess: (booking) => {
      toast(`${booking.booking_ref} created.`, "success");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't create that booking.", "error"),
  });

  return (
    <Dialog
      title="Manual booking"
      description="For walk-ins and phone sales settled at the desk."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Departure (today)</label>
          <Select value={tripId} onValueChange={setTripId}>
            <SelectTrigger aria-label="Departure">
              <SelectValue placeholder="Choose a departure" />
            </SelectTrigger>
            <SelectContent>
              {bookable.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {formatDateTime(trip.departure_datetime)} · {trip.route_name} (
                  {trip.seats_available} left)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bookable.length === 0 && !trips.isLoading && (
            <p className="mt-2 text-xs text-amber-dark">
              No bookable departures left today.
            </p>
          )}
        </div>

        <Field label="Passenger name" htmlFor="m_name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chinedu Okafor" />
        </Field>

        <Field label="Phone number" htmlFor="m_phone">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0815 447 1570"
          />
        </Field>

        <Field label="Email" htmlFor="m_email" optional>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Seats" htmlFor="m_seats">
          <Input
            type="number"
            min={1}
            max={14}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
          />
        </Field>

        <label className="flex items-center justify-between gap-4 rounded-lg bg-surface-muted p-3.5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Already paid at the desk</span>
            <span className="block text-xs text-ink-soft">
              Confirms straight away and issues the QR ticket.
            </span>
          </span>
          <input
            type="checkbox"
            checked={markPaid}
            onChange={(e) => setMarkPaid(e.target.checked)}
            className="size-5 accent-moss"
            aria-label="Already paid at the desk"
          />
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          block
          disabled={!tripId || name.trim().length < 2 || phone.trim().length < 6}
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          Create booking
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
