import { badRequest, body, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { subWorkTypeCreateSchema } from "@/lib/validators";

const select = { id: true, workTypeId: true, name: true, isActive: true, sortOrder: true } as const;

/** Admin: add a sub work type under a work type (appended to the end of that list). */
export const POST = route(
  async ({ req }) => {
    const { workTypeId, name } = await body(req, subWorkTypeCreateSchema);
    const created = await prisma.$transaction(async (tx) => {
      const parent = await tx.workType.findUnique({ where: { id: workTypeId }, select: { id: true } });
      if (!parent) throw badRequest("Work type not found");
      const last = await tx.subWorkType.aggregate({ where: { workTypeId }, _max: { sortOrder: true } });
      return tx.subWorkType.create({ data: { workTypeId, name, sortOrder: (last._max.sortOrder ?? 0) + 1 }, select });
    });
    return Response.json(created, { status: 201 });
  },
  { admin: true },
);
