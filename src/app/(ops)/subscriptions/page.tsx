"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  Stat,
  TableSkeleton,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDate, naira } from "@/lib/utils";

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "exhausted", label: "Credits used up" },
  { value: "expired", label: "Expired" },
  { value: "pending_payment", label: "Awaiting payment" },
];

export default function SubscriptionsPage() {
  const [status, setStatus] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const subscriptions = useQuery({
    queryKey: ["subscriptions", status],
    queryFn: () => api.subscriptions(status === "all" ? undefined : status),
  });

  const plans = useQuery({ queryKey: ["plans"], queryFn: api.plans });

  const rows = React.useMemo(() => {
    const all = subscriptions.data ?? [];
    if (!query.trim()) return all;
    const needle = query.trim().toLowerCase();
    return all.filter(
      (s) =>
        s.subscriber_name?.toLowerCase().includes(needle) ||
        s.subscriber_phone?.includes(needle) ||
        s.plan_name?.toLowerCase().includes(needle),
    );
  }, [subscriptions.data, query]);

  const active = (subscriptions.data ?? []).filter((s) => s.status === "active");
  const creditsOutstanding = active.reduce((sum, s) => sum + s.credits_remaining, 0);
  const revenue = (subscriptions.data ?? []).reduce((sum, s) => sum + s.amount_paid_kobo, 0);

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Who holds ride credits, how many are left, and when they expire."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active subscribers" value={String(active.length)} icon={Sparkles} tone="leaf" />
        <Stat
          label="Credits outstanding"
          value={String(creditsOutstanding)}
          sub="Rides already paid for"
          tone="teal"
        />
        <Stat label="Lifetime revenue" value={naira(revenue)} />
        <Stat
          label="Plans on sale"
          value={String((plans.data ?? []).filter((p) => p.is_active).length)}
        />
      </div>

      {/* Plans */}
      <Panel className="mt-6">
        <PanelHeader title="Plans" description="What passengers can buy today" />
        <div className="scroll-x">
          {plans.isLoading ? (
            <TableSkeleton rows={2} cols={5} />
          ) : (
            <table className="data-table min-w-[680px]">
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Price</th>
                  <th scope="col">Rides</th>
                  <th scope="col">Per ride</th>
                  <th scope="col">Validity</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {(plans.data ?? []).map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <p className="font-medium text-ink">{plan.name}</p>
                      <p className="font-mono text-xs text-ink-soft">{plan.code}</p>
                    </td>
                    <td className="tabular font-bold text-forest">{naira(plan.price_kobo)}</td>
                    <td className="tabular text-ink-muted">{plan.ride_credits}</td>
                    <td className="tabular text-ink-muted">
                      {naira(Math.round(plan.price_kobo / plan.ride_credits))}
                    </td>
                    <td className="tabular text-ink-muted">{plan.validity_days} days</td>
                    <td>
                      <Badge variant={plan.is_active ? "leaf" : "neutral"}>
                        {plan.is_active ? "On sale" : "Withdrawn"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {/* Subscribers */}
      <Panel className="mt-6">
        <PanelHeader
          title="Subscribers"
          description={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
        />
        <PanelBody className="flex flex-wrap items-end gap-3 border-b border-line">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="sub_q" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <Input
                id="sub_q"
                placeholder="Name, phone or plan"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-10 text-sm"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PanelBody>

        <div className="scroll-x">
          {subscriptions.isLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No subscribers match"
              description="Try a different search, or change the status filter."
            />
          ) : (
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th scope="col">Subscriber</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Credits</th>
                  <th scope="col">Used</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((subscription) => {
                  const usedPct = subscription.credits_total
                    ? (subscription.credits_used / subscription.credits_total) * 100
                    : 0;
                  const expiringSoon =
                    subscription.expires_at &&
                    new Date(subscription.expires_at).getTime() - Date.now() < 14 * 86_400_000;

                  return (
                    <tr key={subscription.id}>
                      <td>
                        <p className="font-medium text-ink">
                          {subscription.subscriber_name ?? "—"}
                        </p>
                        <p className="text-xs text-ink-soft">{subscription.subscriber_phone}</p>
                      </td>
                      <td className="text-sm text-ink-muted">{subscription.plan_name}</td>
                      <td className="tabular font-bold text-forest">
                        {subscription.credits_remaining}
                        <span className="font-normal text-ink-soft">
                          /{subscription.credits_total}
                        </span>
                      </td>
                      <td className="min-w-[110px]">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-sunken">
                          <span
                            className="block h-full rounded-full bg-teal"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="text-xs">
                        {subscription.expires_at ? (
                          <span className={expiringSoon ? "font-semibold text-amber-dark" : "text-ink-muted"}>
                            {formatDate(subscription.expires_at)}
                          </span>
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="tabular text-ink-muted">
                        {naira(subscription.amount_paid_kobo)}
                      </td>
                      <td>
                        <Badge
                          variant={
                            subscription.status === "active"
                              ? "leaf"
                              : subscription.status === "exhausted"
                                ? "amber"
                                : subscription.status === "pending_payment"
                                  ? "outline"
                                  : "neutral"
                          }
                        >
                          {subscription.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </>
  );
}
