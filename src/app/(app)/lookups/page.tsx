"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ListTree, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errMsg, type Json } from "../../_ui/api";
import { PageHeader } from "../../_ui/PageHeader";

const TYPES = [
  { type: "work-types", key: "workTypes", title: "Work types", one: "work type" },
  { type: "categories", key: "categories", title: "Categories", one: "category" },
  { type: "lead-sources", key: "leadSources", title: "Lead sources", one: "lead source" },
] as const;

/** Admin: add / rename / activate sub works under one work type. */
function SubWorksDialog({
  workType,
  onClose,
  run,
  busy,
}: {
  workType: Json;
  onClose: () => void;
  run: (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  if (!workType) return null;
  const subs: Json[] = workType.subWorkTypes ?? [];
  const active = subs.filter((s) => s.isActive).length;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>{workType.name} · sub works</DialogTitle>
          <DialogDescription>
            {subs.length} sub works · {active} active. Inactive ones stay on old enquiries but can&apos;t be picked.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2 border-b p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = name.trim();
            if (!v) return;
            if (await run(() => api("/api/sub-work-types", "POST", { workTypeId: workType.id, name: v }), `Added “${v}”`)) setName("");
          }}
        >
          <Label htmlFor="new-sub" className="sr-only">
            New sub work name
          </Label>
          <Input id="new-sub" className="flex-1" placeholder="New sub work name" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={busy || !name.trim()}>
            <Plus />
            Add
          </Button>
        </form>

        <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
          {subs.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No sub works yet. Add the first one above.</li>}
          {subs.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-4 py-2">
              {editing && editing.id === s.id ? (
                <form
                  className="flex flex-1 items-center gap-1"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const v = editing.name.trim();
                    if (!v) return;
                    if (await run(() => api(`/api/sub-work-types/${s.id}`, "PATCH", { name: v }), "Renamed")) setEditing(null);
                  }}
                >
                  <Input
                    autoFocus
                    aria-label={`Rename ${s.name}`}
                    maxLength={150}
                    value={editing.name}
                    onChange={(e) => setEditing({ id: s.id, name: e.target.value })}
                    className="h-8"
                  />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Save name" disabled={busy}>
                    <Check />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel rename" onClick={() => setEditing(null)}>
                    <X />
                  </Button>
                </form>
              ) : (
                <>
                  <span className={s.isActive ? "flex-1 text-sm" : "flex-1 text-sm text-muted-foreground line-through"}>{s.name}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Rename ${s.name}`} onClick={() => setEditing({ id: s.id, name: s.name })}>
                    <Pencil />
                  </Button>
                  <Switch
                    checked={s.isActive}
                    aria-label={`${s.isActive ? "Deactivate" : "Activate"} ${s.name}`}
                    onCheckedChange={(v) =>
                      run(() => api(`/api/sub-work-types/${s.id}`, "PATCH", { isActive: v }), `${s.name} ${v ? "activated" : "deactivated"}`)
                    }
                  />
                </>
              )}
            </li>
          ))}
        </ul>

        <DialogFooter className="border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LookupsPage() {
  const [data, setData] = useState<Json>(null);
  const [tab, setTab] = useState<(typeof TYPES)[number]["type"]>("work-types");
  const [name, setName] = useState("");
  const [rename, setRename] = useState<Json>(null);
  const [subsFor, setSubsFor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api("/api/lookups?includeInactive=true").then(setData).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const t = TYPES.find((x) => x.type === tab)!;
  const list: Json[] = data?.[t.key] ?? [];
  const active = list.filter((l) => l.isActive).length;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      load();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid w-full max-w-4xl gap-6">
      <PageHeader
        title="Lookups"
        description="Dropdown values used on enquiries. Inactive values stay on old records but can't be picked."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="min-w-0">
        <TabsList className="max-md:grid max-md:h-auto max-md:w-full max-md:grid-cols-3 max-md:rounded-xl">
          {TYPES.map((x) => (
            <TabsTrigger key={x.type} value={x.type}>
              {x.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="gap-0 pb-0">
        <CardHeader className="gap-4 border-b pb-6">
          <div className="grid gap-1.5">
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{data ? `${list.length} values · ${active} active` : "Loading…"}</CardDescription>
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = name.trim();
              if (!v) return;
              if (await run(() => api(`/api/lookups/${t.type}`, "POST", { name: v }), `Added “${v}”`)) setName("");
            }}
          >
            <Label htmlFor="new-lookup" className="sr-only">
              New {t.one} name
            </Label>
            <Input
              id="new-lookup"
              className="min-w-48 flex-1"
              placeholder={`New ${t.one} name`}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={busy || !name.trim()}>
              <Plus />
              Add
            </Button>
          </form>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead className="max-md:hidden">Status</TableHead>
                {tab === "work-types" && <TableHead>Sub works</TableHead>}
                <TableHead>Active</TableHead>
                <TableHead className="w-14 pr-6">
                  <span className="sr-only">Rename</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="px-6">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {data && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No {t.title.toLowerCase()} yet. Add the first one above.
                  </TableCell>
                </TableRow>
              )}
              {list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="pl-6 font-medium whitespace-normal">{l.name}</TableCell>
                  <TableCell className="max-md:hidden">
                    {l.isActive ? (
                      <Badge variant="outline" className="border-success-border bg-success-bg text-success-fg">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  {tab === "work-types" && (
                    <TableCell>
                      <Button variant="outline" size="sm" className="bg-background" onClick={() => setSubsFor(l.id)}>
                        <ListTree />
                        {l.subWorkTypes?.length ?? 0}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell>
                    <Switch
                      checked={l.isActive}
                      aria-label={`${l.isActive ? "Deactivate" : "Activate"} ${l.name}`}
                      onCheckedChange={(v) =>
                        run(() => api(`/api/lookups/${t.type}/${l.id}`, "PATCH", { isActive: v }), `${l.name} ${v ? "activated" : "deactivated"}`)
                      }
                    />
                  </TableCell>
                  <TableCell className="pr-6">
                    <Button variant="ghost" size="icon-sm" aria-label={`Rename ${l.name}`} onClick={() => setRename(l)}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {subsFor !== null && (
        <SubWorksDialog
          workType={data?.workTypes?.find((w: Json) => w.id === subsFor)}
          onClose={() => setSubsFor(null)}
          run={run}
          busy={busy}
        />
      )}

      <Dialog open={!!rename} onOpenChange={(o) => !o && !busy && setRename(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = String(new FormData(e.currentTarget).get("name")).trim();
              if (!v) return;
              if (await run(() => api(`/api/lookups/${t.type}/${rename.id}`, "PATCH", { name: v }), "Renamed")) setRename(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename {t.one}</DialogTitle>
              <DialogDescription>Existing enquiries show the new name too.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="rename">Name</Label>
              <Input id="rename" name="name" required maxLength={100} defaultValue={rename?.name} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRename(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
