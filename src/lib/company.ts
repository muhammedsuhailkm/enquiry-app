import "server-only";

/**
 * Company details printed on reports (PDF header). Set in .env; blank values are simply left out.
 * The logo is public/logo.png.
 */
export function companyInfo() {
  const v = (k: string) => process.env[k]?.trim() || undefined;
  return {
    name: v("COMPANY_NAME") ?? "V-Decor",
    tagline: v("COMPANY_TAGLINE"),
    phone: v("COMPANY_PHONE"),
    email: v("COMPANY_EMAIL"),
    website: v("COMPANY_WEBSITE"),
    address: v("COMPANY_ADDRESS"),
  };
}

export type CompanyInfo = ReturnType<typeof companyInfo>;

/** Time zone for timestamps printed on reports (servers usually run in UTC). */
export const reportTimeZone = () => process.env.REPORT_TIME_ZONE?.trim() || "Asia/Qatar";
