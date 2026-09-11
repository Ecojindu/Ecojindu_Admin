"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { api, tokenStore } from "./api";
import type { User, UserRole } from "./types";

export const ADMIN_ROLES: UserRole[] = ["operations", "super_admin"];
export const STAFF_ROLES: UserRole[] = ["operations", "super_admin", "driver"];

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<User>;
  signOut: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDriver: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setUser(tokenStore.user);
    setLoading(false);

    const sync = () => setUser(tokenStore.user);
    window.addEventListener("ejs:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ejs:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signIn = React.useCallback(async (identifier: string, password: string) => {
    const result = await api.login(identifier, password);

    // This app is staff-only. A passenger account gets a clear rejection rather
    // than a half-working dashboard.
    if (!STAFF_ROLES.includes(result.user.role)) {
      throw new Error("This portal is for Ecojindu staff. Passengers should use the main site.");
    }

    tokenStore.save(result.tokens, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      isAdmin: Boolean(user && ADMIN_ROLES.includes(user.role)),
      isSuperAdmin: user?.role === "super_admin",
      isDriver: user?.role === "driver",
    }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Role gate.
 *
 * Operations and the driver portal are one app on one origin, so they share a
 * single session. That means signing into the driver portal takes over any
 * operations session in the same browser — including in another tab, via the
 * `storage` sync above.
 *
 * This used to silently `router.replace()` to the other portal, which read as a
 * broken link: you click "Charter" and land on the driver page with no idea why.
 * It now reports the mismatch and lets the layout explain it instead.
 */
export function useRequireRole(allowed: UserRole[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // A missing session is unambiguous, so that one still redirects.
    if (loading || user) return;
    const next = typeof window !== "undefined" ? window.location.pathname : "/";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [user, loading, router]);

  const permitted = Boolean(user && allowed.includes(user.role));

  return {
    user,
    loading,
    permitted,
    /** Signed in, but as the wrong kind of account for this area. */
    wrongRole: Boolean(user && !permitted),
  };
}
