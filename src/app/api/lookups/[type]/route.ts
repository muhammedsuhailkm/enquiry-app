import { body, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { lookupDelegate } from "@/lib/lookups";
import { lookupCreateSchema } from "@/lib/validators";

export const POST = route<{ type: string }>(
  async ({ req, params }) => {
    const delegate = lookupDelegate(params.type);
    const { name } = await body(req, lookupCreateSchema);
    const select = { id: true, name: true, isActive: true } as const;
    // New work types go to the end of the ordered list (categories / lead sources sort by name).
    const created =
      params.type === "work-types"
        ? await prisma.workType.create({
            data: { name, sortOrder: ((await prisma.workType.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1 },
            select,
          })
        : await delegate.create({ data: { name }, select });
    return Response.json(created, { status: 201 });
  },
  { admin: true },
);
