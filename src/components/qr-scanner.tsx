"use client";

import * as React from "react";
import { Camera, CameraOff, CheckCircle2, Keyboard, RotateCcw, XCircle } from "lucide-react";

import { Alert, Badge } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ValidateTicketResponse } from "@/lib/admin-types";

const REGION_ID = "ejs-qr-region";

/**
 * Camera check-in scanner.
 *
 * `html5-qrcode` is imported dynamically because it touches `navigator` and
 * `window` at module scope, which would break the server build.
 *
 * The result is deliberately loud — a full-bleed green ✓ or red ✗ that a
 * terminal agent can read at arm's length in daylight.
 */
export function QrScanner({
  tripId,
  onResult,
}: {
  tripId?: string;
  onResult?: (result: ValidateTicketResponse) => void;
}) {
  const [scanning, setScanning] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string>();
  const [result, setResult] = React.useState<ValidateTicketResponse | null>(null);
  const [manual, setManual] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [showManual, setShowManual] = React.useState(false);

  const scannerRef = React.useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  // Guards against the same code firing repeatedly while the frame is still in view.
  const lastScanRef = React.useRef<{ token: string; at: number }>({ token: "", at: 0 });

  const validate = React.useCallback(
    async (token: string) => {
      setChecking(true);
      try {
        const outcome = await api.validateTicket(token, tripId);
        setResult(outcome);
        onResult?.(outcome);

        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(outcome.valid ? 60 : [80, 60, 80]);
        }
      } catch (error) {
        setResult({
          valid: false,
          status: "error",
          message: error instanceof ApiError ? error.message : "Couldn't reach the server.",
          booking_ref: null,
          passenger_name: null,
          seats: null,
          seat_numbers: [],
          trip_summary: null,
          checked_in_at: null,
          already_checked_in: false,
        });
      } finally {
        setChecking(false);
      }
    },
    [tripId, onResult],
  );

  const stop = React.useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    } catch {
      // Already stopped — nothing to do.
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const start = React.useCallback(async () => {
    setCameraError(undefined);
    setStarting(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decoded) => {
          const now = Date.now();
          if (decoded === lastScanRef.current.token && now - lastScanRef.current.at < 3000) return;
          lastScanRef.current = { token: decoded, at: now };
          void validate(decoded);
        },
        () => {
          // Per-frame decode misses are normal — ignore them.
        },
      );
      setScanning(true);
    } catch (error) {
      const message =
        error instanceof Error && /permission|NotAllowed/i.test(error.message)
          ? "Camera access was denied. Allow it in your browser settings, or type the reference instead."
          : "Couldn't start the camera. Type the booking reference instead.";
      setCameraError(message);
      setShowManual(true);
    } finally {
      setStarting(false);
    }
  }, [validate]);

  React.useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className="space-y-4">
      {/* Result */}
      {result && (
        <div
          className={cn(
            "animate-fade-up rounded-xl p-6 text-center text-white",
            result.valid ? "bg-moss" : result.already_checked_in ? "bg-amber-dark" : "bg-clay",
          )}
          role="status"
          aria-live="assertive"
        >
          {result.valid ? (
            <CheckCircle2 className="mx-auto size-16" aria-hidden />
          ) : (
            <XCircle className="mx-auto size-16" aria-hidden />
          )}
          <p className="mt-3 text-2xl font-extrabold">{result.valid ? "Checked in" : "Refused"}</p>
          <p className="mt-1 text-sm text-white/90">{result.message}</p>

          {result.booking_ref && (
            <div className="mt-4 rounded-lg bg-white/15 p-4 text-left">
              <p className="font-mono text-lg font-bold tracking-wider">{result.booking_ref}</p>
              {result.passenger_name && (
                <p className="mt-1 text-sm font-semibold">{result.passenger_name}</p>
              )}
              <p className="mt-1 text-xs text-white/80">
                {result.seats} seat{result.seats === 1 ? "" : "s"}
                {result.seat_numbers.length > 0 && ` · ${result.seat_numbers.join(", ")}`}
              </p>
              {result.trip_summary && (
                <p className="mt-1.5 text-xs text-white/70">{result.trip_summary}</p>
              )}
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            className="mt-4"
            onClick={() => {
              setResult(null);
              lastScanRef.current = { token: "", at: 0 };
            }}
          >
            <RotateCcw aria-hidden />
            Scan the next passenger
          </Button>
        </div>
      )}

      {/* Camera */}
      {!result && (
        <div className="overflow-hidden rounded-xl border border-line bg-forest-deep">
          <div
            id={REGION_ID}
            className={cn(
              "mx-auto aspect-square w-full max-w-sm",
              !scanning && "grid place-items-center",
            )}
          >
            {!scanning && (
              <div className="p-8 text-center text-cream-100/60">
                <Camera className="mx-auto size-10" aria-hidden />
                <p className="mt-3 text-sm">Camera is off</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            {scanning ? (
              <Button block variant="secondary" onClick={stop}>
                <CameraOff aria-hidden />
                Stop scanning
              </Button>
            ) : (
              <Button block onClick={start} loading={starting} loadingText="Starting camera…">
                <Camera aria-hidden />
                Start scanning
              </Button>
            )}
          </div>
        </div>
      )}

      {cameraError && (
        <Alert variant="warning" title="Camera unavailable">
          <p>{cameraError}</p>
        </Alert>
      )}

      {/* Manual entry — a cracked screen shouldn't strand a passenger. */}
      {!result && (
        <div>
          {showManual ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) void validate(manual.trim());
              }}
            >
              <label htmlFor="manual-ref" className="text-sm font-semibold text-forest">
                Type the booking reference
              </label>
              <Input
                id="manual-ref"
                placeholder="EJS-8K3F2"
                value={manual}
                onChange={(e) => setManual(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                className="font-mono text-lg tracking-widest"
              />
              <Button type="submit" block loading={checking} disabled={!manual.trim()}>
                Check in
              </Button>
            </form>
          ) : (
            <Button block variant="ghost" onClick={() => setShowManual(true)}>
              <Keyboard aria-hidden />
              Type the reference instead
            </Button>
          )}
        </div>
      )}

      {tripId && (
        <p className="text-center">
          <Badge variant="outline">Locked to this departure</Badge>
        </p>
      )}
    </div>
  );
}
