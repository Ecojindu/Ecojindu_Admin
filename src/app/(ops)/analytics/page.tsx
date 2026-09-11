"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { CHART_COLORS } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader, Skeleton, Stat } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { addDaysISO, naira, nairaCompact, todayISO } from "@/lib/utils";

const RANGES = [
  { id: "7d", label: "7 days", days: 7, granularity: "day" as const },
  { id: "30d", label: "30 days", days: 30, granularity: "day" as const },
  { id: "90d", label: "90 days", days: 90, granularity: "week" as const },
  { id: "365d", label: "12 months", days: 365, granularity: "month" as const },
];

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [rangeId, setRangeId] = React.useState("30d");
  const [downloading, setDownloading] = React.useState(false);

  const range = RANGES.find((r) => r.id === rangeId)!;
  const end = todayISO();
  const start = addDaysISO(end, -(range.days - 1));

  const revenue = useQuery({
    queryKey: ["revenue", start, end, range.granularity],
    queryFn: () => api.revenueSeries(start, end, range.granularity),
  });
  const routes = useQuery({
    queryKey: ["route-performance", start, end],
    queryFn: () => api.routePerformance(start, end),
  });
  const occupancy = useQuery({
    queryKey: ["occupancy", start, end],
    queryFn: () => api.occupancyBySlot(start, end),
  });
  const channels = useQuery({
    queryKey: ["channels", start, end],
    queryFn: () => api.channels(start, end),
  });
  const subscriptions = useQuery({
    queryKey: ["subscription-sales", start, end],
    queryFn: () => api.subscriptionSales(start, end),
  });

  const totals = React.useMemo(() => {
    const points = revenue.data ?? [];
    return {
      revenue: points.reduce((sum, p) => sum + p.revenue_kobo, 0),
      bookings: points.reduce((sum, p) => sum + p.bookings, 0),
      seats: points.reduce((sum, p) => sum + p.seats, 0),
    };
  }, [revenue.data]);

  const overallOccupancy = React.useMemo(() => {
    const rows = routes.data ?? [];
    const offered = rows.reduce((s, r) => s + r.seats_offered, 0);
    const sold = rows.reduce((s, r) => s + r.seats_sold, 0);
    return offered ? Math.round((sold / offered) * 100) : 0;
  }, [routes.data]);

  async function exportCsv() {
    setDownloading(true);
    try {
      // Fetched through the API client so the bearer token is attached — a plain
      // <a href> would hit the endpoint unauthenticated.
      const csv = await api.exportCsv(start, end);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ecojindu-bookings-${start}-${end}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast("CSV downloaded.", "success");
    } catch {
      toast("Couldn't export that range.", "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`${start} → ${end}`}
        action={
          <Button size="sm" variant="outline" onClick={exportCsv} loading={downloading}>
            <Download aria-hidden />
            Export CSV
          </Button>
        }
      />

      {/* Range filter */}
      <div className="mb-6 inline-flex rounded-lg border border-line bg-surface p-1" role="tablist">
        {RANGES.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={rangeId === r.id}
            onClick={() => setRangeId(r.id)}
            className={`tap-target rounded-md px-4 text-sm font-semibold transition-colors ${
              rangeId === r.id ? "bg-forest text-white" : "text-ink-muted hover:text-forest"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={naira(totals.revenue)} sub={`${range.label} total`} tone="leaf" />
        <Stat label="Bookings" value={String(totals.bookings)} sub={`${totals.seats} seats sold`} />
        <Stat label="Seat occupancy" value={`${overallOccupancy}%`} sub="All routes" tone="teal" />
        <Stat
          label="Subscriptions sold"
          value={String((subscriptions.data ?? []).reduce((s, p) => s + p.sold, 0))}
          sub={naira((subscriptions.data ?? []).reduce((s, p) => s + p.revenue_kobo, 0))}
          tone="amber"
        />
      </div>

      {/* Revenue trend */}
      <Panel className="mt-6">
        <PanelHeader title="Revenue and bookings" description={`By ${range.granularity}`} />
        <PanelBody>
          {revenue.isLoading ? (
            <Skeleton className="h-72" />
          ) : (revenue.data ?? []).length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <ComposedChart
                data={(revenue.data ?? []).map((p) => ({ ...p, revenue: p.revenue_kobo / 100 }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E8E4" vertical={false} />
                <XAxis dataKey="period" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₦${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) =>
                    name === "Revenue"
                      ? [`₦${Number(value).toLocaleString()}`, "Revenue"]
                      : [value, "Bookings"]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenue"
                  fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bookings"
                  name="Bookings"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </PanelBody>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Occupancy by time slot */}
        <Panel>
          <PanelHeader title="Occupancy by departure time" description="Which slots actually fill" />
          <PanelBody>
            {occupancy.isLoading ? (
              <Skeleton className="h-64" />
            ) : (occupancy.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={occupancy.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E8E4" vertical={false} />
                  <XAxis dataKey="time_slot" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [`${value}%`, "Occupancy"]}
                  />
                  <Bar dataKey="occupancy_pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {(occupancy.data ?? []).map((slot, index) => (
                      <Cell
                        key={slot.time_slot}
                        fill={
                          slot.occupancy_pct >= 70
                            ? CHART_COLORS[0]
                            : slot.occupancy_pct >= 40
                              ? CHART_COLORS[2]
                              : CHART_COLORS[4]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>

        {/* Channel mix */}
        <Panel>
          <PanelHeader title="Booking channels" description="Where bookings come from" />
          <PanelBody>
            {channels.isLoading ? (
              <Skeleton className="h-64" />
            ) : (channels.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={channels.data}
                    dataKey="bookings"
                    nameKey="source"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {(channels.data ?? []).map((entry, index) => (
                      <Cell key={entry.source} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => [`${value} bookings`, String(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* Route performance */}
      <Panel className="mt-6">
        <PanelHeader title="Route performance" description="Trips, seats and revenue by corridor" />
        <div className="scroll-x">
          {routes.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-40" />
            </div>
          ) : (routes.data ?? []).length === 0 ? (
            <Empty />
          ) : (
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th scope="col">Route</th>
                  <th scope="col">Trips</th>
                  <th scope="col">Seats offered</th>
                  <th scope="col">Seats sold</th>
                  <th scope="col">Occupancy</th>
                  <th scope="col" className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(routes.data ?? []).map((route) => (
                  <tr key={route.route_id}>
                    <td className="font-medium text-ink">{route.route_name}</td>
                    <td className="tabular text-ink-muted">{route.trips}</td>
                    <td className="tabular text-ink-muted">{route.seats_offered}</td>
                    <td className="tabular text-ink-muted">{route.seats_sold}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-sunken">
                          <span
                            className="block h-full rounded-full bg-moss"
                            style={{ width: `${Math.min(route.occupancy_pct, 100)}%` }}
                          />
                        </div>
                        <span className="tabular text-xs font-semibold text-ink-muted">
                          {route.occupancy_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="tabular text-right font-bold text-forest">
                      {nairaCompact(route.revenue_kobo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {/* Subscription sales */}
      <Panel className="mt-6">
        <PanelHeader title="Subscription sales" description="By plan" />
        <div className="scroll-x">
          {subscriptions.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-24" />
            </div>
          ) : (subscriptions.data ?? []).length === 0 ? (
            <Empty message="No subscriptions sold in this range." />
          ) : (
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Sold</th>
                  <th scope="col">Still active</th>
                  <th scope="col" className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(subscriptions.data ?? []).map((plan) => (
                  <tr key={plan.plan_id}>
                    <td className="font-medium text-ink">{plan.plan_name}</td>
                    <td className="tabular text-ink-muted">{plan.sold}</td>
                    <td className="tabular text-ink-muted">{plan.active}</td>
                    <td className="tabular text-right font-bold text-forest">
                      {naira(plan.revenue_kobo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </>
  );
}

const AXIS_TICK = { fontSize: 11, fill: "#8A918D" } as const;

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid #E6E8E4",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(21,24,26,0.10)",
} as const;

function Empty({ message = "No data in this range yet." }: { message?: string }) {
  return <p className="py-14 text-center text-sm text-ink-soft">{message}</p>;
}
