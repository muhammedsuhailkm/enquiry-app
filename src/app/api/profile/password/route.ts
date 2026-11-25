import { badRequest, body, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema } from "@/lib/validators";

export const POST = route(async ({ req, user }) => {
  const { currentPassword, newPassword } = await body(req, changePasswordSchema);
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(row.passwordHash, currentPassword))) throw badRequest("Current password is incorrect");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
    select: { id: true },
  });
  return { ok: true };
});
