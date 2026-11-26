import { query, route } from "@/lib/api";
import { enquiriesPdf } from "@/lib/enquiry-export";
import { todayIso } from "@/lib/dates";
import { enquiryExportQuery } from "@/lib/validators";

/** Admin: download the Enquiry Status & Performance Report (PDF), filtered by ?salespersonId= &status= &from= &to= (all optional). */
export const GET = route(
  async ({ req }) => {
    const f = query(req, enquiryExportQuery);
    const { pdf } = await enquiriesPdf(f);
    const span = f.from || f.to ? `${f.from ?? "start"}_to_${f.to ?? todayIso()}` : todayIso();
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="enquiry-report_${span}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { admin: true },
);
