"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Eye, Inbox, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errMsg, qs, type Json } from "../../_ui/api";
import { DateRangeFilter, formatDate, PageHeader, type Range } from "../../_ui/PageHeader";
import { customerLabel } from "../../_ui/customer";
import { EnquiryNo, QuoteNoTag, WorkTypeTags } from "../../_ui/EnquiryNo";
import { ExportEnquiriesDialog } from "../../_ui/ExportEnquiriesDialog";
import { StatusControl } from "../../_ui/StatusControl";
import { initials, useMe } from "../../_ui/useMe";

const TABS = [
  { value: "all", label: "All", key: "total" },
  { value: "RECEIVED", label: "Received", key: "RECEIVED" },
  { value: "QUOTED", label: "Quoted", key: "QUOTED" },
  { value: "ACCEPTED", label: "Accepted", key: "ACCEPTED" },
  { value: "REJECTED", label: "Rejected", key: "REJECTED" },
  { value: "CANCELLED", label: "Cancelled", key: "CANCELLED" },
];

/** View / Edit / Delete menu shared by table rows and mobile cards. */
function RowActions({ r, onDelete, className }: { r: Json; onDelete: (r: Json) => void; className?: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={className} aria-label={`Actions for ${r.enquiryNo}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/enquiries/${r.id}`}>
            <Eye />
            View
          </Link>
        </DropdownMenuItem>
        {r.canEdit && (
          <DropdownMenuItem asChild>
            <Link href={`/enquiries/${r.id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </DropdownMenuItem>
        )}
        {r.canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(r)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-12 text-center">
      <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </span>
      <span className="font-medium">No enquiries found</span>
      <span className="text-sm text-muted-foreground">
        {filtered ? "Try a different search or clear the filters." : "Create your first enquiry to get started."}
      </span>
      {!filtered && (
        <Button asChild size="sm" className="mt-2">
          <Link href="/enquiries/new">
            <Plus />
            New enquiry
          </Link>
        </Button>
      )}
    </div>
  );
}

/**
 * Mobile list item. Only the underlined enquiry number opens the enquiry, so taps on the
 * status badge or the ⋯ menu can't open it by accident.
 */
function EnquiryCard({ r, onDone, onDelete }: { r: Json; onDone: () => void; onDelete: (r: Json) => void }) {
  return (
    <li className="grid gap-3 rounded-2xl border border-primary/5 bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <EnquiryNo id={r.id} no={r.enquiryNo} className="py-1" />
        <StatusControl enquiry={r} onDone={onDone} variant="badge" />
      </div>
      <div className="grid gap-0.5">
        <span className="truncate text-base font-medium">{customerLabel(r.customer).title}</span>
        {customerLabel(r.customer).contact && (
          <span className="truncate text-sm text-muted-foreground">{customerLabel(r.customer).contact}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <QuoteNoTag quoteNo={r.quoteNo} />
        <WorkTypeTags items={r.workTypes} max={3} />
        <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{r.category.name}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          {r.salesperson && (
            <>
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px] font-semibold">{initials(r.salesperson.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{r.salesperson.name}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="shrink-0">{formatDate(r.enquiryDate)}</span>
        </span>
        <RowActions r={r} onDelete={onDelete} className="-my-2 -mr-2 size-9" />
      </div>
    </li>
  );
}

export default function EnquiriesPage() {
  const me = useMe();
  const admin = me?.role === "ADMIN";

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [salesperson, setSalesperson] = useState("all");
  const [range, setRange] = useState<Range>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<Json>(null);
  const [counts, setCounts] = useState<Json>(null);
  const [people, setPeople] = useState<Json[]>([]);
  const [toDelete, setToDelete] = useState<Json>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const sp = admin && salesperson !== "all" ? salesperson : undefined;
  const load = useCallback(() => {
    api(
      `/api/enquiries?${qs({ page, pageSize, q, status: status === "all" ? undefined : status, salespersonId: sp, ...range })}`,
    )
      .then((d) => {
        setData(d);
        setCounts(d.counts); // tab counts come with the list, so they always match what it shows
      })
      .catch((e) => toast.error(errMsg(e)));
  }, [page, pageSize, q, status, sp, range]);
  useEffect(load, [load]);

  useEffect(() => {
    if (admin) api("/api/employees").then(setPeople).catch(() => {});
  }, [admin]);

  async function remove() {
    const r = toDelete;
    setToDelete(null);
    try {
      await api(`/api/enquiries/${r.id}`, "DELETE");
      toast.success(`${r.enquiryNo} deleted`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const reset = () => {
    setSearch("");
    setSalesperson("all");
    setRange({});
    setStatus("all");
    setPage(1);
  };

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const filtered = !!(q || sp || range.from || range.to || status !== "all");
  const cols = 6;

  const pager = (
    <div className="flex gap-1">
      <Button variant="outline" size="icon-sm" className="max-md:size-10" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="icon-sm" className="max-md:size-10" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}>
        <ChevronRight />
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader title="Enquiries" description="Track every enquiry from received to won or lost.">
        {admin && (
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download />
            Export
          </Button>
        )}
        <Button asChild className="max-md:hidden">
          <Link href="/enquiries/new">
            <Plus />
            New enquiry
          </Link>
        </Button>
      </PageHeader>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        className="min-w-0"
      >
        {/* Mobile: one swipeable row of chips. Desktop: wraps as before. */}
        <TabsList className="no-scrollbar h-auto w-full justify-start overflow-x-auto max-md:rounded-xl md:w-fit md:flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-none gap-1.5 max-md:min-h-9 max-md:px-3">
              {t.label}
              {counts && <span className="text-xs text-muted-foreground tabular-nums">{counts[t.key]}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="gap-0 py-0 max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <div className="flex flex-wrap items-center gap-2 border-b p-4 max-md:border-0 max-md:p-0">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search enquiry no., quote no. or customer…"
              aria-label="Search enquiries"
              className="bg-background pl-9 max-md:rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-wrap gap-2 md:contents max-md:*:min-w-0 max-md:*:flex-1">
            {admin && (
              <Select
                value={salesperson}
                onValueChange={(v) => {
                  setSalesperson(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="bg-background md:w-44" aria-label="Salesperson">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All salespeople</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <DateRangeFilter
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
            />
            {filtered && (
              <Button variant="ghost" className="max-md:flex-none!" onClick={reset}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ---------- mobile: card list ---------- */}
        <div className="mt-4 md:hidden">
          {!data && (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          )}
          {data?.items.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-card">
              <EmptyState filtered={filtered} />
            </div>
          )}
          {data && data.items.length > 0 && (
            <ul className="grid gap-3">
              {data.items.map((r: Json) => (
                <EnquiryCard key={r.id} r={r} onDone={load} onDelete={setToDelete} />
              ))}
            </ul>
          )}
          {total > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground tabular-nums">
                {first}–{last} of {total}
              </span>
              {pager}
            </div>
          )}
        </div>

        {/* ---------- desktop: compact table (fits ~1280px with the sidebar open) ---------- */}
        <div className="max-md:hidden">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-52" />
              <col />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-40" />
              <col className="w-14" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Enquiry</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Work type · Category</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={cols} className="px-4">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={cols} className="whitespace-normal">
                    <EmptyState filtered={filtered} />
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((r: Json) => (
                <TableRow key={r.id}>
                  <TableCell className="overflow-hidden py-3 pr-4 pl-4">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-start gap-1">
                      <EnquiryNo id={r.id} no={r.enquiryNo} />
                      <span className="text-xs text-muted-foreground">{formatDate(r.enquiryDate)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-0">
                      <span className="truncate font-medium" title={customerLabel(r.customer).title}>
                        {customerLabel(r.customer).title}
                      </span>
                      {customerLabel(r.customer).contact && (
                        <span className="truncate text-xs text-muted-foreground" title={customerLabel(r.customer).contact ?? ""}>
                          {customerLabel(r.customer).contact}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-start gap-1">
                      <WorkTypeTags items={r.workTypes} />
                      <span className="max-w-full truncate text-xs text-muted-foreground">{r.category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="block truncate">{r.salesperson?.name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-start gap-1">
                      <StatusControl enquiry={r} onDone={load} variant="badge" />
                      <QuoteNoTag quoteNo={r.quoteNo} />
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <RowActions r={r} onDelete={setToDelete} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {total === 0 ? "No results" : `Showing ${first}–${last} of ${total} enquiries`}
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="font-medium">
                Page {page} of {pages}
              </span>
              {pager}
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.enquiryNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              The enquiry is removed from lists and analytics. This can&apos;t be undone from the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {admin && (
        <ExportEnquiriesDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          people={people}
          initial={{ salesperson, status, range }}
        />
      )}
    </>
  );
}
