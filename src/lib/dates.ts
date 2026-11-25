/** Today's date (server local time) as YYYY-MM-DD. */
export function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

/** YYYY-MM-DD -> Date at UTC midnight (matches Postgres DATE column semantics). */
export function isoToDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Build a Prisma date filter for a DATE column from optional from/to strings (inclusive). */
export function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: isoToDate(from) } : {}),
    ...(to ? { lte: isoToDate(to) } : {}),
  };
}
