import { query, route } from "@/lib/api";
import { dashboard } from "@/lib/analytics";
import { isAdmin } from "@/lib/authz";
import { dateRangeQuery } from "@/lib/validators";

/** Admin: whole company (optionally ?salespersonId=). Employee: always their own numbers. */
export const GET = route(async ({ req, user }) => {
  const q = query(req, dateRangeQuery);
  const salespersonId = isAdmin(user) ? q.salespersonId : user.id;
  return { scope: salespersonId ? "salesperson" : "all", salespersonId, ...(await dashboard({ ...q, salespersonId })) };
});
