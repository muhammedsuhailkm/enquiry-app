import { body, intParam, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { defaultEmployeePassword } from "@/lib/users";
import { adminSetPasswordSchema } from "@/lib/validators";

/** Admin sets a user's password; omit `password` to reset it to DEFAULT_EMPLOYEE_PASSWORD. */
export const POST = route<{ id: string }>(
  async ({ req, params }) => {
    const { password } = await body(req, adminSetPasswordSchema);
    await prisma.user.update({
      where: { id: intParam(params.id) },
      data: { passwordHash: await hashPassword(password ?? defaultEmployeePassword()) },
      select: { id: true },
    });
    return { ok: true, resetToDefault: !password };
  },
  { admin: true },
);
