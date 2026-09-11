"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Loader2, LogOut, QrCode } from "lucide-react";

import { LeafMark } from "@/components/brand";
import { WrongRole } from "@/components/wrong-role";
import { useAuth, useRequireRole } from "@/lib/auth";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

/** Module-level so the role gate's dependency array stays stable. */
const DRIVER_ONLY: UserRole[] = ["driver"];

const NAV = [
  { href: "/driver", label: "My trips", icon: CalendarDays, exact: true },
  { href: "/driver/scanner", label: "Check in", icon: QrCode },
];

/**
 * The driver portal is a separate, phone-first shell — one thumb, big targets,
 * a bottom bar rather than a sidebar. Drivers are standing at a terminal gate.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const { loading, permitted, wrongRole } = useRequireRole(DRIVER_ONLY);
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (wrongRole) return <WrongRole area="driver" />;

  if (loading || !permitted) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-moss" aria-hidden />
          <p className="mt-3 text-sm text-ink-soft">Checking your access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-forest-deep px-4 py-3 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
            <LeafMark className="size-5 text-leaf" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold">{user?.full_name}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-leaf-light">
              Driver portal
            </p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf/25 text-xs font-bold text-leaf-light">
            {user ? initials(user.full_name) : "—"}
          </span>
          <button
            onClick={signOut}
            className="tap-target grid shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-24">
        {children}
      </main>

      {/* Bottom bar — reachable one-handed. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface"
        aria-label="Driver"
      >
        <div className="mx-auto flex max-w-lg">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-bold transition-colors",
                  active ? "text-moss" : "text-ink-soft",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
