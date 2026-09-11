"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A small focus-trapping modal. Radix would be overkill here — these dialogs are
 * short forms, always opened from a button, and always dismissible with Escape.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input, select, button")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-forest-deep/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full animate-fade-up rounded-xl bg-surface p-5 shadow-lift sm:p-6",
          size === "lg" ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-forest">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="tap-target -m-2 grid shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:text-forest"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Right-hand detail drawer — used for the booking detail view. */
export function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-forest-deep/40 backdrop-blur-sm">
      <button className="flex-1" onClick={onClose} aria-label="Close panel" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-md flex-col overflow-y-auto bg-surface shadow-lift"
      >
        <header className="sticky top-0 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <h2 className="truncate text-base font-extrabold text-forest">{title}</h2>
          <button
            onClick={onClose}
            className="tap-target -mr-2 grid shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:text-forest"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 p-5">{children}</div>
      </aside>
    </div>
  );
}
