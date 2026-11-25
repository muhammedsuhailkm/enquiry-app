import NextAuth from "next-auth";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// Use the *inline* middleware form `auth(request, event)`: it runs the `authorized`
// callback in auth.config.ts and redirects to /login when it returns false.
// (The wrapper form `auth(handler)` ignores a `false` result - verified in next-auth source.)
// Cast: TS resolves the wrong overload of `auth` for (NextRequest, NextFetchEvent).
const middleware = auth as unknown as NextMiddleware;

// Page-level guard only. API routes do their own auth and return JSON 401/403.
// Next 16 requires a statically detectable function export named `proxy`.
export function proxy(request: NextRequest, event: NextFetchEvent) {
  return middleware(request, event);
}

// Also skip files from /public (any path with an extension, e.g. /logo.png) so they load
// before sign-in. App routes never contain a dot, so they're all still guarded.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
