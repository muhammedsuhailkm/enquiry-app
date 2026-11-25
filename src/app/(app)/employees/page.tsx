"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, KeyRound, MoreHorizontal, Pencil, Plus, RotateCcw, Search, UserCheck, UserX } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, qs, type Json } from "../../_ui/api";
import { DateRangeFilter, PageHeader, type Range } from "../../_ui/PageHeader";
import { initials, useMe } from "../../_ui/useMe";

const perfConfig = {
  ACCEPTED: { label: "Won", color: "var(--chart-3)" },
  REJECTED: { label: "Lost", color: "var(--chart-4)" },
} satisfies ChartConfig;

/** Add (no `user`) or edit (`user`) an employee account. */
function EmployeeDialog({ open, onOpenChange, user, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; user?: Json; onSaved: () => void }) {
  // Remounted (via `key`) each time it opens, so initial state comes from `user`.
  const [role, setRole] = useState<string>(user?.role ?? "EMPLOYEE");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const body: Json = { name: s("name"), email: s("email"), designation: s("designation"), phone: s("phone") || null, role };
    if (!user && s("password")) body.password = s("password");
    setBusy(true);
    try {
      if (user) await api(`/api/employees/${user.id}`, "PATCH", body);
      else await api("/api/employees", "POST", body);
      toast.success(user ? "Employee updated" : `${body.name} added`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{user ? `Edit ${user.name}` : "Add employee"}</DialogTitle>
            <DialogDescription>
              {user ? "Update account details and role." : "They can sign in right away with the default password unless you set one."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="emp-name">Full name <span className="text-destructive">*</span></Label>
              <Input id="emp-name" name="name" required maxLength={100} defaultValue={user?.name} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="emp-email">Email <span className="text-destructive">*</span></Label>
              <Input id="emp-email" name="email" type="email" required maxLength={255} defaultValue={user?.email} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-des">Designation <span className="text-destructive">*</span></Label>
              <Input id="emp-des" name="designation" required maxLength={100} defaultValue={user?.designation} placeholder="Sales Executive" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input id="emp-phone" name="phone" type="tel" maxLength={30} defaultValue={user?.phone ?? ""} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="emp-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="emp-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Admins see all enquiries and manage employees and lookups.</p>
            </div>
            {!user && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="emp-pw">Password</Label>
                <Input id="emp-pw" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Leave blank to use the default password" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : user ? "Save changes" : "Create employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordDialog({ user, onOpenChange }: { user: Json; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    setBusy(true);
    try {
      await api(`/api/employees/${user.id}/password`, "POST", { password });
      toast.success(`Password changed for ${user.name}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={!!user} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Set password</DialogTitle>
            <DialogDescription>Choose a new password for {user?.name}. Share it with them securely.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input id="new-pw" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Set password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeesPage() {
  const me = useMe();
  const [range, setRange] = useState<Range>({});
  const [users, setUsers] = useState<Json[] | null>(null);
  const [perf, setPerf] = useState<Json[]>([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; user?: Json }>({ open: false });
  const [pwUser, setPwUser] = useState<Json>(null);
  const [resetUser, setResetUser] = useState<Json>(null);

  const load = useCallback(() => {
    api("/api/employees").then(setUsers).catch((e) => toast.error(errMsg(e)));
    api(`/api/dashboard/employees?${qs({ ...range })}`)
      .then(setPerf)
      .catch((e) => toast.error(errMsg(e)));
  }, [range]);
  useEffect(load, [load]);

  const byId = useMemo(() => new Map(perf.map((p) => [p.id, p])), [perf]);
  const rows = (users ?? []).filter((u) => {
    const t = search.trim().toLowerCase();
    return !t || u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t) || u.designation.toLowerCase().includes(t);
  });
  const chartData = perf.filter((p) => p.ACCEPTED + p.REJECTED > 0);
  const activeCount = (users ?? []).filter((u) => u.isActive).length;

  async function toggleActive(u: Json) {
    try {
      await api(`/api/employees/${u.id}`, "PATCH", { isActive: !u.isActive });
      toast.success(`${u.name} ${u.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function resetPassword() {
    const u = resetUser;
    setResetUser(null);
    try {
      await api(`/api/employees/${u.id}/password`, "POST", {});
      toast.success(`Password for ${u.name} reset to the default`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const actions = (u: Json, className?: string) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={className} aria-label={`Actions for ${u.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/employees/${u.id}`}>
            <BarChart3 />
            View performance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setDialog({ open: true, user: u })}>
          <Pencil />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setPwUser(u)}>
          <KeyRound />
          Set password
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setResetUser(u)}>
          <RotateCcw />
          Reset to default password
        </DropdownMenuItem>
        {u.id !== me?.id && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant={u.isActive ? "destructive" : "default"} onSelect={() => toggleActive(u)}>
              {u.isActive ? <UserX /> : <UserCheck />}
              {u.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader title="Employees" description="Manage accounts and compare salesperson performance.">
        <DateRangeFilter value={range} onChange={setRange} />
        <Button onClick={() => setDialog({ open: true })}>
          <Plus />
          Add employee
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Won vs lost by salesperson</CardTitle>
          <CardDescription>Decided quotes in the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No decided quotes in this period</div>
          ) : (
            <ChartContainer config={perfConfig} className="aspect-auto h-[240px] w-full">
              <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                <Bar dataKey="ACCEPTED" fill="var(--color-ACCEPTED)" radius={4} />
                <Bar dataKey="REJECTED" fill="var(--color-REJECTED)" radius={4} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4 max-md:border-0 max-md:p-0">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Search employees…" aria-label="Search employees" className="bg-background pl-9 max-md:rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {users && (
            <span className="text-sm text-muted-foreground">
              {users.length} users · {activeCount} active
            </span>
          )}
        </div>
        <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Employee</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right max-xl:hidden">Open</TableHead>
              <TableHead className="text-right">Won</TableHead>
              <TableHead className="text-right">Lost</TableHead>
              <TableHead className="text-right max-xl:hidden">Conversion</TableHead>
              <TableHead className="text-right">Win rate</TableHead>
              <TableHead className="text-right max-2xl:hidden">Avg rev.</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10} className="px-4">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {users && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  No employees match “{search}”.
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => {
              const p = byId.get(u.id);
              return (
                <TableRow key={u.id}>
                  <TableCell className="py-3 pl-4">
                    <Link href={`/employees/${u.id}`} className="flex min-w-0 items-center gap-3" title={u.email}>
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-xs font-semibold">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0">
                        <span className="truncate font-medium hover:underline">{u.name}</span>
                        <span className="max-w-56 truncate text-xs text-muted-foreground">
                          {u.designation} · {u.email}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{u.role === "ADMIN" ? "Admin" : "Employee"}</Badge>
                      {u.isActive ? (
                        <Badge variant="outline" className="border-success-border bg-success-bg text-success-fg">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p?.total ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums max-xl:hidden">{p?.open ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{p?.ACCEPTED ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{p?.REJECTED ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums max-xl:hidden">{p && p.total ? `${p.conversionRate}%` : "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{p && p.total ? `${p.winRate}%` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums max-2xl:hidden">{p && p.total ? p.avgRevisions : "—"}</TableCell>
                  <TableCell className="pr-4">{actions(u)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>

        {/* ---------- mobile: card list ---------- */}
        <div className="mt-3 md:hidden">
          {!users && (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          )}
          {users && rows.length === 0 && (
            <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              No employees match “{search}”.
            </p>
          )}
          <ul className="grid gap-3">
            {rows.map((u) => {
              const p = byId.get(u.id);
              return (
                <li
                  key={u.id}
                  className="relative grid gap-4 rounded-2xl border border-primary/5 bg-card p-4 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11">
                      <AvatarFallback className="text-sm font-semibold">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1">
                      <Link href={`/employees/${u.id}`} className="truncate font-semibold after:absolute after:inset-0 after:rounded-2xl">
                        {u.name}
                      </Link>
                      <span className="truncate text-sm text-muted-foreground">{u.designation}</span>
                    </div>
                    <div className="relative z-10 -mr-2">{actions(u, "size-10")}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{u.role === "ADMIN" ? "Admin" : "Employee"}</Badge>
                    {u.isActive ? (
                      <Badge variant="outline" className="border-success-border bg-success-bg text-success-fg">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center">
                    {[
                      ["Total", p?.total ?? 0],
                      ["Won", p?.ACCEPTED ?? 0],
                      ["Lost", p?.REJECTED ?? 0],
                      ["Win rate", p && p.total ? `${p.winRate}%` : "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="grid gap-0.5">
                        <dt className="text-[11px] text-muted-foreground">{label}</dt>
                        <dd className="order-first text-base font-semibold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      <EmployeeDialog key={dialog.open ? `open-${dialog.user?.id ?? "new"}` : "closed"} open={dialog.open} user={dialog.user} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} onSaved={load} />
      <SetPasswordDialog user={pwUser} onOpenChange={(o) => !o && setPwUser(null)} />

      <AlertDialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password for {resetUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Their password goes back to the default. Ask them to change it from their Profile page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetPassword}>Reset password</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
