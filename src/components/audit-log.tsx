"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, History, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Alert,
  Badge,
  type BadgeProps,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  TableSkeleton,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { addDaysISO, formatDateTime, todayISO } from "@/lib/utils";
import type { AuditEntry } from "@/lib/admin-types";

/** Colour by consequence, not by entity — cancellations should stand out. */
function toneFor(action: string): BadgeProps["variant"] {
  if (/\.(cancel|decline|suspend|deactivate|delete)$/.test(action)) return "clay";
  if (/\.(create|generate)$/.test(action)) return "leaf";
  if (/\.(check_in|status|confirm|assign|quote)$/.test(action)) return "teal";
  return "neutral";
}

const ENTITY_TYPES = [
  { value: "all", label: "Everything" },
  { value: "route", label: "Routes & stops" },
  { value: "trip", label: "Trips" },
  { value: "booking", label: "Bookings" },
  { value: "charter", label: "Charter" },
  { value: "vehicle", label: "Vehicles" },
  { value: "driver", label: "Drivers" },
  { value: "template", label: "Timetable" },
  { value: "user", label: "Staff accounts" },
];

export function AuditLog() {
  const { toast } = useToast();
  const today = todayISO();

  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [entityType, setEntityType] = React.useState("all");
  const [from, setFrom] = React.useState(addDaysISO(today, -29));
  const [to, setTo] = React.useState(today);
  const [page, setPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const logs = useQuery({
    queryKey: ["audit", debounced, action, entityType, from, to, page],
    queryFn: () =>
      api.auditLogs({
        q: debounced || undefined,
        action: action === "all" ? undefined : action,
        entity_type: entityType === "all" ? undefined : entityType,
        date_from: from,
        date_to: to,
        page,
        page_size: 50,
      }),
    refetchInterval: 60_000,
  });

  const actions = useQuery({ queryKey: ["audit-actions"], queryFn: api.auditActions });

  const rows = logs.data?.items ?? [];
  const total = logs.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 50));

  function exportCsv() {
    if (rows.length === 0) return;
    const head = ["when", "actor", "role", "action", "entity", "label", "summary", "ip"];
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows.map((r) =>
      [
        formatDateTime(r.created_at),
        r.actor_name,
        r.actor_role,
        r.action,
        r.entity_type,
        r.entity_label ?? "",
        r.summary,
        r.ip ?? "",
      ]
        .map(escape)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ecojindu-audit-${from}-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} entries from this page.`, "success");
  }

  return (
    <>
      <Alert variant="info" className="mb-5">
        <p className="text-xs">
          Every change staff and drivers make — routes, timetable, trips, bookings, charter,
          check-ins and accounts. The log is append-only: there is no edit or delete path in the
          API, so it stands up as a record.
        </p>
      </Alert>

      <Panel>
        <PanelHeader
          title={`${total} action${total === 1 ? "" : "s"}`}
          description={`${from} → ${to}`}
          action={
            <Button size="xs" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download aria-hidden />
              Export page
            </Button>
          }
        />

        <PanelBody className="grid gap-3 border-b border-line sm:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label htmlFor="audit_q" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <Input
                id="audit_q"
                placeholder="Who, what, or which route"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Area
            </label>
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Action
            </label>
            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(actions.data ?? []).map((a) => (
                  <SelectItem key={a.action} value={a.action}>
                    {a.action} ({a.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="audit_from" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                From
              </label>
              <input
                id="audit_from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-lg border-2 border-line bg-surface px-2 text-sm focus:border-moss focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="audit_to" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                To
              </label>
              <input
                id="audit_to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-lg border-2 border-line bg-surface px-2 text-sm focus:border-moss focus:outline-none"
              />
            </div>
          </div>
        </PanelBody>

        <div className="scroll-x">
          {logs.isLoading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing recorded in this range"
              description="Try widening the dates, or clearing the filters."
            />
          ) : (
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">Action</th>
                  <th scope="col">What happened</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <Row
                    key={entry.id}
                    entry={entry}
                    expanded={expanded === entry.id}
                    onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
            <p className="text-xs text-ink-soft">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="xs" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

function Row({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail = Boolean(entry.changes) || Boolean(entry.ip);

  return (
    <>
      <tr
        className={hasDetail ? "cursor-pointer" : undefined}
        onClick={hasDetail ? onToggle : undefined}
        tabIndex={hasDetail ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasDetail && e.key === "Enter") onToggle();
        }}
      >
        <td className="whitespace-nowrap text-xs text-ink-muted">
          {formatDateTime(entry.created_at)}
        </td>
        <td className="whitespace-nowrap">
          <p className="text-sm font-medium text-ink">{entry.actor_name}</p>
          <p className="text-xs capitalize text-ink-soft">{entry.actor_role.replace("_", " ")}</p>
        </td>
        <td>
          <Badge variant={toneFor(entry.action)}>{entry.action}</Badge>
        </td>
        <td className="text-sm text-ink">{entry.summary}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={4} className="bg-surface-muted">
            <div className="px-4 py-3 text-xs">
              {entry.changes && (
                <table className="mb-3">
                  <tbody>
                    {Object.entries(entry.changes).map(([field, [before, after]]) => (
                      <tr key={field}>
                        <td className="py-1 pr-4 font-semibold text-ink-soft">{field}</td>
                        <td className="py-1 pr-3 font-mono text-clay-dark line-through">
                          {String(before)}
                        </td>
                        <td className="py-1 font-mono text-moss-dark">{String(after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="flex items-center gap-1.5 text-ink-soft">
                <ShieldCheck className="size-3.5" aria-hidden />
                {entry.entity_type}
                {entry.entity_label ? ` · ${entry.entity_label}` : ""}
                {entry.ip ? ` · from ${entry.ip}` : ""}
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
