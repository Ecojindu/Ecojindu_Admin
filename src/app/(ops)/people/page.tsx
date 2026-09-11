"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdCard, Plus, Search, ShieldCheck, UserCog, Users } from "lucide-react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Alert,
  Badge,
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
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default function PeoplePage() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = React.useState<"drivers" | "staff">("drivers");

  return (
    <>
      <PageHeader
        title="Drivers & staff"
        description="Driver profiles, portal logins and admin accounts."
      />

      <div className="mb-6 inline-flex rounded-lg border border-line bg-surface p-1" role="tablist">
        {(
          [
            { id: "drivers", label: "Drivers" },
            { id: "staff", label: "Staff accounts" },
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

      {tab === "drivers" ? <DriversPanel /> : <StaffPanel isSuperAdmin={isSuperAdmin} />}
    </>
  );
}

// ── Drivers ──────────────────────────────────────────────────

function DriversPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);

  const drivers = useQuery({ queryKey: ["drivers"], queryFn: api.drivers });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });

  const assign = useMutation({
    mutationFn: ({ id, vehicleId }: { id: string; vehicleId: string | null }) =>
      api.updateDriver(id, { assigned_vehicle_id: vehicleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast("Vehicle assignment saved.", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't save.", "error"),
  });

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Add driver
        </Button>
      </div>

      <Panel>
        <PanelHeader
          title={`${(drivers.data ?? []).length} driver${(drivers.data ?? []).length === 1 ? "" : "s"}`}
          description="Every driver here has a login for the driver portal."
        />
        <div className="scroll-x">
          {drivers.isLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (drivers.data ?? []).length === 0 ? (
            <EmptyState
              icon={IdCard}
              title="No drivers yet"
              description="Add a driver to give them a portal login and start assigning trips."
              action={<Button size="sm" onClick={() => setCreating(true)}>Add the first driver</Button>}
            />
          ) : (
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th scope="col">Driver</th>
                  <th scope="col">Licence</th>
                  <th scope="col">Assigned vehicle</th>
                  <th scope="col">Portal login</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {(drivers.data ?? []).map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <p className="font-medium text-ink">{driver.full_name}</p>
                      <p className="text-xs text-ink-soft">{driver.phone}</p>
                    </td>
                    <td className="font-mono text-xs text-ink-muted">{driver.license_no}</td>
                    <td className="min-w-[220px]">
                      <Select
                        value={driver.assigned_vehicle_id ?? "none"}
                        onValueChange={(value) =>
                          assign.mutate({
                            id: driver.id,
                            vehicleId: value === "none" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger
                          className="h-10 text-sm"
                          aria-label={`Vehicle for ${driver.full_name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {(vehicles.data ?? []).map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} · {v.plate_no}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="text-xs text-ink-muted">{driver.email ?? driver.phone}</td>
                    <td>
                      <Badge
                        variant={
                          driver.status === "active" && driver.is_active
                            ? "leaf"
                            : driver.status === "off_duty"
                              ? "outline"
                              : "clay"
                        }
                      >
                        {driver.is_active ? driver.status.replace("_", " ") : "suspended"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {creating && <NewDriverDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function NewDriverDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    license_no: "",
  });
  const [vehicleId, setVehicleId] = React.useState("none");

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles });

  const create = useMutation({
    mutationFn: () =>
      api.createDriver({
        ...form,
        email: form.email || null,
        assigned_vehicle_id: vehicleId === "none" ? null : vehicleId,
        status: "active",
      }),
    onSuccess: (driver) => {
      toast(`${driver.full_name} can now sign in to the driver portal.`, "success");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't create that driver.", "error"),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Dialog
      title="Add a driver"
      description="Creates their profile and their driver-portal login."
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Full name" htmlFor="d_name">
          <Input value={form.full_name} onChange={set("full_name")} placeholder="Emeka Nwosu" />
        </Field>
        <Field label="Phone number" htmlFor="d_phone" hint="They can sign in with this or their email.">
          <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="0806 234 5678" />
        </Field>
        <Field label="Email" htmlFor="d_email" optional>
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Licence number" htmlFor="d_licence">
          <Input
            value={form.license_no}
            onChange={set("license_no")}
            placeholder="ABI-DRV-0000"
            className="font-mono"
          />
        </Field>
        <Field label="Temporary password" htmlFor="d_password" hint="At least 8 characters.">
          <Input type="text" value={form.password} onChange={set("password")} />
        </Field>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Assigned vehicle</label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger aria-label="Assigned vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Assign later</SelectItem>
              {(vehicles.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} · {v.plate_no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert variant="info" className="mt-4">
        <p className="text-xs">
          Share the password with the driver directly and ask them to change it after their first
          sign-in.
        </p>
      </Alert>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          block
          disabled={
            form.full_name.trim().length < 2 ||
            form.phone.trim().length < 6 ||
            form.license_no.trim().length < 3 ||
            form.password.length < 8
          }
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          Create driver
        </Button>
      </div>
    </Dialog>
  );
}

// ── Staff ────────────────────────────────────────────────────

function StaffPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [creating, setCreating] = React.useState(false);

  const users = useQuery({
    queryKey: ["users", query, role],
    queryFn: () =>
      api.users({ q: query || undefined, role: role === "all" ? undefined : role, page_size: 100 }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.setUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("Account updated.", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't update.", "error"),
  });

  return (
    <>
      {isSuperAdmin && (
        <div className="mb-5 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Add staff account
          </Button>
        </div>
      )}

      <Panel>
        <PanelBody className="flex flex-wrap items-end gap-3 border-b border-line">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="u_q" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <Input
                id="u_q"
                placeholder="Name, phone or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-10 text-sm"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Role
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11 text-sm" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="passenger">Passenger</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PanelBody>

        <div className="scroll-x">
          {users.isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (users.data?.items ?? []).length === 0 ? (
            <EmptyState icon={Users} title="No accounts match" description="Try a different search." />
          ) : (
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Role</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Status</th>
                  {isSuperAdmin && <th scope="col" className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(users.data?.items ?? []).map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium text-ink">{user.full_name}</td>
                    <td className="text-xs text-ink-muted">
                      {user.email ?? "—"}
                      <br />
                      {user.phone}
                    </td>
                    <td>
                      <Badge
                        variant={
                          user.role === "super_admin"
                            ? "forest"
                            : user.role === "operations"
                              ? "teal"
                              : user.role === "driver"
                                ? "leaf"
                                : "neutral"
                        }
                      >
                        {user.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="text-xs text-ink-soft">{formatDate(user.created_at)}</td>
                    <td>
                      <Badge variant={user.is_active ? "leaf" : "clay"}>
                        {user.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                    {isSuperAdmin && (
                      <td className="text-right">
                        {user.id !== me?.id && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              setStatus.mutate({ id: user.id, isActive: !user.is_active })
                            }
                          >
                            {user.is_active ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {!isSuperAdmin && (
        <Alert variant="info" className="mt-4">
          <p className="text-xs">
            Only super admins can create or deactivate staff accounts.
          </p>
        </Alert>
      )}

      {creating && <NewStaffDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function NewStaffDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = React.useState({ full_name: "", phone: "", email: "", password: "" });
  const [role, setRole] = React.useState("operations");

  const create = useMutation({
    mutationFn: () =>
      api.createStaff(
        {
          ...form,
          email: form.email || null,
          // The backend reuses the driver payload shape; licence is ignored for staff.
          license_no: `STAFF-${Date.now().toString(36).toUpperCase()}`,
        },
        role,
      ),
    onSuccess: (user) => {
      toast(`${user.full_name} added as ${role.replace("_", " ")}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Couldn't create that account.", "error"),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Dialog title="Add a staff account" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Full name" htmlFor="s_name">
          <Input value={form.full_name} onChange={set("full_name")} placeholder="Ngozi Eze" />
        </Field>
        <Field label="Phone number" htmlFor="s_phone">
          <Input type="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Email" htmlFor="s_email" optional>
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Temporary password" htmlFor="s_password" hint="At least 8 characters.">
          <Input type="text" value={form.password} onChange={set("password")} />
        </Field>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-forest">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="super_admin">Super admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert variant="warning" className="mt-4">
        <p className="flex items-start gap-1.5 text-xs">
          <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
          Super admins can create and deactivate other staff accounts. Grant it sparingly.
        </p>
      </Alert>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          block
          disabled={
            form.full_name.trim().length < 2 ||
            form.phone.trim().length < 6 ||
            form.password.length < 8
          }
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          <UserCog aria-hidden />
          Create account
        </Button>
      </div>
    </Dialog>
  );
}
