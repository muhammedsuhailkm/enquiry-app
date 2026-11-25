import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "./api";

export const isAdmin = (u: CurrentUser) => u.role === "ADMIN";

/**
 * Row-level scope for every enquiry query. Employees only ever see their own
 * (salesperson) enquiries; anything else is a 404, not a 403, to avoid leaking IDs.
 */
export function enquiryScope(user: CurrentUser): Prisma.EnquiryWhereInput {
  return isAdmin(user) ? { isDeleted: false } : { isDeleted: false, salespersonId: user.id };
}
