import { body, intParam, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { subWorkTypeUpdateSchema } from "@/lib/validators";

// No DELETE: sub work types referenced by enquiries are deactivated (isActive=false) instead.
export const PATCH = route<{ id: string }>(
  async ({ req, params }) =>
    prisma.subWorkType.update({
      where: { id: intParam(params.id) },
      data: await body(req, subWorkTypeUpdateSchema),
      select: { id: true, workTypeId: true, name: true, isActive: true, sortOrder: true },
    }),
  { admin: true },
);
