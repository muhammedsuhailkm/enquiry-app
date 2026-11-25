"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, MoreHorizontal, Pencil, Phone, Trash2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errMsg, type Json } from "../../../_ui/api";
import { formatDate, formatDateTime } from "../../../_ui/PageHeader";
import { STATUS_COLOR, StatusBadge, StatusControl, statusText } from "../../../_ui/StatusControl";
import { initials } from "../../../_ui/useMe";
import { WorkScopeCard } from "../../../_ui/WorkScopeCard";
import { QuoteNoTag } from "../../../_ui/EnquiryNo";
import { customerLabel } from "../../../_ui/customer";

const ACTION_TITLE: Record<string, (h: Json) => string> = {
  CREATE: () => "Enquiry created",
  CHANGE: (h) => `${statusText(h.fromStatus)} → ${statusText(h.toStatus)}`,
  REVISE: (h) => `Quote revised to Rev ${h.revisionNo}`,
  REOPEN: (h) => `Reopened from ${statusText(h.fromStatus)}`,
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function ViewEnquiryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [e, setE] = useState<Json>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    api(`/api/enquiries/${id}`).then(setE).catch((err) => setError(errMsg(err)));
  }, [id]);
  useEffect(load, [load]);

  async function remove() {
    try {
      await api(`/api/enquiries/${e.id}`, "DELETE");
      toast.success(`${e.enquiryNo} deleted`);
      router.push("/enquiries");
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load enquiry</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!e)
    return (
      <div className="grid gap-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );

  const c = e.customer;
  // Attach the quote number in effect *before* each event, so a revision that changed
  // the Zoho number can show "old → new". Then newest first for display.
  const history: Json[] = e.history
    .map((h: Json, i: number) => ({ ...h, prevQuoteNo: i > 0 ? e.history[i - 1].quoteNo : null }))
    .reverse();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{e.enquiryNo}</h1>
            <StatusBadge status={e.status} revisionNo={e.revisionNo} />
            <QuoteNoTag quoteNo={e.quoteNo} className="text-sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(e.createdAt)} by {e.createdByName} ({e.createdByDesignation})
          </p>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          {e.canEdit && (
            <Button variant="outline" asChild className="bg-background max-md:flex-1">
              <Link href={`/enquiries/${e.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
          )}
          <StatusControl enquiry={e} onDone={load} className="max-md:flex-1" />
          {e.canDelete && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="bg-background" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Delete enquiry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {e.status === "REJECTED" && e.lostReason && (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>Lost reason</AlertTitle>
          <AlertDescription>{e.lostReason}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid min-w-0 gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Enquiry details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                <Detail label="Category">{e.category.name}</Detail>
                <Detail label="Lead source">{e.leadSource.name}</Detail>
                <Detail label="Enquiry date">{formatDate(e.enquiryDate)}</Detail>
                <Detail label="Salesperson">{e.salesperson.name}</Detail>
                <Detail label="Revision">{e.revisionNo > 0 ? `Rev ${e.revisionNo}` : "—"}</Detail>
                <Detail label="Zoho quote no.">{e.quoteNo ? <QuoteNoTag quoteNo={e.quoteNo} /> : "—"}</Detail>
              </dl>
              <Separator />
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Scope of work</span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.scopeOfWork}</p>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Additional details</span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.additionalDetails || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <WorkScopeCard enquiry={e} onSaved={setE} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Status history</CardTitle>
              <CardDescription>
                {history.length} event{history.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid">
                {history.map((h, i) => (
                  <li key={h.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: STATUS_COLOR[h.toStatus] }} />
                      {i < history.length - 1 && <span className="my-1.5 w-px flex-1 bg-border" />}
                    </div>
                    <div className={i < history.length - 1 ? "grid gap-1.5 pb-6" : "grid gap-1.5"}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{(ACTION_TITLE[h.action] ?? (() => h.action))(h)}</span>
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          {h.action}
                        </Badge>
                      </div>
                      {h.quoteNo && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {h.action === "REVISE" && h.prevQuoteNo && h.prevQuoteNo !== h.quoteNo ? (
                            <>
                              <QuoteNoTag quoteNo={h.prevQuoteNo} className="opacity-60 line-through" />
                              <span aria-hidden>→</span>
                              <QuoteNoTag quoteNo={h.quoteNo} />
                              <span>quote number changed</span>
                            </>
                          ) : (
                            <QuoteNoTag quoteNo={h.quoteNo} />
                          )}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(h.changedAt)} · {h.changedBy.name}
                      </span>
                      {h.remarks && <p className="text-sm text-foreground/80">{h.remarks}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card className="max-lg:order-first">
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {(c.phone || c.email) && (
              <div className="grid grid-cols-2 gap-2 md:hidden">
                {c.phone && (
                  <Button variant="secondary" asChild className={c.email ? "" : "col-span-2"}>
                    <a href={`tel:${c.phone}`}>
                      <Phone />
                      Call
                    </a>
                  </Button>
                )}
                {c.email && (
                  <Button variant="secondary" asChild className={c.phone ? "" : "col-span-2"}>
                    <a href={`mailto:${c.email}`}>
                      <Mail />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="font-semibold">{initials(customerLabel(c).title)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0">
                <span className="text-sm font-medium break-words">{customerLabel(c).title}</span>
                {customerLabel(c).contact && (
                  <span className="text-xs text-muted-foreground">Contact: {customerLabel(c).contact}</span>
                )}
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:underline">
                  <Mail className="size-4 text-muted-foreground" />
                  {c.email}
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 hover:underline">
                  <Phone className="size-4 text-muted-foreground" />
                  {c.phone}
                </a>
              )}
              {c.address && (
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  {c.address}
                </span>
              )}
              {!c.email && !c.phone && !c.address && <span className="text-muted-foreground">No contact details</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {e.enquiryNo}?</AlertDialogTitle>
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
    </>
  );
}
