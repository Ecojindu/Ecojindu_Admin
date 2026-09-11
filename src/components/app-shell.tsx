"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bus,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { LeafMark } from "@/components/brand";
import { useAuth } from "@/lib/auth";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const OPERATIONS_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Today",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/scanner", label: "Check-in scanner", icon: QrCode },
    ],
  },
  {
    group: "Operate",
    items: [
      { href: "/trips", label: "Trips & timetable", icon: CalendarClock },
      { href: "/bookings", label: "Bookings", icon: Ticket },
      { href: "/charter", label: "Charter", icon: Bus },
      { href: "/manifest", label: "Manifests", icon: ClipboardList },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/subscriptions", label: "Subscriptions", icon: Sparkles },
    ],
  },
  {
    group: "Manage",
    items: [
      { href: "/fleet", label: "Fleet & routes", icon: Bus },
      { href: "/people", label: "Drivers & staff", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings, superAdminOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, isSuperAdmin } = useAuth();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-dvh">
      {/* Backdrop for the mobile drawer */}
      {open && (
        <button
          className="fixed inset-0 z-30 bg-forest-deep/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-forest-deep text-cream-100",
          "transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.08] px-5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
            <LeafMark className="size-[18px] text-leaf" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="truncate text-sm font-extrabold text-white">Ecojindu</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-leaf-light">
              Operations
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="tap-target -mr-2 ml-auto grid place-items-center rounded-lg text-cream-100/70 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Operations">
          {OPERATIONS_NAV.map((section) => {
            const items = section.items.filter((i) => !i.superAdminOnly || isSuperAdmin);
            if (items.length === 0) return null;

            return (
              <div key={section.group} className="mb-5">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cream-100/35">
                  {section.group}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-moss text-white"
                              : "text-cream-100/70 hover:bg-white/[0.07] hover:text-white",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <item.icon className="size-[18px] shrink-0" aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Account */}
        <div className="border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf/25 text-xs font-bold text-leaf-light">
              {user ? initials(user.full_name) : "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
              <p className="truncate text-[11px] capitalize text-cream-100/50">
                {user?.role.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={signOut}
              className="tap-target grid shrink-0 place-items-center rounded-lg text-cream-100/60 transition-colors hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="size-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="tap-target -ml-2 grid place-items-center rounded-lg text-forest"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="text-sm font-bold text-forest">Ecojindu Operations</span>
        </header>

        <main id="main" className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-balance text-display-sm font-extrabold text-forest">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
