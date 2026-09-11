"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Operations screens are watched live — short staleness, and a refetch
            // when the operator comes back to the tab.
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status ?? 0;
              if (status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
