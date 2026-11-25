import { body, query, route } from "@/lib/api";
import { createEnquiry, listEnquiries } from "@/lib/enquiries";
import { enquiryCreateSchema, enquiryListQuery } from "@/lib/validators";

export const GET = route(async ({ req, user }) => listEnquiries(user, query(req, enquiryListQuery)));

export const POST = route(async ({ req, user }) => {
  const created = await createEnquiry(user, await body(req, enquiryCreateSchema));
  return Response.json(created, { status: 201 });
});
