import "server-only";
import { badRequest } from "./api";

/** Never return passwordHash: every user query uses this select. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  designation: true,
  phone: true,
  isActive: true,
  createdAt: true,
} as const;

export function defaultEmployeePassword() {
  const p = process.env.DEFAULT_EMPLOYEE_PASSWORD;
  if (!p || p.length < 8) throw badRequest("DEFAULT_EMPLOYEE_PASSWORD is not configured (min 8 chars) - provide a password");
  return p;
}
