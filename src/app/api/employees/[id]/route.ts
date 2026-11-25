import { badRequest, body, intParam, notFound, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { publicUserSelect } from "@/lib/users";
import { employeeUpdateSchema } from "@/lib/validators";

type P = { id: string };

export const GET = route<P>(
  async ({ params }) => {
    const u = await prisma.user.findUnique({ where: { id: intParam(params.id) }, select: publicUserSelect });
    if (!u) throw notFound("User not found");
    return u;
  },
  { admin: true },
);

export const PATCH = route<P>(
  async ({ req, params, user }) => {
    const id = intParam(params.id);
    const data = await body(req, employeeUpdateSchema);
    // Lock-out protection: an admin can't deactivate or demote themselves.
    if (id === user.id && (data.isActive === false || (data.role && data.role !== "ADMIN"))) {
      throw badRequest("You cannot deactivate or demote your own account");
    }
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },
  { admin: true },
);
