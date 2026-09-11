import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

// ── Panel ────────────────────────────────────────────────────

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("panel", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-forest">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

// ── Badge ────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
  {
    variants: {
      variant: {
        neutral: "bg-surface-sunken text-ink-muted",
        leaf: "bg-leaf/15 text-moss-dark",
        forest: "bg-forest text-white",
        teal: "bg-teal/15 text-teal-dark",
        amber: "bg-amber-light text-amber-dark",
        clay: "bg-clay-light text-clay-dark",
        outline: "border border-line-strong bg-surface text-ink-muted",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const BOOKING_STATUS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pending_payment: { label: "Awaiting payment", variant: "amber" },
  confirmed: { label: "Confirmed", variant: "leaf" },
  checked_in: { label: "Checked in", variant: "teal" },
  completed: { label: "Completed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "clay" },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const item = BOOKING_STATUS[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

const TRIP_STATUS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  boarding: { label: "Boarding", variant: "amber" },
  departed: { label: "Departed", variant: "teal" },
  arrived: { label: "Arrived", variant: "leaf" },
  cancelled: { label: "Cancelled", variant: "clay" },
};

export function TripStatusBadge({ status }: { status: string }) {
  const item = TRIP_STATUS[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

const SOURCE_LABEL: Record<string, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  admin: "Admin",
  subscription: "Credits",
  agent: "AI agent",
};

export function SourceBadge({ source }: { source: string }) {
  const variant: BadgeProps["variant"] =
    source === "whatsapp" ? "teal" : source === "subscription" ? "leaf" : "neutral";
  return <Badge variant={variant}>{SOURCE_LABEL[source] ?? source}</Badge>;
}

// ── Occupancy bar ────────────────────────────────────────────

/** Occupancy is the number operations reads most — colour it by health. */
export function OccupancyBar({
  booked,
  total,
  showLabel = true,
  className,
}: {
  booked: number;
  total: number;
  showLabel?: boolean;
  className?: string;
}) {
  const pct = total ? Math.round((booked / total) * 100) : 0;
  const tone =
    pct >= 80 ? "bg-moss" : pct >= 50 ? "bg-leaf" : pct >= 25 ? "bg-amber" : "bg-clay";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="h-2 min-w-[56px] flex-1 overflow-hidden rounded-full bg-surface-sunken"
        role="meter"
        aria-valuenow={booked}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${booked} of ${total} seats booked`}
      >
        <span
          className={cn("block h-full rounded-full transition-[width] duration-500", tone)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="tabular shrink-0 text-xs font-semibold text-ink-muted">
          {booked}/{total}
        </span>
      )}
    </div>
  );
}

// ── Stat tile ────────────────────────────────────────────────

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "leaf" | "teal" | "amber";
}) {
  const accent = {
    default: "text-forest",
    leaf: "text-moss",
    teal: "text-teal-dark",
    amber: "text-amber-dark",
  }[tone];

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
        {Icon && <Icon className={cn("size-4 shrink-0", accent)} />}
      </div>
      <p className={cn("tabular mt-2 text-3xl font-extrabold leading-none", accent)}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

// ── Feedback ─────────────────────────────────────────────────

const alertVariants = cva("flex items-start gap-2.5 rounded-lg border p-3.5 text-sm", {
  variants: {
    variant: {
      info: "border-teal/25 bg-teal/[0.06] text-ink-muted",
      success: "border-leaf/30 bg-leaf/[0.08] text-forest",
      warning: "border-amber/35 bg-amber-light text-amber-dark",
      error: "border-clay/30 bg-clay-light text-clay-dark",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle } as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = icons[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3.5 grid size-12 place-items-center rounded-full bg-surface-sunken">
        <Icon className="size-5 text-ink-soft" />
      </div>
      <h3 className="text-[15px] font-bold text-forest">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-md", className)} aria-hidden {...props} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-px" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line/70 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-28" : "flex-1")} />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
