"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Mail, MessageSquare, Radio } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { AuditLog } from "@/components/audit-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Alert,
  Badge,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { ApiError, api } from "@/lib/api";
import { config } from "@/lib/config";
import { formatDateTime } from "@/lib/utils";
import type { NotificationTemplate } from "@/lib/admin-types";

export default function SettingsPage() {
  const [tab, setTab] = React.useState<"templates" | "log" | "audit">("templates");

  return (
    <>
      <PageHeader
        title="Settings"
        description="Message templates, delivery, and the audit trail."
      />

      <div className="mb-6 inline-flex rounded-lg border border-line bg-surface p-1" role="tablist">
        {(
          [
            { id: "templates", label: "Notification templates" },
            { id: "log", label: "Delivery log" },
            { id: "audit", label: "Audit log" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`tap-target rounded-md px-5 text-sm font-semibold transition-colors ${
              tab === item.id ? "bg-forest text-white" : "text-ink-muted hover:text-forest"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "templates" && <TemplatesPanel />}
      {tab === "log" && <DeliveryLogPanel />}
      {tab === "audit" && <AuditLog />}
    </>
  );
}

function TemplatesPanel() {
  const templates = useQuery({
    queryKey: ["notification-templates"],
    queryFn: api.notificationTemplates,
  });

  return (
    <>
      <Alert variant="info" className="mb-5">
        <p className="text-xs">
          These are the SMS bodies and email subject lines the backend sends. Placeholders in{" "}
          <code className="rounded bg-white/60 px-1 font-mono">{"{braces}"}</code> are filled in per
          booking. The full branded HTML email bodies live in the backend&apos;s template files.
        </p>
      </Alert>

      {templates.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (templates.data ?? []).length === 0 ? (
        <Panel>
          <EmptyState
            icon={Bell}
            title="No templates seeded"
            description="Run the backend seed script to create the default message templates."
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          {(templates.data ?? []).map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </>
  );
}

function TemplateCard({ template }: { template: NotificationTemplate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [subject, setSubject] = React.useState(template.subject ?? "");
  const [body, setBody] = React.useState(template.body);

  const dirty = subject !== (template.subject ?? "") || body !== template.body;

  const save = useMutation({
    mutationFn: () =>
      api.updateNotificationTemplate(template.id, { subject: subject || null, body }),
    onSuccess: () => {
      toast("Template saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't save.", "error"),
  });

  const Icon = template.channel === "email" ? Mail : MessageSquare;

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <Icon className="size-4 text-moss" aria-hidden />
            <span className="font-mono text-sm">{template.key}</span>
          </span>
        }
        description={template.description ?? undefined}
        action={<Badge variant={template.channel === "email" ? "teal" : "leaf"}>{template.channel}</Badge>}
      />
      <PanelBody className="space-y-3">
        {template.channel === "email" && (
          <div>
            <label
              htmlFor={`subject-${template.id}`}
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft"
            >
              Subject line
            </label>
            <Input
              id={`subject-${template.id}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 text-sm"
            />
          </div>
        )}

        <div>
          <label
            htmlFor={`body-${template.id}`}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft"
          >
            Message body
          </label>
          <textarea
            id={`body-${template.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-lg border-2 border-line bg-surface p-3 font-mono text-xs leading-relaxed text-ink focus:border-moss focus:outline-none"
          />
          {template.channel === "sms" && (
            <p className="mt-1.5 text-xs text-ink-soft">
              {body.length} characters · {Math.ceil(body.length / 160)} SMS segment
              {Math.ceil(body.length / 160) === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            <Check aria-hidden />
            Save
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

function DeliveryLogPanel() {
  const log = useQuery({
    queryKey: ["notification-log"],
    queryFn: () => api.notificationLog(150),
    refetchInterval: 30_000,
  });

  const rows = log.data ?? [];
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <>
      {failed > 0 && (
        <Alert variant="warning" title={`${failed} delivery failure${failed === 1 ? "" : "s"}`} className="mb-5">
          <p>
            Check the provider credentials in the backend&apos;s environment, or contact{" "}
            {config.supportEmail}.
          </p>
        </Alert>
      )}

      <Panel>
        <PanelHeader
          title="Recent notifications"
          description="Every email, SMS and WhatsApp message the backend has attempted."
          action={
            <Badge variant="outline">
              <Radio className="size-3" aria-hidden />
              Live
            </Badge>
          }
        />
        <div className="scroll-x">
          {log.isLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nothing sent yet"
              description="Confirmations, reminders and broadcasts will be listed here."
            />
          ) : (
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Type</th>
                  <th scope="col">Recipient</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs text-ink-muted">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td>
                      <Badge variant={entry.channel === "email" ? "teal" : "leaf"}>
                        {entry.channel}
                      </Badge>
                    </td>
                    <td className="text-xs text-ink-muted">{entry.type.replace(/_/g, " ")}</td>
                    <td className="max-w-[220px] truncate text-xs text-ink">{entry.recipient}</td>
                    <td className="text-xs text-ink-soft">{entry.provider ?? "—"}</td>
                    <td>
                      <Badge
                        variant={
                          entry.status === "sent"
                            ? "leaf"
                            : entry.status === "failed"
                              ? "clay"
                              : "neutral"
                        }
                        title={entry.error ?? undefined}
                      >
                        {entry.status}
                      </Badge>
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
