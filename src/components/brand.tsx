import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Official eShuttle aerodynamic speed-leaf emblem mark.
 * Uses the exact graphic from the official logo asset.
 */
export function EShuttleMark({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo-mark.png"
      alt="eShuttle"
      className={cn("h-7 w-auto object-contain", className)}
    />
  );
}

/** Legacy alias for backwards compatibility */
export const LeafMark = EShuttleMark;

/**
 * Official eShuttle brand logo component.
 * Uses the exact official artwork (emblem + typography) provided.
 */
export function Logo({
  className,
  variant = "dark",
  layout = "horizontal",
  href = "/",
}: {
  className?: string;
  variant?: "dark" | "light";
  layout?: "horizontal" | "stacked";
  href?: string;
}) {
  const isLight = variant === "light";
  const imgSrc =
    layout === "stacked"
      ? "/images/logo.png"
      : isLight
      ? "/images/logo-horizontal-light.png"
      : "/images/logo-horizontal.png";

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center transition-opacity hover:opacity-95", className)}
      aria-label="eShuttle"
    >
      <img
        src={imgSrc}
        alt="eShuttle"
        className={cn(
          "w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]",
          layout === "stacked" ? "h-12" : "h-7 sm:h-8"
        )}
      />
    </Link>
  );
}

/** Chart palette — brand greens first, then distinguishable neighbours. */
export const CHART_COLORS = [
  "#4C8C2B", // moss
  "#2BAE8E", // teal
  "#7CB342", // leaf
  "#2F5233", // forest
  "#D99A20", // amber
  "#8A918D", // soft ink
  "#C4562F", // clay
] as const;
