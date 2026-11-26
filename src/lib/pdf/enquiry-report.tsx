// Enquiry Status & Performance Report (PDF, A4 landscape) rendered with @react-pdf/renderer.
// Colours here are fixed print colours (always on white paper), so this folder is excluded
// from `npm run lint:colors`, which guards the light/dark UI theme.
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CompanyInfo } from "../company";

// Wrap whole words only (no "Sports Infra-structure" hyphenation).
Font.registerHyphenationCallback((word) => [word]);

export type ReportRow = {
  enquiryNo: string;
  date: string; // YYYY-MM-DD
  company: string;
  contact: string | null;
  salesperson: string;
  workTypes: string;
  category: string;
  status: string; // RECEIVED | QUOTED | ACCEPTED | REJECTED | CANCELLED
  statusLabel: string;
  leadSource: string;
};

export type ReportData = {
  company: CompanyInfo;
  logo: Buffer | null;
  generatedAt: string;
  filters: string;
  counts: { total: number; RECEIVED: number; QUOTED: number; ACCEPTED: number; REJECTED: number; CANCELLED: number };
  rows: ReportRow[];
};

const C = {
  brand: "#1f3a68",
  text: "#1f2937",
  muted: "#6b7280",
  rule: "#d1d5db",
  rowAlt: "#f6f8fb",
  white: "#ffffff",
};

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: "#2563eb",
  QUOTED: "#b45309",
  ACCEPTED: "#047857",
  REJECTED: "#dc2626",
  CANCELLED: "#6b7280",
};

// Column widths (pt). Customer takes the remaining space. Usable width = 842 - 2*28 = 786.
const COLS = [
  { key: "no", label: "No.", width: 30 },
  { key: "date", label: "Date", width: 60 },
  { key: "enquiryNo", label: "Enquiry No.", width: 80 },
  { key: "customer", label: "Customer", flex: 1 },
  { key: "salesperson", label: "Sales Person", width: 92 },
  { key: "workTypes", label: "Work Type", width: 112 },
  { key: "category", label: "Category", width: 78 },
  { key: "status", label: "Status", width: 76 },
  { key: "leadSource", label: "Lead Source", width: 84 },
] as const;

const PAGE_PAD = 28;
const HEAD_H = 22; // column header row height (fixed, so the space reserved below matches exactly)
const CONT_HEADER_TOP = PAGE_PAD; // where the repeated column header sits on pages 2+
const CONT_HEADER_SPACE = HEAD_H; // extra top space reserved on every page for that header

const s = StyleSheet.create({
  page: {
    paddingTop: PAGE_PAD + CONT_HEADER_SPACE,
    paddingBottom: PAGE_PAD + 14,
    paddingHorizontal: PAGE_PAD,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: C.text,
  },
  // Page 1 content starts higher: it doesn't need the space reserved for the repeated header.
  first: { marginTop: -CONT_HEADER_SPACE },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, objectFit: "contain" },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 20, color: C.brand, letterSpacing: 0.5 },
  tagline: { fontSize: 9, color: C.muted, marginTop: 2 },
  contact: { fontSize: 8.5, color: C.muted, textAlign: "right", lineHeight: 1.5 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.rule, marginTop: 10, marginBottom: 10 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 15 },
  filters: { fontSize: 8.5, color: C.muted, marginTop: 3 },
  generated: { fontSize: 8.5, color: C.muted },

  kpis: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 12 },
  kpi: { flex: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 9 },
  kpiLabel: { fontSize: 8 },
  kpiValue: { fontFamily: "Helvetica-Bold", fontSize: 15, marginTop: 2 },
  kpiSub: { fontSize: 7, marginTop: 1, opacity: 0.85 },

  thead: { flexDirection: "row", alignItems: "center", height: HEAD_H, backgroundColor: C.brand },
  th: { color: C.white, fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.rule },
  td: { paddingVertical: 5, paddingHorizontal: 5, borderRightWidth: 0.5, borderRightColor: C.rule },
  tdLast: { borderRightWidth: 0 },
  bold: { fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  empty: { paddingVertical: 24, textAlign: "center", color: C.muted },

  contHeader: { position: "absolute", top: CONT_HEADER_TOP, left: PAGE_PAD, right: PAGE_PAD },
  footer: {
    position: "absolute",
    bottom: PAGE_PAD - 8,
    left: PAGE_PAD,
    right: PAGE_PAD,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: C.muted,
  },
});

const colStyle = (c: (typeof COLS)[number]) => ("flex" in c ? { flex: c.flex } : { width: c.width });

function TableHeader() {
  return (
    <View style={s.thead}>
      {COLS.map((c) => (
        <Text key={c.key} style={[s.th, colStyle(c)]}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

function Kpi({ label, value, sub, bg, fg }: { label: string; value: string | number; sub?: string; bg: string; fg: string }) {
  return (
    <View style={[s.kpi, { backgroundColor: bg }]}>
      <Text style={[s.kpiLabel, { color: fg }]}>{label}</Text>
      <Text style={[s.kpiValue, { color: fg }]}>{value}</Text>
      {sub ? <Text style={[s.kpiSub, { color: fg }]}>{sub}</Text> : null}
    </View>
  );
}

export function EnquiryReport({ company, logo, generatedAt, filters, counts, rows }: ReportData) {
  const open = counts.RECEIVED + counts.QUOTED;
  const decided = counts.ACCEPTED + counts.REJECTED;
  const winRate = decided ? `${Math.round((counts.ACCEPTED / decided) * 1000) / 10}%` : "—";
  const contactLines = [
    [company.phone && `Tel: ${company.phone}`, company.email && `Email: ${company.email}`].filter(Boolean).join("  |  "),
    [company.website && `Web: ${company.website}`, company.address].filter(Boolean).join("  |  "),
  ].filter(Boolean);

  return (
    <Document title="Enquiry Status & Performance Report" author={company.name} creator={company.name}>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Column header repeated at the top of pages 2+ (page 1 has its own, below the summary). */}
        <View style={s.contHeader} fixed render={({ pageNumber }) => (pageNumber > 1 ? <TableHeader /> : null)} />

        <View style={s.first}>
          <View style={s.header}>
            <View style={s.brand}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
              {logo ? <Image src={{ data: logo, format: "png" }} style={s.logo} /> : null}
              <View>
                <Text style={s.companyName}>{company.name.toUpperCase()}</Text>
                {company.tagline ? <Text style={s.tagline}>{company.tagline}</Text> : null}
              </View>
            </View>
            {contactLines.length ? (
              <View>
                {contactLines.map((l) => (
                  <Text key={l} style={s.contact}>
                    {l}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          <View style={s.rule} />

          <View style={s.titleRow}>
            <View>
              <Text style={s.title}>Enquiry Status & Performance Report</Text>
              <Text style={s.filters}>Filters: {filters}</Text>
            </View>
            <Text style={s.generated}>Generated: {generatedAt}</Text>
          </View>

          <View style={s.kpis}>
            <Kpi label="Total Enquiries" value={counts.total} bg="#eef2fb" fg={C.brand} />
            <Kpi label="Open" value={open} sub={`Received ${counts.RECEIVED}  ·  Quoted ${counts.QUOTED}`} bg="#fef3c7" fg="#92400e" />
            <Kpi label="Won" value={counts.ACCEPTED} sub={`Win rate ${winRate}`} bg="#ecfdf5" fg="#047857" />
            <Kpi label="Lost" value={counts.REJECTED} bg="#fef2f2" fg="#b91c1c" />
            <Kpi label="Cancelled" value={counts.CANCELLED} bg="#f3f4f6" fg="#4b5563" />
          </View>

          <TableHeader />
        </View>

        {rows.length === 0 ? (
          <Text style={s.empty}>No enquiries match these filters.</Text>
        ) : (
          rows.map((r, i) => (
            <View key={r.enquiryNo} style={[s.tr, i % 2 ? { backgroundColor: C.rowAlt } : {}]} wrap={false}>
              <Text style={[s.td, colStyle(COLS[0]), { textAlign: "center" }]}>{i + 1}</Text>
              <Text style={[s.td, colStyle(COLS[1])]}>{r.date}</Text>
              <Text style={[s.td, colStyle(COLS[2]), s.bold]}>{r.enquiryNo}</Text>
              <View style={[s.td, colStyle(COLS[3])]}>
                <Text>{r.company}</Text>
                {r.contact ? <Text style={s.sub}>{r.contact}</Text> : null}
              </View>
              <Text style={[s.td, colStyle(COLS[4])]}>{r.salesperson}</Text>
              <Text style={[s.td, colStyle(COLS[5])]}>{r.workTypes}</Text>
              <Text style={[s.td, colStyle(COLS[6])]}>{r.category}</Text>
              <Text style={[s.td, colStyle(COLS[7]), s.bold, { color: STATUS_COLOR[r.status] ?? C.text }]}>{r.statusLabel}</Text>
              <Text style={[s.td, s.tdLast, colStyle(COLS[8])]}>{r.leadSource}</Text>
            </View>
          ))
        )}

        <View style={s.footer} fixed>
          <Text>
            {company.name} · Enquiry Status & Performance Report · {generatedAt}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
