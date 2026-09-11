"use client";

import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { WrongRole } from "@/components/wrong-role";
import { ADMIN_ROLES, useRequireRole } from "@/lib/auth";

/**
 * Everything under this group is operations/super-admin only. A driver who lands
 * here is told why rather than being silently moved to their own portal.
 */
export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const { loading, permitted, wrongRole } = useRequireRole(ADMIN_ROLES);

  // Signed in, wrong account type — say so rather than bouncing them elsewhere.
  if (wrongRole) return <WrongRole area="operations" />;

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

  return <AppShell>{children}</AppShell>;
}
