"use client";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Json } from "./api";

export type WorkScope = { workTypeIds: number[]; subWorkTypeIds: number[] };
type Sub = { id: number; name: string; isActive?: boolean };
type Group = { id: number; name: string; isActive?: boolean; subWorkTypes: Sub[] };

/**
 * Merge the active catalogue (GET /api/lookups) with what an enquiry already has, so work/sub types
 * an admin has since deactivated still show (and can be deselected) when editing an old enquiry.
 */
export function mergeCatalogue(catalogue: Json[], current?: Json[]): Group[] {
  const groups: Group[] = catalogue.map((g) => ({ ...g, subWorkTypes: [...(g.subWorkTypes ?? [])] }));
  for (const cur of current ?? []) {
    let g = groups.find((x) => x.id === cur.id);
    if (!g) groups.push((g = { id: cur.id, name: cur.name, isActive: false, subWorkTypes: [] }));
    for (const s of cur.subWorkTypes ?? []) {
      if (!g.subWorkTypes.some((x) => x.id === s.id)) g.subWorkTypes.push({ ...s, isActive: false });
    }
  }
  return groups;
}

/**
 * Multi-select work scope: tick work types; ticked types expand to show their sub works as chips.
 * Picking a sub work ticks its work type; unticking a work type clears its sub works.
 * Search looks through every sub work (matching groups open even if not ticked yet).
 */
export function WorkScopePicker({
  groups,
  value,
  onChange,
  invalid,
}: {
  groups: Group[];
  value: WorkScope;
  onChange: (v: WorkScope) => void;
  invalid?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<number>>(() => new Set(value.workTypeIds));
  const types = useMemo(() => new Set(value.workTypeIds), [value.workTypeIds]);
  const subs = useMemo(() => new Set(value.subWorkTypeIds), [value.subWorkTypeIds]);
  const term = q.trim().toLowerCase();

  const toggleType = (g: Group) => {
    if (types.has(g.id)) {
      const drop = new Set(g.subWorkTypes.map((s) => s.id));
      onChange({
        workTypeIds: value.workTypeIds.filter((x) => x !== g.id),
        subWorkTypeIds: value.subWorkTypeIds.filter((x) => !drop.has(x)),
      });
    } else {
      onChange({ ...value, workTypeIds: [...value.workTypeIds, g.id] });
      setOpen((o) => new Set(o).add(g.id));
    }
  };

  const toggleSub = (g: Group, s: Sub) => {
    if (subs.has(s.id)) {
      onChange({ ...value, subWorkTypeIds: value.subWorkTypeIds.filter((x) => x !== s.id) });
    } else {
      onChange({
        workTypeIds: types.has(g.id) ? value.workTypeIds : [...value.workTypeIds, g.id],
        subWorkTypeIds: [...value.subWorkTypeIds, s.id],
      });
    }
  };

  const toggleOpen = (id: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const visible = groups
    .map((g) => {
      const groupHit = !term || g.name.toLowerCase().includes(term);
      const subsShown = groupHit ? g.subWorkTypes : g.subWorkTypes.filter((s) => s.name.toLowerCase().includes(term));
      return { g, subsShown, show: groupHit || subsShown.length > 0 };
    })
    .filter((x) => x.show);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search work types or sub works…"
            aria-label="Search work scope"
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value.workTypeIds.length} work type{value.workTypeIds.length === 1 ? "" : "s"} · {value.subWorkTypeIds.length} sub work
          {value.subWorkTypeIds.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className={cn("grid gap-2", invalid && "rounded-lg ring-2 ring-destructive/40")}>
        {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No match for “{q}”.</p>}
        {visible.map(({ g, subsShown }) => {
          const checked = types.has(g.id);
          const expanded = open.has(g.id) || !!term;
          const picked = g.subWorkTypes.filter((s) => subs.has(s.id)).length;
          return (
            <section
              key={g.id}
              className={cn("rounded-lg border bg-background transition-colors", checked && "border-tag-worktype-border bg-tag-worktype-soft")}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Checkbox
                  id={`wt-${g.id}`}
                  checked={checked}
                  onCheckedChange={() => toggleType(g)}
                  className="max-md:size-5"
                  aria-label={`Work type ${g.name}`}
                />
                <label htmlFor={`wt-${g.id}`} className="flex-1 cursor-pointer text-sm font-semibold select-none">
                  {g.name}
                  {g.isActive === false && <span className="ml-2 text-xs font-normal text-muted-foreground">(inactive)</span>}
                </label>
                {picked > 0 && (
                  <span className="rounded-md bg-tag-worktype-bg px-1.5 py-0.5 text-xs font-semibold text-tag-worktype-fg tabular-nums">{picked}</span>
                )}
                {g.subWorkTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleOpen(g.id)}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Hide" : "Show"} sub works for ${g.name}`}
                    className="-mr-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent max-md:size-10"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                  </button>
                )}
              </div>

              {expanded && subsShown.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t px-3 py-3">
                  {subsShown.map((s) => {
                    const on = subs.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleSub(g, s)}
                        className={cn(
                          "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors max-md:min-h-10 max-md:text-sm",
                          on
                            ? "border-tag-worktype-border bg-tag-worktype-bg text-tag-worktype-fg"
                            : "border-border bg-background text-foreground/80 hover:border-tag-worktype-border hover:bg-tag-worktype-soft-hover",
                        )}
                      >
                        {on && <Check className="size-3.5" strokeWidth={2.5} />}
                        {s.name}
                        {s.isActive === false && <span className="text-muted-foreground">(inactive)</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {value.workTypeIds.length > 0 && (
        <button
          type="button"
          onClick={() => onChange({ workTypeIds: [], subWorkTypeIds: [] })}
          className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Clear selection
        </button>
      )}
    </div>
  );
}
