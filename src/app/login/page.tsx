"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";

import { LeafMark } from "@/components/brand";
import { Alert } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { config } from "@/lib/config";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, user, loading } = useAuth();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);

  // Already signed in — send them where they belong.
  React.useEffect(() => {
    if (loading || !user) return;
    router.replace(user.role === "driver" ? "/driver" : (params.get("next") ?? "/"));
  }, [user, loading, router, params]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const signedIn = await signIn(identifier.trim(), password);
      router.replace(signedIn.role === "driver" ? "/driver" : (params.get("next") ?? "/"));
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "We couldn't sign you in.",
      );
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-forest-deep p-12 text-cream-100 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10">
            <LeafMark className="size-6 text-leaf" />
          </span>
          <div className="leading-none">
            <p className="text-base font-extrabold text-white">Ecojindu</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf-light">
              Operations
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-balance text-4xl font-extrabold leading-tight text-white">
            Every departure,
            <br />
            <span className="text-leaf">on one screen.</span>
          </h2>
          <p className="mt-5 max-w-sm leading-relaxed text-cream-100/70">
            Live occupancy, manifests, check-in scanning and revenue across the Umuahia, Aba and
            Sam Mbakwe Airport corridor.
          </p>
        </div>

        <p className="text-xs text-cream-100/40">
          Nnenna Otti Bus Terminal, Umuahia, Abia State · Bridging Cities, Powering Green Mobility.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-forest-deep">
              <LeafMark className="size-6 text-leaf" />
            </span>
          </div>

          <h1 className="text-display-sm font-extrabold text-forest">Staff sign in</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Operations, super admin and driver accounts.
          </p>

          <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
            <Field label="Email or phone number" htmlFor="identifier">
              <Input
                autoComplete="username"
                placeholder="ops@ecojindu.ng"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                invalid={Boolean(error)}
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" error={error}>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-14"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={Boolean(error)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1 grid size-12 place-items-center rounded-lg text-ink-soft transition-colors hover:text-forest"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden />
                  ) : (
                    <Eye className="size-5" aria-hidden />
                  )}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              block
              size="lg"
              loading={submitting}
              loadingText="Signing in…"
              disabled={!identifier || !password}
            >
              <LogIn aria-hidden />
              Sign in
            </Button>
          </form>

          <Alert variant="info" className="mt-6">
            <p className="flex items-start gap-1.5 text-xs">
              <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
              Drivers are taken straight to the driver portal after signing in.
            </p>
          </Alert>

          <p className="mt-6 text-center text-xs text-ink-soft">
            Locked out? Contact your super admin or email{" "}
            <a href={`mailto:${config.supportEmail}`} className="font-semibold text-moss hover:underline">
              {config.supportEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
