import { body, intParam, route } from "@/lib/api";
import { updateWorkScope } from "@/lib/enquiries";
import { workScopeSchema } from "@/lib/validators";

/** Replace the enquiry's work types + sub work types. Body: { workTypeIds: number[], subWorkTypeIds?: number[] }. */
export const PUT = route<{ id: string }>(async ({ req, params, user }) =>
  updateWorkScope(user, intParam(params.id), await body(req, workScopeSchema)),
);
