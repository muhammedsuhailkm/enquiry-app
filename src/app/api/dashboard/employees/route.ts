import { query, route } from "@/lib/api";
import { employeePerformance } from "@/lib/analytics";
import { dateRangeQuery } from "@/lib/validators";

export const GET = route(
  async ({ req }) => {
    const { from, to } = query(req, dateRangeQuery);
    return employeePerformance({ from, to });
  },
  { admin: true },
);
