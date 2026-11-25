"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, CircleSlash, FileText, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, errMsg, type Json } from "./api";

// ---------- status badge ----------

const BADGE: Record<string, string> = {
  RECEIVED: "border-status-received-border bg-status-received-bg text-status-received-fg",
  QUOTED: "border-status-quoted-border bg-status-quoted-bg text-status-quoted-fg",
  ACCEPTED: "border-status-accepted-border bg-status-accepted-bg text-status-accepted-fg",
  REJECTED: "border-status-rejected-border bg-status-rejected-bg text-status-rejected-fg",
  CANCELLED: "border-status-cancelled-border bg-status-cancelled-bg text-status-cancelled-fg",
};

const SHORT: Record<string, string> = {
  RECEIVED: "Received",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Chart/legend colour per status (matches the badge hues). */
export const STATUS_COLOR: Record<string, string> = {
  RECEIVED: "var(--chart-1)",
  QUOTED: "var(--chart-2)",
  ACCEPTED: "var(--chart-3)",
  REJECTED: "var(--chart-4)",
  CANCELLED: "var(--chart-5)",
};

export function statusText(status: string, revisionNo = 0) {
  if (status === "QUOTED" && revisionNo > 0) return `Quoted · Rev ${revisionNo}`;
  return SHORT[status] ?? status;
}

export function StatusBadge({ status, revisionNo = 0, className }: { status: string; revisionNo?: number; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", BADGE[status], className)}>
      {statusText(status, revisionNo)}
    </Badge>
  );
}

// ---------- status change ----------

type Action = "QUOTE" | "REVISE" | "ACCEPT" | "REJECT" | "CANCEL" | "REOPEN";

const ACTIONS: Record<Action, { label: string; hint: string; icon: React.ElementType; tone: string }> = {
  QUOTE: { label: "Mark as quoted", hint: "Quotation sent · Zoho quote no. required", icon: FileText, tone: "text-status-quoted-fg" },
  REVISE: { label: "Revise quote", hint: "Next revision · confirm Zoho quote no.", icon: RefreshCw, tone: "text-status-quoted-fg" },
  ACCEPT: { label: "Mark as accepted", hint: "Won · closes the enquiry", icon: CheckCircle2, tone: "text-status-accepted-fg" },
  REJECT: { label: "Mark as rejected", hint: "Lost · reason required", icon: XCircle, tone: "text-status-rejected-fg" },
  CANCEL: { label: "Cancel enquiry", hint: "No response · reason required", icon: CircleSlash, tone: "text-status-cancelled-fg" },
  REOPEN: { label: "Reopen enquiry", hint: "Admin only · reason required", icon: RotateCcw, tone: "text-status-received-fg" },
};

/** Only these actions ask for a reason (REOPEN is admin-only and its API also requires one). */
const NEEDS_REASON: Action[] = ["REJECT", "CANCEL", "REOPEN"];
const CLOSING: Action[] = ["ACCEPT", "REJECT", "CANCEL"];
/** Quoting and revising record the Zoho quote number (required, also enforced by the API). */
const NEEDS_QUOTE: Action[] = ["QUOTE", "REVISE"];

/**
 * shadcn dropdown of the status changes allowed right now, then a confirm dialog.
 * `variant="badge"` renders the status badge itself as the trigger (for tables).
 */
export function StatusControl({
  enquiry,
  onDone,
  variant = "button",
  className,
}: {
  enquiry: Json;
  onDone: () => void;
  variant?: "button" | "badge";
  className?: string;
}) {
  const actions: { action: Action; to: string }[] = enquiry.actions ?? [];
  const [pick, setPick] = useState<{ action: Action; to: string } | null>(null);
  const [reason, setReason] = useState("");
  const [quoteNo, setQuoteNo] = useState("");
  const [busy, setBusy] = useState(false);

  if (actions.length === 0) {
    return variant === "badge" ? <StatusBadge status={enquiry.status} revisionNo={enquiry.revisionNo} /> : null;
  }

  const open = (a: { action: Action; to: string }) => {
    setReason("");
    // Revising starts from the current Zoho number (edit it if Zoho issued a new one).
    setQuoteNo(a.action === "REVISE" ? (enquiry.quoteNo ?? "") : "");
    setPick(a);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pick) return;
    const r = reason.trim();
    const q = quoteNo.trim();
    if (NEEDS_REASON.includes(pick.action) && !r) return;
    if (NEEDS_QUOTE.includes(pick.action) && !q) return;
    setBusy(true);
    try {
      if (pick.action === "REOPEN") await api(`/api/enquiries/${enquiry.id}/reopen`, "POST", { remarks: r });
      else
        await api(`/api/enquiries/${enquiry.id}/status`, "POST", {
          to: pick.to,
          lostReason: pick.action === "REJECT" ? r : undefined,
          // Cancel needs a reason; quote / revise take optional notes.
          remarks: pick.action === "CANCEL" || NEEDS_QUOTE.includes(pick.action) ? r || undefined : undefined,
          quoteNo: NEEDS_QUOTE.includes(pick.action) ? q : undefined,
        });
      toast.success(`${enquiry.enquiryNo}: ${ACTIONS[pick.action].label.toLowerCase()}`);
      setPick(null);
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  const meta = pick ? ACTIONS[pick.action] : null;
  const nextRev = (enquiry.revisionNo ?? 0) + 1;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {variant === "badge" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Update status of ${enquiry.enquiryNo}`}
            >
              <StatusBadge status={enquiry.status} revisionNo={enquiry.revisionNo} />
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          ) : (
            <Button className={className}>
              Update status
              <ChevronDown />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Currently {statusText(enquiry.status, enquiry.revisionNo)}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((a) => {
            const m = ACTIONS[a.action];
            const Icon = m.icon;
            return (
              <DropdownMenuItem key={a.action} onSelect={() => open(a)} className="items-start gap-3 py-2">
                <Icon className={cn("mt-0.5", m.tone)} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{a.action === "REVISE" ? `Revise quote (Rev ${nextRev})` : m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.hint}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!pick} onOpenChange={(o) => !o && !busy && setPick(null)}>
        <DialogContent className="sm:max-w-md">
          {pick && meta && (
            <form onSubmit={submit} className="grid gap-5">
              <DialogHeader>
                <DialogTitle>{pick.action === "REVISE" ? `Revise quote (Rev ${nextRev})` : meta.label}</DialogTitle>
                <DialogDescription>
                  {enquiry.enquiryNo} is currently {statusText(enquiry.status, enquiry.revisionNo)}.
                  {CLOSING.includes(pick.action) && " This closes the enquiry; only an admin can reopen it."}
                  {pick.action === "REVISE" && " The revision number goes up by one."}
                </DialogDescription>
              </DialogHeader>

              {NEEDS_QUOTE.includes(pick.action) && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="quoteNo">
                      Zoho quote number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="quoteNo"
                      autoFocus
                      required
                      maxLength={50}
                      placeholder="e.g. QT-000123"
                      value={quoteNo}
                      onChange={(e) => setQuoteNo(e.target.value)}
                    />
                    {pick.action === "REVISE" && enquiry.quoteNo && (
                      <p className="text-xs text-muted-foreground">
                        Current: {enquiry.quoteNo}. Keep it, or change it if Zoho issued a new number for this revision.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reason">{pick.action === "REVISE" ? "What changed?" : "Notes"}</Label>
                    <Textarea
                      id="reason"
                      rows={2}
                      maxLength={1000}
                      placeholder={pick.action === "REVISE" ? "e.g. Price revised, added wall panelling" : "Optional"}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </>
              )}
              {pick.action === "REJECT" && (
                <div className="grid gap-2">
                  <Label htmlFor="reason">
                    Lost reason <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reason"
                    autoFocus
                    required
                    maxLength={500}
                    placeholder="e.g. Price too high, went with a competitor"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
              {(pick.action === "CANCEL" || pick.action === "REOPEN") && (
                <div className="grid gap-2">
                  <Label htmlFor="reason">
                    Reason <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    autoFocus
                    required
                    rows={3}
                    maxLength={1000}
                    placeholder={pick.action === "CANCEL" ? "e.g. No response after 3 follow-ups" : "Why is this being reopened?"}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPick(null)} disabled={busy}>
                  Back
                </Button>
                <Button
                  type="submit"
                  variant={pick.action === "REJECT" ? "destructive" : "default"}
                  disabled={
                    busy ||
                    (NEEDS_REASON.includes(pick.action) && !reason.trim()) ||
                    (NEEDS_QUOTE.includes(pick.action) && !quoteNo.trim())
                  }
                >
                  {busy ? "Saving…" : pick.action === "REVISE" ? "Save revision" : meta.label}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
