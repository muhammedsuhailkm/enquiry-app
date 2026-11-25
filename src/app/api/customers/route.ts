import { z } from "zod";
import { body, query, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { customerSchema } from "@/lib/validators";

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

const select = { id: true, name: true, companyName: true, phone: true, email: true } as const;

// Customers are shared master data: every logged-in user can search/add them.
export const GET = route(async ({ req }) => {
  const { q, take } = query(req, listQuery);
  return prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select,
    // company first, then contact; nulls first keeps the order SQL Server gave (Postgres defaults to nulls last)
    orderBy: [{ companyName: { sort: "asc", nulls: "first" } }, { name: "asc" }],

    take,
  });
});

export const POST = route(async ({ req, user }) => {
  const data = await body(req, customerSchema);
  const created = await prisma.customer.create({ data: { ...data, createdById: user.id }, select });
  return Response.json(created, { status: 201 });
});
