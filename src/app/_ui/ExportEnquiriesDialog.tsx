"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, qs, type Json } from "./api";
import { DateRangeFilter, type Range } from "./PageHeader";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "RECEIVED", label: "Received" },
  { value: "QUOTED", label: "Quoted" },
  { value: "ACCEPTED", label: "Accepted (won)" },
  { value: "REJECTED", label: "Rejected (lost)" },
  { value: "CANCELLED", label: "Cancelled" },
];

export type ExportFilters = { salesperson: string; status: string; range: Range };

/**
 * Admin-only: pick salesperson / date range / status, see how many enquiries match,
 * then download the PDF report. Starts from the list's current filters.
 */
export function ExportEnquiriesDialog({
  open,
  onOpenChange,
  people,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Json[];
  initial: ExportFilters;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted only while open, so every opening starts from the list's current filters. */}
        {open && <ExportForm people={people} initial={initial} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ExportForm({ people, initial, onDone }: { people: Json[]; initial: ExportFilters; onDone: () => void }) {
  const [salesperson, setSalesperson] = useState(initial.salesperson);
  const [status, setStatus] = useState(initial.status);
  const [range, setRange] = useState<Range>(initial.range);
  const [result, setResult] = useState<{ key: string; count: number | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const key = qs({
    salespersonId: salesperson === "all" ? undefined : salesperson,
    status: status === "all" ? undefined : status,
    ...range,
  });
  // Only trust a count fetched for the filters currently shown.
  const count = result?.key === key ? result.count : null;

  // Live "N enquiries" preview (one cheap count query via the list endpoint).
  useEffect(() => {
    let stale = false;
    api(`/api/enquiries?${key}&pageSize=1`)
      .then((d) => !stale && setResult({ key, count: d.total }))
      .catch(() => !stale && setResult({ key, count: null }));
    return () => {
      stale = true;
    };
  }, [key]);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/enquiries/export?${key}`, { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "enquiry-report.pdf";
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(count === null ? "Export downloaded" : `Exported ${count} ${count === 1 ? "enquiry" : "enquiries"}`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export enquiries</DialogTitle>
        <DialogDescription>Download the Enquiry Status &amp; Performance Report (PDF) for the matching enquiries.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="export-salesperson">Salesperson</Label>
          <Select value={salesperson} onValueChange={setSalesperson}>
            <SelectTrigger id="export-salesperson" className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All salespeople</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                  {p.isActive === false ? " (inactive)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Enquiry date</Label>
          <div className="*:w-full">
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="export-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="export-status" className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {count === null ? "Counting…" : count === 1 ? "1 enquiry matches" : `${count} enquiries match`}
        </p>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={download} disabled={busy || count === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          Download PDF
        </Button>
      </DialogFooter>
    </>
  );
}
