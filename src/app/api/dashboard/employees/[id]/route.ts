import { intParam, notFound, query, route } from "@/lib/api";
import { dashboard } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { publicUserSelect } from "@/lib/users";
import { dateRangeQuery } from "@/lib/validators";

export const GET = route<{ id: string }>(
  async ({ req, params }) => {
    const id = intParam(params.id);
    const { from, to } = query(req, dateRangeQuery);
    const [employee, stats] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: publicUserSelect }),
      dashboard({ salespersonId: id, from, to }),
    ]);
    if (!employee) throw notFound("User not found");
    return { employee, ...stats };
  },
  { admin: true },
);
