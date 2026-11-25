"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errMsg, type Json } from "./api";
import { WorkTypeTag } from "./EnquiryNo";
import { mergeCatalogue, WorkScopePicker, type WorkScope } from "./WorkScopePicker";

/**
 * Enquiry page: shows the selected work types with their sub works, and lets the team
 * select / deselect them as the scope firms up with the client (open enquiries only).
 */
export function WorkScopeCard({ enquiry, onSaved }: { enquiry: Json; onSaved: (e: Json) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const scope: Json[] = enquiry.workScope ?? [];
  const subCount = scope.reduce((n, g) => n + g.subWorkTypes.length, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Work scope</CardTitle>
          <CardDescription>
            {scope.length} work type{scope.length === 1 ? "" : "s"} · {subCount} sub work{subCount === 1 ? "" : "s"}
          </CardDescription>
        </div>
        {enquiry.canEdit && (
          <Button variant="outline" size="sm" className="bg-background" onClick={() => setOpen(true)}>
            <Pencil />
            Edit scope
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {scope.length === 0 ? (
          <p className="text-sm text-muted-foreground">No work types selected.</p>
        ) : (
          <ul className="grid gap-4">
            {scope.map((g) => (
              <li key={g.id} className="grid gap-2">
                <WorkTypeTag name={g.name} className="justify-self-start text-sm" />
                {g.subWorkTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {g.subWorkTypes.map((s: Json) => (
                      <span key={s.id} className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                        {s.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No sub works selected yet</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {open && <EditScopeDialog enquiry={enquiry} onClose={close} onSaved={onSaved} />}
    </Card>
  );
}

function EditScopeDialog({ enquiry, onClose, onSaved }: { enquiry: Json; onClose: () => void; onSaved: (e: Json) => void }) {
  const [catalogue, setCatalogue] = useState<Json[] | null>(null);
  const [value, setValue] = useState<WorkScope>({ workTypeIds: enquiry.workTypeIds, subWorkTypeIds: enquiry.subWorkTypeIds });
  const [busy, setBusy] = useState(false);

  // Load the catalogue when the dialog opens (it's mounted only while open).
  useEffect(() => {
    let live = true;
    api("/api/lookups")
      .then((l) => live && setCatalogue(l.workTypes))
      .catch((e) => {
        if (!live) return;
        toast.error(errMsg(e));
        onClose();
      });
    return () => {
      live = false;
    };
  }, [onClose]);

  async function save() {
    if (value.workTypeIds.length === 0) return toast.error("Select at least one work type");
    setBusy(true);
    try {
      const updated = await api(`/api/enquiries/${enquiry.id}/work-scope`, "PUT", value);
      toast.success("Work scope updated");
      onSaved(updated);
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>Edit work scope · {enquiry.enquiryNo}</DialogTitle>
          <DialogDescription>Select or deselect work types and sub works based on the latest discussion with the client.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {catalogue ? (
            <WorkScopePicker groups={mergeCatalogue(catalogue, enquiry.workScope)} value={value} onChange={setValue} />
          ) : (
            <div className="grid gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-lg" />
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="border-t p-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={busy || !catalogue || value.workTypeIds.length === 0}>
            {busy ? "Saving…" : "Save scope"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
