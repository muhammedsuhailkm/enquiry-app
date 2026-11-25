import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "./db";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "./constants";

export type CurrentUser = { id: number; name: string; role: Role; designation: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, details);
export const forbidden = (msg = "Forbidden") => new ApiError(403, msg);
export const notFound = (msg = "Not found") => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);

/**
 * Resolve the logged-in user from the JWT session, then re-check the DB row so that
 * deactivation / role changes take effect immediately (one PK lookup per request).
 */
async function currentUser(): Promise<CurrentUser> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!id) throw new ApiError(401, "Not authenticated");
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true, designation: true, isActive: true },
  });
  if (!user || !user.isActive) throw new ApiError(401, "Account inactive or missing");
  return { id: user.id, name: user.name, role: user.role as Role, designation: user.designation };
}

type Handler<P> = (ctx: { req: NextRequest; params: P; user: CurrentUser }) => Promise<unknown>;

/** Wrap a route handler: auth (+ optional admin check), JSON response, uniform errors. */
export function route<P = Record<string, string>>(handler: Handler<P>, opts: { admin?: boolean } = {}) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      const user = await currentUser();
      if (opts.admin && user.role !== "ADMIN") throw forbidden("Admin only");
      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await handler({ req, params, user });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      // Let Next.js internal control-flow errors (dynamic bail-out during prerender,
      // redirect, notFound) propagate instead of turning them into a JSON error.
      unstable_rethrow(e);
      return errorResponse(e);
    }
  };
}

function errorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", details: z.flattenError(e) }, { status: 400 });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return NextResponse.json({ error: "Duplicate value", details: e.meta }, { status: 409 });
    if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e.code === "P2003") return NextResponse.json({ error: "Invalid reference", details: e.meta }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Parse a JSON body with a zod schema (throws 400 on invalid JSON / schema). */
export async function body<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.output<T>> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
  return schema.parse(data);
}

/** Parse URL search params with a zod schema. */
export function query<T extends z.ZodType>(req: NextRequest, schema: T): z.output<T> {
  const obj = Object.fromEntries(
    [...req.nextUrl.searchParams.entries()].filter(([, v]) => v !== ""),
  );
  return schema.parse(obj);
}

/** Parse a numeric route param. */
export function intParam(v: string | undefined): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
}
