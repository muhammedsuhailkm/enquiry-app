// Shared constants (safe to import from client and server).
export const ROLES = ["ADMIN", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const ENQUIRY_STATUSES = ["RECEIVED", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const OPEN_STATUSES: readonly EnquiryStatus[] = ["RECEIVED", "QUOTED"];
export const CLOSED_STATUSES: readonly EnquiryStatus[] = ["ACCEPTED", "REJECTED", "CANCELLED"];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  RECEIVED: "Received (New)",
  QUOTED: "Quoted (Pending decision)",
  ACCEPTED: "Accepted (Won)",
  REJECTED: "Rejected (Lost)",
  CANCELLED: "Cancelled / No response",
};

/** Single source of truth for allowed status changes (QUOTED -> QUOTED = revised quote). */
export const TRANSITIONS: Record<EnquiryStatus, readonly EnquiryStatus[]> = {
  RECEIVED: ["QUOTED", "CANCELLED"],
  QUOTED: ["ACCEPTED", "REJECTED", "QUOTED", "CANCELLED"],
  ACCEPTED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const HISTORY_ACTIONS = ["CREATE", "CHANGE", "REVISE", "REOPEN"] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

export const LOOKUP_TYPES = ["work-types", "categories", "lead-sources"] as const;
export type LookupType = (typeof LOOKUP_TYPES)[number];

export function statusDisplay(status: string, revisionNo: number) {
  if (status === "QUOTED" && revisionNo > 0) return `Quoted (Rev ${revisionNo})`;
  return STATUS_LABELS[status as EnquiryStatus] ?? status;
}
