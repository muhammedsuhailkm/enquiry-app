import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { badRequest } from "./api";

type Tx = Prisma.TransactionClient;

export type WorkScopeInput = { workTypeIds: number[]; subWorkTypeIds: number[] };

/**
 * Replace an enquiry's work scope (work types + sub work types) inside the caller's transaction.
 *
 * - A selected sub work type automatically selects its parent work type.
 * - Newly added work/sub types must exist and be active; ones already on the enquiry may stay
 *   even if an admin has since deactivated them (old records keep their history).
 * - Writes only the diff (deleteMany removed + createMany added), so unchanged rows are untouched.
 * Query count is constant (≤ 8) regardless of how many items are selected.
 */
export async function setWorkScope(tx: Tx, enquiryId: number, input: WorkScopeInput, opts: { isNew: boolean }) {
  const subIds = [...new Set(input.subWorkTypeIds)];

  const [subs, existingTypes, existingSubs] = await Promise.all([
    subIds.length
      ? tx.subWorkType.findMany({ where: { id: { in: subIds } }, select: { id: true, workTypeId: true, isActive: true } })
      : Promise.resolve([]),
    opts.isNew ? Promise.resolve([]) : tx.enquiryWorkType.findMany({ where: { enquiryId }, select: { workTypeId: true } }),
    opts.isNew ? Promise.resolve([]) : tx.enquirySubWorkType.findMany({ where: { enquiryId }, select: { subWorkTypeId: true } }),
  ]);
  if (subs.length !== subIds.length) throw badRequest("One or more sub work types were not found");

  // Parent of every selected sub is part of the scope.
  const typeIds = [...new Set([...input.workTypeIds, ...subs.map((s) => s.workTypeId)])];
  if (typeIds.length === 0) throw badRequest("Select at least one work type");

  const types = await tx.workType.findMany({ where: { id: { in: typeIds } }, select: { id: true, isActive: true } });
  if (types.length !== typeIds.length) throw badRequest("One or more work types were not found");

  const hadType = new Set(existingTypes.map((r) => r.workTypeId));
  const hadSub = new Set(existingSubs.map((r) => r.subWorkTypeId));
  if (types.some((t) => !t.isActive && !hadType.has(t.id))) throw badRequest("A selected work type is inactive");
  if (subs.some((s) => !s.isActive && !hadSub.has(s.id))) throw badRequest("A selected sub work type is inactive");

  const wantType = new Set(typeIds);
  const wantSub = new Set(subIds);
  const removeTypes = [...hadType].filter((x) => !wantType.has(x));
  const removeSubs = [...hadSub].filter((x) => !wantSub.has(x));
  const addTypes = typeIds.filter((x) => !hadType.has(x));
  const addSubs = subIds.filter((x) => !hadSub.has(x));

  // Sequential: one Postgres transaction = one connection, so writes run one after another anyway.
  if (removeSubs.length) await tx.enquirySubWorkType.deleteMany({ where: { enquiryId, subWorkTypeId: { in: removeSubs } } });
  if (removeTypes.length) await tx.enquiryWorkType.deleteMany({ where: { enquiryId, workTypeId: { in: removeTypes } } });
  if (addTypes.length) await tx.enquiryWorkType.createMany({ data: addTypes.map((workTypeId) => ({ enquiryId, workTypeId })) });
  if (addSubs.length) await tx.enquirySubWorkType.createMany({ data: addSubs.map((subWorkTypeId) => ({ enquiryId, subWorkTypeId })) });
}

// ---------- read helpers ----------

/** Prisma select for the work types of an enquiry (list views: names only). */
export const workTypesSelect = {
  select: { workType: { select: { id: true, name: true, sortOrder: true } } },
} satisfies Prisma.Enquiry$workTypesArgs;

/** Prisma select for sub work types of an enquiry (detail view). */
export const subWorkTypesSelect = {
  select: { subWorkType: { select: { id: true, name: true, sortOrder: true, workTypeId: true } } },
} satisfies Prisma.Enquiry$subWorkTypesArgs;

type Named = { id: number; name: string; sortOrder: number };
const bySort = (a: Named, b: Named) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/** Flatten junction rows -> sorted [{id, name}]. */
export function flattenWorkTypes(rows: { workType: Named }[]) {
  return rows
    .map((r) => r.workType)
    .sort(bySort)
    .map(({ id, name }) => ({ id, name }));
}

/** Group an enquiry's work types with their selected sub work types (for the detail page). */
export function groupWorkScope(types: { workType: Named }[], subs: { subWorkType: Named & { workTypeId: number } }[]) {
  const subList = subs.map((s) => s.subWorkType).sort(bySort);
  return types
    .map((t) => t.workType)
    .sort(bySort)
    .map((t) => ({
      id: t.id,
      name: t.name,
      subWorkTypes: subList.filter((s) => s.workTypeId === t.id).map(({ id, name }) => ({ id, name })),
    }));
}
