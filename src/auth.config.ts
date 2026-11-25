import type { NextAuthConfig } from "next-auth";

// Light config shared by proxy.ts (no Prisma / argon2 imports here).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8h working session
  providers: [], // added in auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const loggedIn = !!auth?.user;

      if (pathname === "/login") {
        return loggedIn ? Response.redirect(new URL("/dashboard", request.nextUrl)) : true;
      }
      if (!loggedIn) return false; // -> redirect to /login
      const adminOnly = pathname.startsWith("/employees") || pathname.startsWith("/lookups");
      if (adminOnly && auth.user.role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.designation = user.designation;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.designation = token.designation;
      return session;
    },
  },
} satisfies NextAuthConfig;
