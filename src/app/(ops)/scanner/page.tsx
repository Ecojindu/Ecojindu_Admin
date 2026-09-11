"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { QrCode } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { QrScanner } from "@/components/qr-scanner";
import { Alert, Badge, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
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

export default function ScannerPage() {
  const [tripId, setTripId] = React.useState<string>("any");
  const [history, setHistory] = React.useState<ValidateTicketResponse[]>([]);

  const today = todayISO();
  const { data: trips } = useQuery({
    queryKey: ["trips", today],
    queryFn: () => api.trips({ date_from: today, date_to: today }),
  });

  const active = (trips ?? []).filter((t) => t.status !== "cancelled");

  return (
    <>
      <PageHeader
        title="Check-in scanner"
        description="Point the camera at a passenger's QR ticket."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Departure"
              description="Lock the scanner to one run so wrong-trip tickets are refused"
            />
            <PanelBody>
              <Select value={tripId} onValueChange={setTripId}>
                <SelectTrigger aria-label="Departure to check in against">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any of today&apos;s departures</SelectItem>
                  {active.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {formatTime(trip.departure_datetime)} · {trip.route_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PanelBody>
          </Panel>

          <QrScanner
            tripId={tripId === "any" ? undefined : tripId}
            onResult={(result) => setHistory((h) => [result, ...h].slice(0, 25))}
          />
        </div>

        <Panel className="h-fit">
          <PanelHeader
            title="This session"
            description={`${history.filter((h) => h.valid).length} checked in · ${history.filter((h) => !h.valid).length} refused`}
          />
          {history.length === 0 ? (
            <PanelBody>
              <div className="py-12 text-center">
                <QrCode className="mx-auto size-9 text-ink-soft/60" aria-hidden />
                <p className="mt-3 text-sm text-ink-soft">Scans will be listed here.</p>
              </div>
            </PanelBody>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((entry, index) => (
                <li key={`${entry.booking_ref}-${index}`} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`size-2 shrink-0 rounded-full ${entry.valid ? "bg-moss" : "bg-clay"}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-forest">
                      {entry.booking_ref ?? "—"}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {entry.passenger_name ?? entry.message}
                    </p>
                  </div>
                  <Badge variant={entry.valid ? "leaf" : entry.already_checked_in ? "amber" : "clay"}>
                    {entry.valid ? "In" : entry.already_checked_in ? "Repeat" : "Refused"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Alert variant="info" className="mt-6">
        <p className="text-xs">
          Tickets are cryptographically signed, so a forged or edited QR is refused. A ticket that
          has already been scanned reports <strong>Repeat</strong> rather than passing silently.
        </p>
      </Alert>
    </>
  );
}
