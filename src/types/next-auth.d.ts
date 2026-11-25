import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
  interface User {
    role: Role;
    designation: string;
  }
  interface Session {
    user: { id: string; role: Role; designation: string } & DefaultSession["user"];
  }
}

// next-auth v5 beta re-exports JWT from @auth/core, so augment the source module.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    designation: string;
  }
}
