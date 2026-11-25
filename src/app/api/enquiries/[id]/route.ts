import { body, intParam, route } from "@/lib/api";
import { deleteEnquiry, getEnquiry, updateEnquiry } from "@/lib/enquiries";
import { enquiryUpdateSchema } from "@/lib/validators";

type P = { id: string };

export const GET = route<P>(async ({ params, user }) => getEnquiry(user, intParam(params.id)));

export const PATCH = route<P>(async ({ req, params, user }) =>
  updateEnquiry(user, intParam(params.id), await body(req, enquiryUpdateSchema)),
);

export const DELETE = route<P>(async ({ params, user }) => deleteEnquiry(user, intParam(params.id)));
