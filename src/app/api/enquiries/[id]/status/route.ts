import { body, intParam, route } from "@/lib/api";
import { changeStatus } from "@/lib/enquiry-workflow";
import { statusChangeSchema } from "@/lib/validators";

export const POST = route<{ id: string }>(async ({ req, params, user }) => {
  const input = await body(req, statusChangeSchema);
  return changeStatus(user, intParam(params.id), {
    to: input.to,
    remarks: input.remarks,
    lostReason: input.lostReason,
    quoteNo: input.quoteNo,
  });
});
