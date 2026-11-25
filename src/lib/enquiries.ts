import "server-only";
import type { z } from "zod";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { badRequest, conflict, forbidden, notFound, type CurrentUser } from "./api";
import { enquiryScope, isAdmin } from "./authz";
import { allowedActions } from "./enquiry-workflow";
import { CLOSED_STATUSES, statusDisplay, type EnquiryStatus } from "./constants";
import { dateRange, isoToDate, todayIso } from "./dates";
import type { enquiryCreateSchema, enquiryListQuery, enquiryUpdateSchema, workScopeSchema } from "./validators";
import { flattenWorkTypes, groupWorkScope, setWorkScope, subWorkTypesSelect, workTypesSelect } from "./work-scope";

type Tx = Prisma.TransactionClient;

// Columns needed by the enquiry table (keep the list query lean: no NVARCHAR(MAX) columns).
const listSelect = {
  id: true,
  enquiryNo: true,
  enquiryDate: true,
  status: true,
  revisionNo: true,
  quoteNo: true,
  customer: { select: { id: true, name: true, companyName: true } },
  leadSource: { select: { id: true, name: true } },
  workTypes: workTypesSelect,
  category: { select: { id: true, name: true } },
  salesperson: { select: { id: true, name: true } },
} satisfies Prisma.EnquirySelect;

export async function listEnquiries(user: CurrentUser, q: z.output<typeof enquiryListQuery>) {
  const where: Prisma.EnquiryWhereInput = {
    ...enquiryScope(user),
    ...(q.status ? { status: q.status } : {}),
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(isAdmin(user) && q.salespersonId ? { salespersonId: q.salespersonId } : {}),
    ...(q.from || q.to ? { enquiryDate: dateRange(q.from, q.to) } : {}),
    // Postgres LIKE is case-sensitive, so search case-insensitively (ILIKE) as SQL Server did.
    ...(q.q
      ? {
          OR: [
            { enquiryNo: { contains: q.q, mode: "insensitive" } },
            { quoteNo: { contains: q.q, mode: "insensitive" } }, // find an enquiry from its Zoho quote number
            { customer: { name: { contains: q.q, mode: "insensitive" } } },
            { customer: { companyName: { contains: q.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      select: listSelect,
      orderBy: [{ enquiryDate: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  const admin = isAdmin(user);
  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    items: rows.map(({ salesperson, workTypes, ...r }) => ({
      ...r,
      workTypes: flattenWorkTypes(workTypes),
      enquiryDate: r.enquiryDate.toISOString().slice(0, 10),
      statusLabel: statusDisplay(r.status, r.revisionNo),
      // Salesperson column is admin-only
      ...(admin ? { salesperson } : {}),
      canEdit: canEdit(user, r.status),
      canDelete: canDelete(user, r.status),
      actions: allowedActions(user, r.status),
    })),
  };
}

export async function getEnquiry(user: CurrentUser, id: number) {
  const enq = await prisma.enquiry.findFirst({
    where: { id, ...enquiryScope(user) },
    include: {
      customer: true,
      workTypes: workTypesSelect,
      subWorkTypes: subWorkTypesSelect,
      category: { select: { id: true, name: true } },
      leadSource: { select: { id: true, name: true } },
      salesperson: { select: { id: true, name: true, designation: true } },
      history: {
        orderBy: [{ changedAt: "asc" }, { id: "asc" }],
        include: { changedBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!enq) throw notFound("Enquiry not found");
  const { workTypes, subWorkTypes, ...rest } = enq;
  return {
    ...rest,
    // Grouped for display; flat id lists for the editor.
    workScope: groupWorkScope(workTypes, subWorkTypes),
    workTypeIds: workTypes.map((w) => w.workType.id),
    subWorkTypeIds: subWorkTypes.map((s) => s.subWorkType.id),
    enquiryDate: enq.enquiryDate.toISOString().slice(0, 10),
    statusLabel: statusDisplay(enq.status, enq.revisionNo),
    canEdit: canEdit(user, enq.status),
    canDelete: canDelete(user, enq.status),
    actions: allowedActions(user, enq.status),
  };
}

export async function createEnquiry(user: CurrentUser, input: z.output<typeof enquiryCreateSchema>) {
  const salespersonId = await resolveSalesperson(user, input.salespersonId);
  const enquiryDate = isoToDate(input.enquiryDate ?? todayIso());

  return prisma.$transaction(async (tx) => {
    await assertActiveLookups(tx, input);
    const customerId = input.newCustomer
      ? (await tx.customer.create({ data: { ...input.newCustomer, createdById: user.id }, select: { id: true } })).id
      : await assertCustomer(tx, input.customerId!);

    const enquiryNo = await nextEnquiryNo(tx, enquiryDate.getUTCFullYear());
    const enq = await tx.enquiry.create({
      data: {
        enquiryNo,
        customerId,
        categoryId: input.categoryId,
        leadSourceId: input.leadSourceId,
        enquiryDate,
        scopeOfWork: input.scopeOfWork,
        additionalDetails: input.additionalDetails,
        createdById: user.id,
        createdByName: user.name, // snapshot from the session user, never from input
        createdByDesignation: user.designation,
        salespersonId,
        status: "RECEIVED",
      },
      select: { id: true, enquiryNo: true, status: true },
    });
    await setWorkScope(tx, enq.id, input, { isNew: true });
    await tx.enquiryStatusHistory.create({
      data: { enquiryId: enq.id, action: "CREATE", fromStatus: null, toStatus: "RECEIVED", revisionNo: 0, changedById: user.id },
    });
    return enq;
  });
}

export async function updateEnquiry(user: CurrentUser, id: number, input: z.output<typeof enquiryUpdateSchema>) {
  if (input.salespersonId !== undefined && !isAdmin(user)) throw forbidden("Only an admin can reassign the salesperson");

  return prisma.$transaction(async (tx) => {
    const enq = await tx.enquiry.findFirst({ where: { id, ...enquiryScope(user) }, select: { status: true } });
    if (!enq) throw notFound("Enquiry not found");
    if (CLOSED_STATUSES.includes(enq.status as EnquiryStatus)) {
      throw conflict("Closed enquiries cannot be edited (an admin must reopen it first)");
    }
    await assertActiveLookups(tx, input);
    if (input.salespersonId) await resolveSalesperson(user, input.salespersonId);

    let customerId: number | undefined;
    if (input.newCustomer) {
      customerId = (await tx.customer.create({ data: { ...input.newCustomer, createdById: user.id }, select: { id: true } })).id;
    } else if (input.customerId) {
      customerId = await assertCustomer(tx, input.customerId);
    }

    if (input.workTypeIds) {
      await setWorkScope(tx, id, { workTypeIds: input.workTypeIds, subWorkTypeIds: input.subWorkTypeIds ?? [] }, { isNew: false });
    }

    return tx.enquiry.update({
      where: { id },
      data: {
        customerId,
        categoryId: input.categoryId,
        leadSourceId: input.leadSourceId,
        enquiryDate: input.enquiryDate ? isoToDate(input.enquiryDate) : undefined,
        scopeOfWork: input.scopeOfWork,
        additionalDetails: input.additionalDetails,
        salespersonId: input.salespersonId,
      },
      select: { id: true, enquiryNo: true, status: true },
    });
  });
}

/**
 * Select / deselect work types + sub work types on an existing enquiry (from the enquiry page,
 * as the scope firms up with the client). Open enquiries only, same rule as editing.
 */
export async function updateWorkScope(user: CurrentUser, id: number, input: z.output<typeof workScopeSchema>) {
  await prisma.$transaction(async (tx) => {
    const enq = await tx.enquiry.findFirst({ where: { id, ...enquiryScope(user) }, select: { status: true } });
    if (!enq) throw notFound("Enquiry not found");
    if (!canEdit(user, enq.status)) throw conflict("Closed enquiries cannot be edited (an admin must reopen it first)");
    await setWorkScope(tx, id, input, { isNew: false });
    await tx.enquiry.update({ where: { id }, data: { updatedAt: new Date() } });
  });
  return getEnquiry(user, id);
}

export async function deleteEnquiry(user: CurrentUser, id: number) {
  const enq = await prisma.enquiry.findFirst({ where: { id, ...enquiryScope(user) }, select: { status: true } });
  if (!enq) throw notFound("Enquiry not found");
  if (!canDelete(user, enq.status)) throw forbidden("Only an admin can delete a closed enquiry");
  await prisma.enquiry.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
  return { ok: true };
}

// ---------------- helpers ----------------

function canEdit(_user: CurrentUser, status: string) {
  return !CLOSED_STATUSES.includes(status as EnquiryStatus);
}
// Employees may delete only open enquiries (so won/lost stats can't be erased); admins any.
function canDelete(user: CurrentUser, status: string) {
  return isAdmin(user) || !CLOSED_STATUSES.includes(status as EnquiryStatus);
}

async function resolveSalesperson(user: CurrentUser, requested?: number) {
  if (!requested || requested === user.id) return user.id;
  if (!isAdmin(user)) throw forbidden("Only an admin can assign another salesperson");
  const sp = await prisma.user.findUnique({ where: { id: requested }, select: { isActive: true } });
  if (!sp?.isActive) throw badRequest("Salesperson not found or inactive");
  return requested;
}

async function assertCustomer(tx: Tx, customerId: number) {
  const c = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!c) throw badRequest("Customer not found");
  return c.id;
}

/** Lookups referenced by an enquiry must exist and be active (work scope is checked in work-scope.ts). */
async function assertActiveLookups(tx: Tx, ids: { categoryId?: number; leadSourceId?: number }) {
  const [c, l] = await Promise.all([
    ids.categoryId ? tx.category.findUnique({ where: { id: ids.categoryId }, select: { isActive: true } }) : true,
    ids.leadSourceId ? tx.leadSource.findUnique({ where: { id: ids.leadSourceId }, select: { isActive: true } }) : true,
  ]);
  const ok = (v: boolean | { isActive: boolean } | null) => v === true || (typeof v === "object" && !!v?.isActive);
  if (!ok(c)) throw badRequest("Category not found or inactive");
  if (!ok(l)) throw badRequest("Lead source not found or inactive");
}

/**
 * ENQ-YYYY-0001. The UPDATE ... SET lastNo = lastNo + 1 takes a row lock held until the
 * transaction commits, so concurrent creates are serialised and never get duplicates.
 */
async function nextEnquiryNo(tx: Tx, year: number) {
  const bumped = await tx.enquirySequence.updateMany({ where: { year }, data: { lastNo: { increment: 1 } } });
  if (bumped.count === 0) {
    // First enquiry of the year (a concurrent first-insert would hit the PK -> 409, retry).
    await tx.enquirySequence.create({ data: { year, lastNo: 1 } });
  }
  const seq = await tx.enquirySequence.findUniqueOrThrow({ where: { year }, select: { lastNo: true } });
  return `ENQ-${year}-${String(seq.lastNo).padStart(4, "0")}`;
}
