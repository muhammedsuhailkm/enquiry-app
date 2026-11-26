import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "./api";

export const isAdmin = (u: CurrentUser) => u.role === "ADMIN";

/**
 * Row-level scope for every enquiry query. Since 2026-11-26 every user can view and edit every
 * (non-deleted) enquiry; only deleting is admin-only (see canDelete in enquiries.ts).
 */
export function enquiryScope(): Prisma.EnquiryWhereInput {
  return { isDeleted: false };
}
