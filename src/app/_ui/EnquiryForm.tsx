"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, errMsg, type Json } from "./api";
import { customerLabel } from "./customer";
import { useMe } from "./useMe";
import { mergeCatalogue, WorkScopePicker, type WorkScope } from "./WorkScopePicker";

function Req() {
  return <span className="text-destructive">*</span>;
}

function Field({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <Label htmlFor={id}>
        {label} {required && <Req />}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LookupSelect({ id, items, value, onChange, placeholder }: { id: string; items: Json[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Searchable customer picker (debounced /api/customers?q=). */
function CustomerPicker({ value, onChange }: { value: Json; onChange: (c: Json) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Json[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api(`/api/customers?q=${encodeURIComponent(search.trim())}&take=20`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id="customer" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{customerLabel(value).title}</span>
              {customerLabel(value).contact && <span className="truncate text-muted-foreground">{customerLabel(value).contact}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Search by company, contact or phone…</span>
          )}
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            className="h-10 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Type to search…"
            aria-label="Search customers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1" role="listbox">
          {results === null && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
          {results?.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No customers found. Use “New customer” to add one.</div>
          )}
          {results?.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={value?.id === c.id}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <Check className={cn("size-4", value?.id === c.id ? "opacity-100" : "opacity-0")} />
              <span className="grid min-w-0">
                <span className="truncate font-medium">{customerLabel(c).title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {[customerLabel(c).contact, c.phone, c.email].filter(Boolean).join(" · ") || "No details"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Shared create/edit form. `initial` = enquiry from GET /api/enquiries/:id when editing. */
export function EnquiryForm({ initial }: { initial?: Json }) {
  const router = useRouter();
  const me = useMe();
  const admin = me?.role === "ADMIN";
  const [lookups, setLookups] = useState<Json>(null);
  const [users, setUsers] = useState<Json[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customer, setCustomer] = useState<Json>(initial?.customer ?? null);
  const [scope, setScope] = useState<WorkScope>({
    workTypeIds: initial?.workTypeIds ?? [],
    subWorkTypeIds: initial?.subWorkTypeIds ?? [],
  });
  const [scopeError, setScopeError] = useState(false);
  const [categoryId, setCategoryId] = useState(initial ? String(initial.categoryId) : "");
  const [leadSourceId, setLeadSourceId] = useState(initial ? String(initial.leadSourceId) : "");
  const [salespersonId, setSalespersonId] = useState(initial ? String(initial.salespersonId) : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/lookups").then(setLookups).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(() => {
    if (admin) api("/api/employees").then((u: Json[]) => setUsers(u.filter((x) => x.isActive))).catch(() => {});
  }, [admin]);

  // When editing, keep the current (possibly now inactive) lookup visible in each dropdown.
  const withCurrent = (list: Json[], current?: Json) =>
    current && !list.some((x) => x.id === current.id) ? [current, ...list] : list;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    if (mode === "existing" && !customer) return toast.error("Select a customer");
    if (scope.workTypeIds.length === 0) {
      setScopeError(true);
      document.getElementById("work-scope")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast.error("Select at least one work type");
    }
    if (!categoryId || !leadSourceId) return toast.error("Category and lead source are required");

    const payload: Json = {
      workTypeIds: scope.workTypeIds,
      subWorkTypeIds: scope.subWorkTypeIds,
      categoryId: Number(categoryId),
      leadSourceId: Number(leadSourceId),
      enquiryDate: s("enquiryDate") || undefined,
      scopeOfWork: s("scopeOfWork"),
      additionalDetails: s("additionalDetails") || null,
      salespersonId: admin && salespersonId ? Number(salespersonId) : undefined,
    };
    if (mode === "new") {
      payload.newCustomer = {
        name: s("c_name"),
        companyName: s("c_companyName"),
        phone: s("c_phone"),
        email: s("c_email"),
        address: s("c_address"),
      };
    } else payload.customerId = customer.id;

    setBusy(true);
    try {
      const res = initial
        ? await api(`/api/enquiries/${initial.id}`, "PATCH", payload)
        : await api("/api/enquiries", "POST", payload);
      toast.success(initial ? "Changes saved" : `${res.enquiryNo} created`);
      router.push(`/enquiries/${res.id}`);
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(false);
    }
  }

  if (!lookups || !me) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <form onSubmit={submit} className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle>Customer</CardTitle>
            <CardDescription>
              {initial ? "Switch to another customer if needed." : "Pick an existing customer or add a new one."}
            </CardDescription>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="max-sm:w-full">
            <TabsList className="max-sm:grid max-sm:w-full max-sm:grid-cols-2">
              <TabsTrigger value="existing">Existing customer</TabsTrigger>
              <TabsTrigger value="new">New customer</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {mode === "existing" ? (
            <Field id="customer" label="Customer" required>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="c_companyName" label="Company name" required>
                <Input id="c_companyName" name="c_companyName" required maxLength={150} placeholder="e.g. Al Noor Contracting" autoFocus />
              </Field>
              <Field id="c_name" label="Contact name" required>
                <Input id="c_name" name="c_name" required maxLength={150} placeholder="Person you're dealing with" />
              </Field>
              <Field id="c_phone" label="Phone">
                <Input id="c_phone" name="c_phone" type="tel" maxLength={30} />
              </Field>
              <Field id="c_email" label="Email">
                <Input id="c_email" name="c_email" type="email" maxLength={255} placeholder="name@company.com" />
              </Field>
              <div className="sm:col-span-2">
                <Field id="c_address" label="Address">
                  <Input id="c_address" name="c_address" maxLength={500} />
                </Field>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="work-scope">
        <CardHeader>
          <CardTitle>
            Work scope <Req />
          </CardTitle>
          <CardDescription>Select one or more work types, then the sub works the client needs. You can change this later on the enquiry page.</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkScopePicker
            groups={mergeCatalogue(lookups.workTypes, initial?.workScope)}
            value={scope}
            invalid={scopeError && scope.workTypeIds.length === 0}
            onChange={(v) => {
              setScope(v);
              if (v.workTypeIds.length) setScopeError(false);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enquiry details</CardTitle>
          <CardDescription>Classification and scope of the request.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="createdBy" label="Created by">
              <Input
                id="createdBy"
                disabled
                value={initial ? `${initial.createdByName} · ${initial.createdByDesignation}` : `${me.name} · ${me.designation}`}
              />
            </Field>
            {admin ? (
              <Field id="salesperson" label="Salesperson" hint="Defaults to you if left unchanged.">
                <Select value={salespersonId || String(me.id)} onValueChange={setSalespersonId}>
                  <SelectTrigger id="salesperson" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {withCurrent(users, initial?.salesperson && { ...initial.salesperson, id: initial.salespersonId }).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.designation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field id="salesperson" label="Salesperson">
                <Input id="salesperson" disabled value={initial ? initial.salesperson.name : me.name} />
              </Field>
            )}
            <Field id="category" label="Category" required>
              <LookupSelect id="category" items={withCurrent(lookups.categories, initial?.category)} value={categoryId} onChange={setCategoryId} placeholder="Select category" />
            </Field>
            <Field id="leadSource" label="Lead source" required>
              <LookupSelect id="leadSource" items={withCurrent(lookups.leadSources, initial?.leadSource)} value={leadSourceId} onChange={setLeadSourceId} placeholder="Select lead source" />
            </Field>
            <Field id="enquiryDate" label="Enquiry date" required>
              <Input id="enquiryDate" name="enquiryDate" type="date" required defaultValue={initial?.enquiryDate ?? today} />
            </Field>
          </div>
          <Field id="scopeOfWork" label="Scope of work" required>
            <Textarea id="scopeOfWork" name="scopeOfWork" rows={4} required maxLength={10000} defaultValue={initial?.scopeOfWork} placeholder="Describe what the customer needs…" />
          </Field>
          <Field id="additionalDetails" label="Additional details">
            <Textarea id="additionalDetails" name="additionalDetails" rows={3} maxLength={10000} defaultValue={initial?.additionalDetails ?? ""} placeholder="Site access, deadlines, contacts (optional)" />
          </Field>
        </CardContent>
      </Card>

      {/* Mobile: sticky action bar in the thumb zone (the tab bar is hidden on form routes). */}
      <div className="flex flex-wrap justify-end gap-2 max-md:sticky max-md:bottom-0 max-md:z-20 max-md:-mx-4 max-md:-mb-4 max-md:grid max-md:grid-cols-[1fr_2fr] max-md:border-t max-md:bg-background/90 max-md:px-4 max-md:pt-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:backdrop-blur-md">
        <Button type="button" variant="outline" asChild>
          <Link href={initial ? `/enquiries/${initial.id}` : "/enquiries"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Create enquiry"}
        </Button>
      </div>
    </form>
  );
}
