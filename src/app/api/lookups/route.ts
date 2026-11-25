import { z } from "zod";
import { query, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/authz";

const q = z.object({ includeInactive: z.enum(["true", "false"]).optional() });
const select = { id: true, name: true, isActive: true } as const;

/**
 * All dropdown lists in one call. Work types carry their sub work types (one extra query, joined
 * by Prisma - no N+1). Inactive entries only for admins (for management).
 */
export const GET = route(async ({ req, user }) => {
  const all = isAdmin(user) && query(req, q).includeInactive === "true";
  const where = all ? undefined : { isActive: true };
  const orderBy = { name: "asc" } as const;
  const sorted = [{ sortOrder: "asc" }, { name: "asc" }] as const;
  const [workTypes, categories, leadSources] = await Promise.all([
    prisma.workType.findMany({
      where,
      orderBy: [...sorted],
      select: { ...select, subWorkTypes: { where, orderBy: [...sorted], select } },
    }),
    prisma.category.findMany({ where, select, orderBy }),
    prisma.leadSource.findMany({ where, select, orderBy }),
  ]);
  return { workTypes, categories, leadSources };
});
