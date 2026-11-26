"use client";
import { useState } from "react";
import { CheckCircle2, Clock, FileText, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Json } from "./api";
import { STATUS_COLOR } from "./StatusControl";

const STATUSES = ["RECEIVED", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED"] as const;
const STATUS_NAME: Record<string, string> = {
  RECEIVED: "Received",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const pct = (n: number) => `${n}%`;
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

// ---------- KPI cards ----------

/** Per-card colour: coloured title text + solid icon badge (full class strings so Tailwind keeps them). */
const TONE = {
  blue: { title: "text-kpi-blue-fg", icon: "bg-kpi-blue shadow-kpi-blue/30" },
  amber: { title: "text-kpi-amber-fg", icon: "bg-kpi-amber shadow-kpi-amber/30" },
  green: { title: "text-kpi-green-fg", icon: "bg-kpi-green shadow-kpi-green/30" },
  violet: { title: "text-kpi-violet-fg", icon: "bg-kpi-violet shadow-kpi-violet/30" },
} as const;

function Kpi({
  title,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  title: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ElementType;
  tone: keyof typeof TONE;
}) {
  const t = TONE[tone];
  return (
    <Card className="min-w-0 gap-2 py-5 max-md:gap-3 max-md:py-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-6 max-md:px-4">
        <CardDescription className={`min-w-0 truncate font-semibold max-md:text-xs ${t.title}`}>{title}</CardDescription>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-kpi-icon-fg shadow-md max-md:size-7 ${t.icon}`}>
          <Icon className="size-4 max-md:size-3.5" />
        </span>
      </CardHeader>
      <CardContent className="grid gap-1 px-6 max-md:px-4">
        <div className="text-3xl font-semibold tracking-tight tabular-nums max-md:text-2xl">{value}</div>
        <p className="text-xs text-muted-foreground max-md:line-clamp-2">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function Kpis({ k }: { k: Json }) {
  const closed = k.ACCEPTED + k.REJECTED + k.CANCELLED;
  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 *:min-w-0 md:gap-4 lg:grid-cols-4">
      <Kpi tone="blue" title="Total enquiries" value={k.total} sub={`${k.open} open · ${closed} closed`} icon={FileText} />
      <Kpi tone="amber" title="Open enquiries" value={k.open} sub={`${k.RECEIVED} received · ${k.QUOTED} quoted`} icon={Clock} />
      <Kpi tone="green" title="Conversion rate" value={pct(k.conversionRate)} sub="Won ÷ all closed enquiries" icon={TrendingUp} />
      <Kpi
        tone="violet"
        title="Win rate"
        value={pct(k.winRate)}
        sub={`Won ÷ (won + lost) · avg ${k.avgRevisions} revisions`}
        icon={CheckCircle2}
      />
    </section>
  );
}

// ---------- charts ----------

const trendConfig = {
  total: { label: "Total enquiries", color: "var(--chart-1)" },
  accepted: { label: "Won", color: "var(--chart-3)" },
} satisfies ChartConfig;

function Empty({ children = "No data for this period" }: { children?: React.ReactNode }) {
  return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{children}</div>;
}

export function TrendChart({ monthly }: { monthly: Json[] }) {
  const data = monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  return (
    // h-full + flex-1: the chart grows to the row height, so this card always ends level with the status card.
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>Enquiries vs won</CardTitle>
        <CardDescription>Monthly totals by enquiry date</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {data.length === 0 ? (
          <Empty />
        ) : (
          <ChartContainer config={trendConfig} className="aspect-auto min-h-[240px] w-full flex-1">
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accepted)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accepted)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area dataKey="total" type="monotone" stroke="var(--color-total)" fill="url(#fillTotal)" strokeWidth={2} />
              <Area dataKey="accepted" type="monotone" stroke="var(--color-accepted)" fill="url(#fillWon)" strokeWidth={2} />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const statusConfig = Object.fromEntries(
  STATUSES.map((s) => [s, { label: STATUS_NAME[s], color: STATUS_COLOR[s] }]),
) satisfies ChartConfig;

export function StatusDonut({ k }: { k: Json }) {
  const data = STATUSES.map((s) => ({ status: s, count: k[s] as number })).filter((d) => d.count > 0);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Status breakdown</CardTitle>
        <CardDescription>All enquiries in range</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {k.total === 0 ? (
          <Empty />
        ) : (
          // Compact donut: ring radii are percentages so it scales with the box (smaller beside the trend chart on lg).
          <ChartContainer config={statusConfig} className="mx-auto aspect-square h-[200px] lg:h-[164px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="status" />} />
              <Pie data={data} dataKey="count" nameKey="status" innerRadius="68%" outerRadius="100%" strokeWidth={2}>
                {data.map((d) => (
                  <Cell key={d.status} fill={`var(--color-${d.status})`} />
                ))}
                <Label
                  content={({ viewBox }) =>
                    viewBox && "cx" in viewBox && "cy" in viewBox ? (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                          {k.total}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                          Enquiries
                        </tspan>
                      </text>
                    ) : null
                  }
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        <ul className="grid gap-2 text-sm lg:gap-1.5">
          {STATUSES.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: STATUS_COLOR[s] }} />
              <span className="flex-1">{STATUS_NAME[s]}</span>
              <span className="font-medium tabular-nums">{k[s]}</span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                {k.total ? `${Math.round((k[s] / k.total) * 1000) / 10}%` : "0%"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const leadConfig = {
  total: { label: "Total", color: "var(--chart-1)" },
  ACCEPTED: { label: "Won", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Disabled lead sources are left out of the chart (they still count in the KPIs and the breakdown table).
export function LeadSourceChart({ rows: all }: { rows: Json[] }) {
  const rows = all.filter((r) => r.isActive !== false);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>By lead source</CardTitle>
        <CardDescription>Total enquiries and wins per source</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <ChartContainer config={leadConfig} className="aspect-auto h-[240px] w-full">
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              <Bar dataKey="ACCEPTED" fill="var(--color-ACCEPTED)" radius={4} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const lostConfig = { count: { label: "Rejected", color: "var(--chart-4)" } } satisfies ChartConfig;

export function LostReasonsChart({ rows, rejected }: { rows: Json[]; rejected: number }) {
  const mobile = useIsMobile();
  const max = mobile ? 13 : 20;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Top lost reasons</CardTitle>
        <CardDescription>{rejected} rejected enquiries</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty>No rejected enquiries in this period</Empty>
        ) : (
          <ChartContainer config={lostConfig} className="aspect-auto h-[240px] w-full">
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="reason"
                tickLine={false}
                axisLine={false}
                width={mobile ? 96 : 140}
                tickFormatter={(v: string) => (v.length > max ? `${v.slice(0, max - 1)}…` : v)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={18} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- breakdown table ----------

const DIMENSIONS = [
  { key: "byLeadSource", label: "Lead source" },
  { key: "byWorkType", label: "Work type" },
  { key: "byCategory", label: "Category" },
] as const;

export function Breakdown({ d }: { d: Json }) {
  const [dim, setDim] = useState<(typeof DIMENSIONS)[number]["key"]>("byLeadSource");
  const rows: Json[] = d[dim] ?? [];
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>Status counts and rates per dimension</CardDescription>
        </div>
        <Tabs value={dim} onValueChange={(v) => setDim(v as typeof dim)} className="max-md:w-full">
          <TabsList className="max-md:grid max-md:w-full max-md:grid-cols-3">
            {DIMENSIONS.map((x) => (
              <TabsTrigger key={x.key} value={x.key}>
                {x.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {STATUSES.map((s) => (
                  <TableHead key={s} className="text-right max-md:hidden">
                    {STATUS_NAME[s]}
                  </TableHead>
                ))}
                <TableHead className="text-right">
                  <span className="max-md:hidden">Conversion</span>
                  <span className="md:hidden">Conv.</span>
                </TableHead>
                <TableHead className="text-right">Win rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-md:max-w-32 max-md:truncate">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                  {STATUSES.map((s) => (
                    <TableCell key={s} className="text-right tabular-nums max-md:hidden">
                      {r[s]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">{pct(r.conversionRate)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{pct(r.winRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Full analytics body used by the dashboard and the per-employee page. */
export function DashboardBody({ d }: { d: Json }) {
  return (
    // *:min-w-0 on every grid: wide charts/tables scroll inside their card instead of widening the page.
    <div className="grid gap-6 *:min-w-0">
      <Kpis k={d.kpis} />
      <div className="grid gap-4 *:min-w-0 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TrendChart monthly={d.monthly} />
        </div>
        <StatusDonut k={d.kpis} />
      </div>
      <div className="grid gap-4 *:min-w-0 lg:grid-cols-2">
        <LeadSourceChart rows={d.byLeadSource} />
        <LostReasonsChart rows={d.topLostReasons} rejected={d.kpis.REJECTED} />
      </div>
      <Breakdown d={d} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl md:rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

