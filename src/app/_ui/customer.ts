import type { Json } from "./api";

/**
 * Customers are companies first: the company name is what we show as "the customer",
 * the person is the contact under it. Older customers saved without a company fall back to
 * the contact name. Use this everywhere a customer is displayed so the order stays consistent.
 */
export function customerLabel(c: Json): { title: string; contact: string | null } {
  const company = c?.companyName?.trim();
  return company ? { title: company, contact: c.name ?? null } : { title: c?.name ?? "—", contact: null };
}
