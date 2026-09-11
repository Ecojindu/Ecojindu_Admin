"use client";

import Link from "next/link";
import { LogOut, ShieldAlert } from "lucide-react";

import { LeafMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * Shown when someone is signed in, but as the wrong kind of account for the
 * area they've landed on.
 *
 * The point is to name what happened. Operations and the driver portal share one
 * session per browser, so signing into one takes over the other — and a silent
 * bounce between them is indistinguishable from a broken link.
 */
export function WrongRole({ area }: { area: "operations" | "driver" }) {
  const { user, signOut } = useAuth();
  if (!user) return null;

  const role = user.role.replace("_", " ");
  const theirHome = user.role === "driver" ? "/driver" : "/";
  const theirHomeLabel = user.role === "driver" ? "Open the driver portal" : "Go to the dashboard";

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-forest-deep">
          <LeafMark className="size-6 text-leaf" />
        </span>

        <span className="mx-auto mt-7 grid size-14 place-items-center rounded-2xl bg-amber-light">
          <ShieldAlert className="size-7 text-amber-dark" aria-hidden />
        </span>

        <h1 className="mt-5 text-2xl font-extrabold text-forest">
          This area is for {area === "operations" ? "operations staff" : "drivers"}
        </h1>

        <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-muted">
          You&apos;re signed in as <strong className="text-ink">{user.full_name}</strong>, a{" "}
          <strong className="text-ink">{role}</strong> account
          {area === "operations"
            ? " — so the operations pages aren't available on this login."
            : " — the driver portal is only for driver accounts."}
        </p>

        <div className="mt-7 space-y-2">
          <Button asChild block size="lg">
            <Link href={theirHome}>{theirHomeLabel}</Link>
          </Button>
          <Button block variant="outline" size="lg" onClick={signOut}>
            <LogOut aria-hidden />
            Sign in as someone else
          </Button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-soft">
          Operations and the driver portal share one sign-in per browser, so logging into one
          replaces the other. Use a separate browser profile if you need both at once.
        </p>
      </div>
    </div>
  );
}
