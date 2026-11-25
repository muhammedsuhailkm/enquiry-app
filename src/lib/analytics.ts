import "server-only";
import { prisma } from "./db";
import { Prisma } from "@/generated/prisma/client";
import { dateRange, isoToDate } from "./dates";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "./constants";

export type AnalyticsFilter = { salespersonId?: number; from?: string; to?: string };

type Counts = Record<EnquiryStatus, number> & { total: number };

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

function emptyCounts(): Counts {
  return { total: 0, RECEIVED: 0, QUOTED: 0, ACCEPTED: 0, REJECTED: 0, CANCELLED: 0 };
}

/** conversion = won / all closed; win rate = won / (won + lost) - cancelled excluded. */
function withRates(c: Counts) {
  return {
    ...c,
    open: c.RECEIVED + c.QUOTED,
    conversionRate: pct(c.ACCEPTED, c.ACCEPTED + c.REJECTED + c.CANCELLED),
    winRate: pct(c.ACCEPTED, c.ACCEPTED + c.REJECTED),
  };
}

function baseWhere(f: AnalyticsFilter): Prisma.EnquiryWhereInput {
  return {
    isDeleted: false,
    ...(f.salespersonId ? { salespersonId: f.salespersonId } : {}),
    ...(f.from || f.to ? { enquiryDate: dateRange(f.from, f.to) } : {}),
  };
}

/** Group rows of {key, status, count} into per-key Counts. */
function pivot<K extends string | number>(rows: { key: K; status: string; count: number }[]) {
  const map = new Map<K, Counts>();
  for (const r of rows) {
    const c = map.get(r.key) ?? emptyCounts();
    if ((ENQUIRY_STATUSES as readonly string[]).includes(r.status)) c[r.status as EnquiryStatus] += r.count;
    c.total += r.count;
    map.set(r.key, c);
  }
  return map;
}

/** Full dashboard payload. All aggregation happens in Postgres (groupBy / one raw query). */
export async function dashboard(f: AnalyticsFilter) {
  const where = baseWhere(f);

  const [byStatus, revisions, byLead, byWork, byCat, lost, monthly, leads, works, cats] = await Promise.all([
    prisma.enquiry.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.enquiry.aggregate({
      where: { ...where, status: { in: ["ACCEPTED", "REJECTED"] } },
      _avg: { revisionNo: true },
    }),
    prisma.enquiry.groupBy({ by: ["leadSourceId", "status"], where, _count: { _all: true } }),
    byWorkType(f),
    prisma.enquiry.groupBy({ by: ["categoryId", "status"], where, _count: { _all: true } }),
    prisma.enquiry.groupBy({
      by: ["lostReason"],
      where: { ...where, status: "REJECTED", lostReason: { not: null } },
      _count: { lostReason: true },
      orderBy: { _count: { lostReason: "desc" } },
      take: 5,
    }),
    monthlyTrend(f),
    prisma.leadSource.findMany({ select: { id: true, name: true } }),
    prisma.workType.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const totals = emptyCounts();
  for (const r of byStatus) {
    totals[r.status as EnquiryStatus] += r._count._all;
    totals.total += r._count._all;
  }

  const breakdown = (rows: { key: number; status: string; count: number }[], names: { id: number; name: string }[]) => {
    const nameOf = new Map(names.map((n) => [n.id, n.name]));
    return [...pivot(rows).entries()]
      .map(([id, c]) => ({ id, name: nameOf.get(id) ?? `#${id}`, ...withRates(c) }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    kpis: { ...withRates(totals), avgRevisions: round1(revisions._avg.revisionNo ?? 0) },
    byLeadSource: breakdown(byLead.map((r) => ({ key: r.leadSourceId, status: r.status, count: r._count._all })), leads),
    // An enquiry with several work types counts once under each of them.
    byWorkType: breakdown(byWork, works),
    byCategory: breakdown(byCat.map((r) => ({ key: r.categoryId, status: r.status, count: r._count._all })), cats),
    topLostReasons: lost.map((l) => ({ reason: l.lostReason, count: l._count.lostReason })),
    monthly,
  };
}

/**
 * WHERE clause for raw queries on "Enquiry" aliased as `e` (same filter as baseWhere).
 * Postgres folds unquoted identifiers to lower case, so the camelCase columns must be quoted.
 */
function rawWhere(f: AnalyticsFilter) {
  const conds = [Prisma.sql`e."isDeleted" = false`];
  if (f.salespersonId) conds.push(Prisma.sql`e."salespersonId" = ${f.salespersonId}`);
  if (f.from) conds.push(Prisma.sql`e."enquiryDate" >= ${isoToDate(f.from)}::date`);
  if (f.to) conds.push(Prisma.sql`e."enquiryDate" <= ${isoToDate(f.to)}::date`);
  return Prisma.join(conds, " AND ");
}

/**
 * Status counts per work type through the junction table (one grouped query; uses the
 * EnquiryWorkType PK for the join and its workTypeId index for grouping).
 */
async function byWorkType(f: AnalyticsFilter) {
  const rows = await prisma.$queryRaw<{ key: number; status: string; count: number }[]>`
    SELECT ewt."workTypeId" AS "key", e."status" AS "status", COUNT(*) AS "count"
    FROM "EnquiryWorkType" ewt
    JOIN "Enquiry" e ON e."id" = ewt."enquiryId"
    WHERE ${rawWhere(f)}
    GROUP BY ewt."workTypeId", e."status"`;
  return rows.map((r) => ({ key: Number(r.key), status: r.status, count: Number(r.count) }));
}

/** Enquiries vs wins per month (raw SQL: groupBy can't group by month of a date). */
async function monthlyTrend(f: AnalyticsFilter) {
  const rows = await prisma.$queryRaw<
    { y: number; m: number; total: number; accepted: number; rejected: number; cancelled: number }[]
  >`
    SELECT EXTRACT(YEAR FROM e."enquiryDate")::int AS y, EXTRACT(MONTH FROM e."enquiryDate")::int AS m,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE e."status" = 'ACCEPTED')  AS accepted,
           COUNT(*) FILTER (WHERE e."status" = 'REJECTED')  AS rejected,
           COUNT(*) FILTER (WHERE e."status" = 'CANCELLED') AS cancelled
    FROM "Enquiry" e
    WHERE ${rawWhere(f)}
    GROUP BY 1, 2
    ORDER BY 1, 2`;

  return rows.map((r) => ({
    month: `${r.y}-${String(r.m).padStart(2, "0")}`,
    total: Number(r.total),
    accepted: Number(r.accepted),
    rejected: Number(r.rejected),
    cancelled: Number(r.cancelled),
  }));
}

/** Per-employee performance table: 2 grouped queries + 1 user query (no N+1). */
export async function employeePerformance(f: Omit<AnalyticsFilter, "salespersonId">) {
  const where = baseWhere(f);
  const [grouped, revs, users] = await Promise.all([
    prisma.enquiry.groupBy({ by: ["salespersonId", "status"], where, _count: { _all: true } }),
    prisma.enquiry.groupBy({
      by: ["salespersonId"],
      where: { ...where, status: { in: ["ACCEPTED", "REJECTED"] } },
      _avg: { revisionNo: true },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, designation: true, role: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const counts = pivot(grouped.map((g) => ({ key: g.salespersonId, status: g.status, count: g._count._all })));
  const avgRev = new Map(revs.map((r) => [r.salespersonId, r._avg.revisionNo ?? 0]));

  return users
    .filter((u) => u.role === "EMPLOYEE" || counts.has(u.id))
    .map((u) => ({
      ...u,
      ...withRates(counts.get(u.id) ?? emptyCounts()),
      avgRevisions: round1(avgRev.get(u.id) ?? 0),
    }))
    .sort((a, b) => b.ACCEPTED - a.ACCEPTED || b.total - a.total);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
