import "server-only";
import { prisma } from "./db";
import { badRequest, conflict, forbidden, notFound, type CurrentUser } from "./api";
import { enquiryScope, isAdmin } from "./authz";
import { CLOSED_STATUSES, TRANSITIONS, type EnquiryStatus } from "./constants";

export type StatusAction = "QUOTE" | "REVISE" | "ACCEPT" | "REJECT" | "CANCEL" | "REOPEN";

/** UI-facing list of actions allowed for this user on this enquiry right now. */
export function allowedActions(user: CurrentUser, status: string): { action: StatusAction; to: string }[] {
  const s = status as EnquiryStatus;
  if (CLOSED_STATUSES.includes(s)) return isAdmin(user) ? [{ action: "REOPEN", to: "REOPEN" }] : [];
  return (TRANSITIONS[s] ?? []).map((to) => ({
    to,
    action:
      to === "QUOTED"
        ? s === "QUOTED"
          ? "REVISE"
          : "QUOTE"
        : to === "ACCEPTED"
          ? "ACCEPT"
          : to === "REJECTED"
            ? "REJECT"
            : "CANCEL",
  }));
}

/**
 * Move an enquiry to a new status. Uses a conditional UPDATE (status + revisionNo must
 * still match what we read) so concurrent clicks can't double-apply: 0 rows -> 409.
 */
export async function changeStatus(
  user: CurrentUser,
  enquiryId: number,
  input: { to: EnquiryStatus; remarks: string | null; lostReason: string | null; quoteNo: string | null },
) {
  if (input.to === "QUOTED" && !input.quoteNo) throw badRequest("Quote number is required when quoting or revising");

  return prisma.$transaction(async (tx) => {
    const enq = await tx.enquiry.findFirst({
      where: { id: enquiryId, ...enquiryScope(user) },
      select: { status: true, revisionNo: true, quoteNo: true },
    });
    if (!enq) throw notFound("Enquiry not found");

    const from = enq.status as EnquiryStatus;
    if (CLOSED_STATUSES.includes(from)) throw conflict(`Enquiry is already ${from}; only an admin can reopen it`);
    if (!TRANSITIONS[from].includes(input.to)) throw badRequest(`Cannot change status from ${from} to ${input.to}`);

    const isRevision = from === "QUOTED" && input.to === "QUOTED";
    const revisionNo = isRevision ? enq.revisionNo + 1 : enq.revisionNo;
    const closing = CLOSED_STATUSES.includes(input.to);
    // Quoting / revising sets the Zoho quote number (a revision may keep or change it);
    // every other move keeps the current one so accept / reject is tied to that quote.
    const quoteNo = input.to === "QUOTED" ? input.quoteNo : enq.quoteNo;

    const res = await tx.enquiry.updateMany({
      where: { id: enquiryId, status: from, revisionNo: enq.revisionNo, isDeleted: false },
      data: {
        status: input.to,
        revisionNo,
        quoteNo,
        closedAt: closing ? new Date() : null,
        lostReason: input.to === "REJECTED" ? input.lostReason : null,
      },
    });
    if (res.count === 0) throw conflict("Enquiry was changed by someone else; reload and try again");

    await tx.enquiryStatusHistory.create({
      data: {
        enquiryId,
        action: isRevision ? "REVISE" : "CHANGE",
        fromStatus: from,
        toStatus: input.to,
        revisionNo,
        quoteNo,
        remarks: input.to === "REJECTED" ? joinRemarks(input.lostReason, input.remarks) : input.remarks,
        changedById: user.id,
      },
    });
    return { id: enquiryId, status: input.to, revisionNo, quoteNo };
  });
}

/** Admin-only: reopen a closed enquiry back to the status it had before closing. */
export async function reopen(user: CurrentUser, enquiryId: number, remarks: string) {
  if (!isAdmin(user)) throw forbidden("Only an admin can reopen an enquiry");
  return prisma.$transaction(async (tx) => {
    const enq = await tx.enquiry.findFirst({
      where: { id: enquiryId, isDeleted: false },
      select: { status: true, revisionNo: true, quoteNo: true },
    });
    if (!enq) throw notFound("Enquiry not found");
    const current = enq.status as EnquiryStatus;
    if (!CLOSED_STATUSES.includes(current)) throw conflict("Enquiry is not closed");

    // The history row that closed it tells us where it came from.
    const closingRow = await tx.enquiryStatusHistory.findFirst({
      where: { enquiryId, toStatus: current },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
      select: { fromStatus: true },
    });
    const back = (closingRow?.fromStatus as EnquiryStatus | null) ?? "QUOTED";

    const res = await tx.enquiry.updateMany({
      where: { id: enquiryId, status: current },
      data: { status: back, closedAt: null, lostReason: null },
    });
    if (res.count === 0) throw conflict("Enquiry was changed by someone else; reload and try again");

    await tx.enquiryStatusHistory.create({
      data: {
        enquiryId,
        action: "REOPEN",
        fromStatus: current,
        toStatus: back,
        revisionNo: enq.revisionNo,
        quoteNo: enq.quoteNo,
        remarks,
        changedById: user.id,
      },
    });
    return { id: enquiryId, status: back, revisionNo: enq.revisionNo };
  });
}

function joinRemarks(lostReason: string | null, remarks: string | null) {
  return [lostReason && `Lost reason: ${lostReason}`, remarks].filter(Boolean).join(" | ") || null;
}
