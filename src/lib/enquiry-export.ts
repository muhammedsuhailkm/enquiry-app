import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { z } from "zod";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { companyInfo, reportTimeZone } from "./company";
import { dateRange } from "./dates";
import { EnquiryReport, type ReportData } from "./pdf/enquiry-report";
import type { enquiryExportQuery } from "./validators";
import { flattenWorkTypes, workTypesSelect } from "./work-scope";

type ExportFilter = z.output<typeof enquiryExportQuery>;

/** Short status names for the report ("Quoted (Rev 2)" keeps the revision visible). */
const STATUS_NAME: Record<string, string> = {
  RECEIVED: "Received",
  QUOTED: "Quoted",
  ACCEPTED: "Won",
  REJECTED: "Lost",
  CANCELLED: "Cancelled",
};
const statusLabel = (status: string, rev: number) =>
  status === "QUOTED" && rev > 0 ? `Quoted (Rev ${rev})` : (STATUS_NAME[status] ?? status);

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "Salesperson: Asha · Status: Won · Date: 1 Nov 2026 – 30 Nov 2026", or the no-filter text. */
async function describeFilters(f: ExportFilter) {
  const parts: string[] = [];
  if (f.salespersonId) {
    const u = await prisma.user.findUnique({ where: { id: f.salespersonId }, select: { name: true } });
    parts.push(`Salesperson: ${u?.name ?? `#${f.salespersonId}`}`);
  }
  if (f.status) parts.push(`Status: ${STATUS_NAME[f.status]}`);
  if (f.from && f.to) parts.push(`Date: ${fmtDay(f.from)} – ${fmtDay(f.to)}`);
  else if (f.from) parts.push(`Date: from ${fmtDay(f.from)}`);
  else if (f.to) parts.push(`Date: up to ${fmtDay(f.to)}`);
  return parts.length ? parts.join("  ·  ") : "All Enquiries (No Filter Applied)";
}

async function loadLogo() {
  try {
    return await readFile(join(process.cwd(), "public", "logo.png"));
  } catch {
    return null; // report still renders, just without the logo
  }
}

/** Matching (non-deleted) enquiries, newest first, as a PDF report. */
export async function enquiriesPdf(f: ExportFilter) {
  const where: Prisma.EnquiryWhereInput = {
    isDeleted: false,
    ...(f.status ? { status: f.status } : {}),
    ...(f.salespersonId ? { salespersonId: f.salespersonId } : {}),
    ...(f.from || f.to ? { enquiryDate: dateRange(f.from, f.to) } : {}),
  };

  const [rows, filters, logo] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: [{ enquiryDate: "desc" }, { id: "desc" }],
      select: {
        enquiryNo: true,
        enquiryDate: true,
        status: true,
        revisionNo: true,
        customer: { select: { name: true, companyName: true } },
        workTypes: workTypesSelect,
        category: { select: { name: true } },
        leadSource: { select: { name: true } },
        salesperson: { select: { name: true } },
      },
    }),
    describeFilters(f),
    loadLogo(),
  ]);

  const counts = { total: rows.length, RECEIVED: 0, QUOTED: 0, ACCEPTED: 0, REJECTED: 0, CANCELLED: 0 };
  for (const r of rows) if (r.status in counts) counts[r.status as keyof typeof counts]++;

  const data: ReportData = {
    company: companyInfo(),
    logo,
    generatedAt: new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: reportTimeZone(),
    }),
    filters,
    counts,
    rows: rows.map((r) => ({
      enquiryNo: r.enquiryNo,
      date: r.enquiryDate.toISOString().slice(0, 10),
      // Company-first customers; old rows without a company fall back to the contact name.
      company: r.customer.companyName ?? r.customer.name,
      contact: r.customer.companyName ? r.customer.name : null,
      salesperson: r.salesperson.name,
      workTypes: flattenWorkTypes(r.workTypes).map((w) => w.name).join(", "),
      category: r.category.name,
      status: r.status,
      statusLabel: statusLabel(r.status, r.revisionNo),
      leadSource: r.leadSource.name,
    })),
  };

  const doc = createElement(EnquiryReport, data) as unknown as ReactElement<DocumentProps>;
  return { count: rows.length, pdf: await renderToBuffer(doc) };
}
