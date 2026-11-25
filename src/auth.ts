import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db";
import { burnVerifyTime, verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validators";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // A wrong password is normal traffic, not a server error: keep logs clean.
    error(error) {
      if (error.name === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, role: true, designation: true, isActive: true, passwordHash: true },
        });
        if (!user || !user.isActive) {
          await burnVerifyTime(password); // don't leak which emails exist via timing
          return null;
        }
        if (!(await verifyPassword(user.passwordHash, password))) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role as "ADMIN" | "EMPLOYEE",
          designation: user.designation,
        };
      },
    }),
  ],
});
