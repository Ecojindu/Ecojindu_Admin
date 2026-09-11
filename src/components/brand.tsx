export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 4C20 4 18.5 3 14.5 3C8.7 3 4 7.7 4 13.5C4 17.6 6.4 20 6.4 20L20 4Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M6.4 20C6.4 20 9 21 12.5 20.2C17.5 19 21 14.5 21 9.5C21 6.5 20 4 20 4L6.4 20Z"
        fill="currentColor"
      />
      <path d="M6 20L12 12" stroke="#16281A" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
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
