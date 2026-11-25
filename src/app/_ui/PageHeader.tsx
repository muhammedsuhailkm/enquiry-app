"use client";
import { useState } from "react";
import { CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto max-md:*:min-w-0 max-md:*:flex-1">{children}</div>
      )}
    </div>
  );
}

export type Range = { from?: string; to?: string };

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso?: string | null) {
  return iso ? fmt(iso.slice(0, 10)) : "—";
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- date presets ----------

/** Local calendar date as YYYY-MM-DD (en-CA formats that way; avoids UTC shifts from toISOString). */
const ymd = (d: Date) => d.toLocaleDateString("en-CA");

type PresetKey = "today" | "week" | "month" | "3months" | "year";

/** Quick ranges, all ending today. Weeks start on Monday. */
const PRESETS: { key: PresetKey; label: string; range: () => Range }[] = [
  {
    key: "today",
    label: "Today",
    range: () => {
      const t = ymd(new Date());
      return { from: t, to: t };
    },
  },
  {
    key: "week",
    label: "This week",
    range: () => {
      const d = new Date();
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
      return { from: ymd(d), to: ymd(new Date()) };
    },
  },
  {
    key: "month",
    label: "This month",
    range: () => {
      const n = new Date();
      return { from: ymd(new Date(n.getFullYear(), n.getMonth(), 1)), to: ymd(n) };
    },
  },
  {
    key: "3months",
    label: "Last 3 months",
    range: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      d.setDate(d.getDate() + 1); // e.g. 25 Aug → 24 Nov inclusive
      return { from: ymd(d), to: ymd(new Date()) };
    },
  },
  {
    key: "year",
    label: "This year",
    range: () => {
      const n = new Date();
      return { from: ymd(new Date(n.getFullYear(), 0, 1)), to: ymd(n) };
    },
  },
];

const presetOf = (v: Range) => {
  if (!v.from && !v.to) return null;
  return PRESETS.find((p) => {
    const r = p.range();
    return r.from === v.from && r.to === v.to;
  });
};

/**
 * Date-range filter: a button that opens a popover with quick ranges
 * (All time, Today, This week, This month, Last 3 months, This year) and a Custom from/to.
 */
export function DateRangeFilter({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");

  const active = presetOf(value);
  const isAll = !value.from && !value.to;
  const label = isAll
    ? "All time"
    : active
      ? active.label
      : `${value.from ? fmt(value.from) : "Start"} – ${value.to ? fmt(value.to) : "Today"}`;

  const pick = (r: Range) => {
    onChange(r);
    setOpen(false);
  };

  const option = (key: string, text: string, selected: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-sm transition-colors hover:bg-accent max-md:min-h-11",
        selected && "bg-accent font-medium",
      )}
    >
      {text}
      {selected && <Check className="size-4" />}
    </button>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setFrom(value.from ?? "");
          setTo(value.to ?? "");
          setCustom(!isAll && !active); // reopen straight into Custom if a custom range is set
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start bg-background">
          <CalendarIcon />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid gap-0.5">
          {option("all", "All time", isAll && !custom, () => pick({}))}
          {PRESETS.map((p) => option(p.key, p.label, active?.key === p.key && !custom, () => pick(p.range())))}
          {option("custom", "Custom", custom || (!isAll && !active), () => setCustom(true))}
        </div>

        {custom && (
          <form
            className="mt-2 grid gap-3 border-t px-1 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!from && !to) return;
              pick({ from: from || undefined, to: to || undefined });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="range-from">From</Label>
              <Input id="range-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="range-to">To</Label>
              <Input id="range-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button type="submit" disabled={!from && !to}>
              Apply
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
