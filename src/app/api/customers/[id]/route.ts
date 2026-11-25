import { body, intParam, notFound, route } from "@/lib/api";
import { prisma } from "@/lib/db";
import { customerUpdateSchema } from "@/lib/validators";

type P = { id: string };

export const GET = route<P>(async ({ params }) => {
  const c = await prisma.customer.findUnique({ where: { id: intParam(params.id) } });
  if (!c) throw notFound("Customer not found");
  return c;
});

export const PATCH = route<P>(async ({ req, params }) => {
  const data = await body(req, customerUpdateSchema);
  return prisma.customer.update({ where: { id: intParam(params.id) }, data });
});
