import { body, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { defaultEmployeePassword, publicUserSelect } from "@/lib/users";
import { employeeCreateSchema } from "@/lib/validators";

export const GET = route(
  async () => prisma.user.findMany({ select: publicUserSelect, orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
  { admin: true },
);

export const POST = route(
  async ({ req }) => {
    const { password, ...data } = await body(req, employeeCreateSchema);
    const passwordHash = await hashPassword(password ?? defaultEmployeePassword());
    const created = await prisma.user.create({ data: { ...data, passwordHash }, select: publicUserSelect });
    return Response.json({ ...created, usedDefaultPassword: !password }, { status: 201 });
  },
  { admin: true },
);
