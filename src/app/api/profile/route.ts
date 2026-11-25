import { body, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { publicUserSelect } from "@/lib/users";
import { profileUpdateSchema } from "@/lib/validators";

export const GET = route(async ({ user }) =>
  prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUserSelect }),
);

// Email and role are admin-managed; users edit only their own name/designation/phone.
export const PATCH = route(async ({ req, user }) => {
  const data = await body(req, profileUpdateSchema);
  return prisma.user.update({ where: { id: user.id }, data, select: publicUserSelect });
});
