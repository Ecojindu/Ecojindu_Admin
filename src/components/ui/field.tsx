"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-sm font-semibold text-forest", className)}
    {...props}
  />
));
Label.displayName = "Label";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Label + control + hint/error, wired for screen readers.
 *
 * The error node is always present with `aria-live`, so an error announced
 * after a failed submit reaches assistive tech without a layout jump.
 */
export function Field({ label, htmlFor, error, hint, optional, children, className }: FieldProps) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional && <span className="text-xs text-ink-soft">Optional</span>}
      </div>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, {
            id: htmlFor,
            "aria-describedby": [hint ? hintId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined,
          })
        : children}

      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-ink-soft">
          {hint}
        </p>
      )}

      <div aria-live="polite" className="min-h-0">
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-clay">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export { Label };
