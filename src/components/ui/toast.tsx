"use client";

import * as React from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

const icons = { success: CheckCircle2, error: XCircle, info: Info } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lift",
                t.tone === "success" && "bg-forest text-white",
                t.tone === "error" && "bg-clay text-white",
                t.tone === "info" && "bg-white text-ink ring-1 ring-cream-300",
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
