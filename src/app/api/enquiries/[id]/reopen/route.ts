import { body, intParam, route } from "@/lib/api";
import { reopen } from "@/lib/enquiry-workflow";
import { reopenSchema } from "@/lib/validators";

export const POST = route<{ id: string }>(
  async ({ req, params, user }) => {
    const { remarks } = await body(req, reopenSchema);
    return reopen(user, intParam(params.id), remarks);
  },
  { admin: true },
);
