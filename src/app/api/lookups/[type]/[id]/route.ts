import { body, intParam, route } from "@/lib/api";
import { lookupDelegate } from "@/lib/lookups";
import { lookupUpdateSchema } from "@/lib/validators";

// No DELETE: lookups referenced by enquiries are deactivated (isActive=false) instead.
export const PATCH = route<{ type: string; id: string }>(
  async ({ req, params }) => {
    const delegate = lookupDelegate(params.type);
    const data = await body(req, lookupUpdateSchema);
    return delegate.update({
      where: { id: intParam(params.id) },
      data,
      select: { id: true, name: true, isActive: true },
    });
  },
  { admin: true },
);
