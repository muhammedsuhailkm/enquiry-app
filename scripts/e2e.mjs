// End-to-end API test. Usage: node scripts/e2e.mjs [baseUrl]
// Needs a running app (npm run dev / npm start) and the seeded admin from .env.
import "dotenv/config";

const BASE = process.argv[2] ?? "http://localhost:5678";
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD };
const DEFAULT_PW = process.env.DEFAULT_EMPLOYEE_PASSWORD;
const stamp = Date.now().toString(36);
let failures = 0;

function check(cond, label, extra) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && extra !== undefined ? "  -> " + JSON.stringify(extra) : ""}`);
  if (!cond) failures++;
}

class Client {
  jar = new Map();
  cookie() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  store(res) {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      this.jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
  }
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { cookie: this.cookie(), ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    this.store(res);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json };
  }
  get = (p) => this.req("GET", p);
  post = (p, b = {}) => this.req("POST", p, b);
  patch = (p, b) => this.req("PATCH", p, b);
  del = (p) => this.req("DELETE", p);

  async login(email, password) {
    this.jar.clear();
    const csrf = await this.get("/api/auth/csrf");
    const res = await fetch(BASE + "/api/auth/callback/credentials", {
      method: "POST",
      redirect: "manual",
      headers: { cookie: this.cookie(), "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.json.csrfToken, email, password }),
    });
    this.store(res);
    return [...this.jar.keys()].some((k) => k.includes("session-token"));
  }
}

const admin = new Client();
const a = new Client();
const b = new Client();

// 1. auth + employees
check((await new Client().get("/api/enquiries")).status === 401, "unauthenticated API -> 401");
check(!(await new Client().login(ADMIN.email, "wrong-password")), "wrong password rejected");
check(await admin.login(ADMIN.email, ADMIN.password), "admin login");

const ea = await admin.post("/api/employees", { name: "Emp A", email: `a.${stamp}@test.local`, designation: "Sales Engineer" });
const eb = await admin.post("/api/employees", { name: "Emp B", email: `b.${stamp}@test.local`, designation: "Sales Exec" });
check(ea.status === 201 && ea.json.usedDefaultPassword && !("passwordHash" in ea.json), "create employee A (default pw, no hash leaked)", ea);
check(eb.status === 201, "create employee B");
check((await admin.post("/api/employees", { name: "dup", email: `a.${stamp}@test.local`, designation: "x" })).status === 409, "duplicate email -> 409");

check(await a.login(`a.${stamp}@test.local`, DEFAULT_PW), "employee A logs in with default password");
const pw = await a.post("/api/profile/password", { currentPassword: DEFAULT_PW, newPassword: "NewPass@A1" });
check(pw.status === 200, "A changes own password", pw);
check((await a.post("/api/profile/password", { currentPassword: "bad", newPassword: "Other@123" })).status === 400, "wrong current password -> 400");
check(await a.login(`a.${stamp}@test.local`, "NewPass@A1"), "A logs in with new password");

check((await admin.post(`/api/employees/${eb.json.id}/password`, { password: "AdminSet@B1" })).status === 200, "admin sets B password");
check(await b.login(`b.${stamp}@test.local`, "AdminSet@B1"), "B logs in with admin-set password");
check((await b.get("/api/employees")).status === 403, "employee -> /api/employees 403");

// 2. lookups
const wt = await admin.post("/api/lookups/work-types", { name: `Fit-out ${stamp}` });
const cat = await admin.post("/api/lookups/categories", { name: `Commercial ${stamp}` });
const ls = await admin.post("/api/lookups/lead-sources", { name: `Website ${stamp}` });
check(wt.status === 201 && cat.status === 201 && ls.status === 201, "admin creates lookups");
check((await a.post("/api/lookups/work-types", { name: "x" })).status === 403, "employee cannot create lookups");
const base = { workTypeIds: [wt.json.id], categoryId: cat.json.id, leadSourceId: ls.json.id, scopeOfWork: "Supply and install" };

// 3. enquiry create
const missing = await a.post("/api/enquiries", { newCustomer: { name: "X" } });
check(missing.status === 400, "missing required fields -> 400");
const e1 = await a.post("/api/enquiries", { ...base, newCustomer: { name: `Cust ${stamp}`, companyName: "ACME" } });
check(e1.status === 201 && /^ENQ-\d{4}-\d{4}$/.test(e1.json.enquiryNo) && e1.json.status === "RECEIVED", "create enquiry w/ new customer", e1);
const d1 = await a.get(`/api/enquiries/${e1.json.id}`);
const today = new Date().toLocaleDateString("en-CA");
check(d1.json.createdByName === "Emp A" && d1.json.createdByDesignation === "Sales Engineer", "creator name/designation snapshot");
check(d1.json.enquiryDate === today, "date defaults to today", d1.json.enquiryDate);
const custId = d1.json.customerId;

// 4. workflow
const id1 = e1.json.id;
check((await a.post(`/api/enquiries/${id1}/status`, { to: "ACCEPTED" })).status === 400, "RECEIVED -> ACCEPTED directly -> 400");
check((await a.post(`/api/enquiries/${id1}/status`, { to: "QUOTED" })).status === 400, "quote without Zoho quote no. -> 400");
const q0 = await a.post(`/api/enquiries/${id1}/status`, { to: "QUOTED", quoteNo: "QT-000101" });
check(q0.json?.revisionNo === 0 && q0.json?.quoteNo === "QT-000101", "RECEIVED -> QUOTED (R0) with quote no.", q0);
check((await a.post(`/api/enquiries/${id1}/status`, { to: "QUOTED", remarks: "price revised" })).status === 400, "revise without quote no. -> 400");
check((await a.post(`/api/enquiries/${id1}/status`, { to: "QUOTED", quoteNo: "QT-000101", remarks: "price revised" })).json?.revisionNo === 1, "revise -> R1 (same quote no.)");
const q2 = await a.post(`/api/enquiries/${id1}/status`, { to: "QUOTED", quoteNo: "QT-000145" });
check(q2.json?.revisionNo === 2 && q2.json?.quoteNo === "QT-000145", "revise -> R2 (new quote no.)", q2);
const acc = await a.post(`/api/enquiries/${id1}/status`, { to: "ACCEPTED" });
check(acc.json?.status === "ACCEPTED" && acc.json?.quoteNo === "QT-000145", "accept keeps the current quote no.", acc);
const hist = (await a.get(`/api/enquiries/${id1}`)).json?.history ?? [];
check(
  hist.map((h) => h.quoteNo ?? "-").join(",") === "-,QT-000101,QT-000101,QT-000145,QT-000145",
  "history records the quote no. at every step",
  hist.map((h) => h.quoteNo),
);
check((await a.get(`/api/enquiries?q=QT-000145`)).json?.items?.some((r) => r.id === id1), "search by Zoho quote no.");
check((await a.post(`/api/enquiries/${id1}/status`, { to: "QUOTED", quoteNo: "QT-1" })).status === 409, "change after accept -> 409");
check((await a.patch(`/api/enquiries/${id1}`, { scopeOfWork: "edit" })).status === 409, "edit after accept -> 409");
check((await a.del(`/api/enquiries/${id1}`)).status === 403, "employee cannot delete (closed) enquiry");

const e2 = await a.post("/api/enquiries", { ...base, customerId: custId });
const id2 = e2.json.id;
await a.post(`/api/enquiries/${id2}/status`, { to: "QUOTED", quoteNo: "QT-000102" });
check((await a.post(`/api/enquiries/${id2}/status`, { to: "REJECTED" })).status === 400, "reject without lost reason -> 400");
check((await a.post(`/api/enquiries/${id2}/status`, { to: "REJECTED", lostReason: "Price too high" })).status === 200, "reject with reason");
check((await a.post(`/api/enquiries/${id2}/reopen`, { remarks: "x" })).status === 403, "owner cannot reopen -> 403");
const ro = await admin.post(`/api/enquiries/${id2}/reopen`, { remarks: "customer came back" });
check(ro.json?.status === "QUOTED", "admin reopen -> back to QUOTED", ro);
check((await a.post(`/api/enquiries/${id2}/status`, { to: "REJECTED", lostReason: "Price too high" })).status === 200, "re-reject");

const e3 = await a.post("/api/enquiries", { ...base, customerId: custId, additionalDetails: "call after 5" });
check((await a.post(`/api/enquiries/${e3.json.id}/status`, { to: "CANCELLED" })).status === 400, "cancel without reason -> 400");
check((await a.post(`/api/enquiries/${e3.json.id}/status`, { to: "CANCELLED", remarks: "No response from customer" })).json?.status === "CANCELLED", "RECEIVED -> CANCELLED");

// concurrent double-click: only one revision may apply
const e4 = await a.post("/api/enquiries", { ...base, customerId: custId });
await a.post(`/api/enquiries/${e4.json.id}/status`, { to: "QUOTED", quoteNo: "QT-000104" });
const [r1, r2] = await Promise.all([
  a.post(`/api/enquiries/${e4.json.id}/status`, { to: "ACCEPTED" }),
  a.post(`/api/enquiries/${e4.json.id}/status`, { to: "REJECTED", lostReason: "x" }),
]);
check([r1.status, r2.status].sort().join() === "200,409", "concurrent accept+reject -> one wins, other 409", [r1.status, r2.status]);
const after4 = (await a.get(`/api/enquiries/${e4.json.id}`)).json;
check(after4.history.length === 3, "history has exactly CREATE, QUOTE, one close", after4.history.length);
check((await admin.del(`/api/enquiries/${e4.json.id}`)).status === 200, "admin deletes closed enquiry");

// soft delete: admin only, even for open enquiries
const e5 = await a.post("/api/enquiries", { ...base, customerId: custId });
check((await a.del(`/api/enquiries/${e5.json.id}`)).status === 403, "employee cannot delete open enquiry");
check((await admin.del(`/api/enquiries/${e5.json.id}`)).status === 200, "admin deletes open enquiry");
check((await a.get(`/api/enquiries/${e5.json.id}`)).status === 404, "deleted enquiry -> 404");
check((await a.get(`/api/enquiries/${id1}`)).json?.canDelete === false, "canDelete false for employee");
check((await admin.get(`/api/enquiries/${id1}`)).json?.canDelete === true, "canDelete true for admin");

// 5. shared access: every user can view + edit every enquiry (not delete)
const e6 = await a.post("/api/enquiries", { ...base, customerId: custId });
check((await b.get(`/api/enquiries/${id1}`)).status === 200, "B can view A's enquiry");
check((await b.patch(`/api/enquiries/${e6.json.id}`, { scopeOfWork: "edited by B" })).status === 200, "B can edit A's open enquiry");
check((await b.post(`/api/enquiries/${e6.json.id}/status`, { to: "QUOTED", quoteNo: "QT-000106" })).status === 200, "B can change status of A's enquiry");
check((await b.patch(`/api/enquiries/${id1}`, { scopeOfWork: "x" })).status === 409, "closed enquiry still not editable by B");
check((await b.del(`/api/enquiries/${e6.json.id}`)).status === 403, "B cannot delete A's enquiry");
const bl = await b.get("/api/enquiries?pageSize=100");
check(bl.json.items.some((r) => r.id === e6.json.id), "B's list includes A's enquiries");
check(bl.json.items.every((r) => r.salesperson?.name), "salesperson shown to employees");
check(bl.json.counts?.total === bl.json.total, "list tab counts match the list", [bl.json.counts?.total, bl.json.total]);
const adl = await admin.get(`/api/enquiries?salespersonId=${ea.json.id}`);
check(adl.json.items.every((r) => r.salesperson?.name === "Emp A"), "admin salesperson filter");

// export (admin only, PDF report)
check((await a.get(`/api/enquiries/export`)).status === 403, "employee cannot export -> 403");
const exRes = await fetch(`${BASE}/api/enquiries/export?salespersonId=${ea.json.id}&status=ACCEPTED`, { headers: { cookie: admin.cookie() } });
const exPdf = Buffer.from(await exRes.arrayBuffer());
check(exRes.status === 200 && exRes.headers.get("content-type") === "application/pdf", "admin export -> PDF", exRes.status);
check(exPdf.subarray(0, 5).toString() === "%PDF-" && exPdf.length > 2000, "export body is a PDF", exPdf.length);
check(/attachment; filename="enquiry-report_.+\.pdf"/.test(exRes.headers.get("content-disposition") ?? ""), "export is a download");
check((await admin.get(`/api/enquiries/export?status=NOPE`)).status === 400, "export rejects a bad status -> 400");

// 6. dashboard: A has 1 won, 1 lost, 1 cancelled, + e4 (won or lost, then deleted -> excluded)
const ad = (await admin.get(`/api/dashboard/employees/${ea.json.id}`)).json;
check(ad.kpis.ACCEPTED === 1 && ad.kpis.REJECTED === 1 && ad.kpis.CANCELLED === 1, "per-employee counts", ad.kpis);
check(ad.kpis.conversionRate === 33.3 && ad.kpis.winRate === 50, "conversion 33.3% / win 50%", ad.kpis);
check(ad.kpis.avgRevisions === 1, "avg revisions (2+0)/2 = 1", ad.kpis.avgRevisions);
check(ad.topLostReasons[0]?.reason === "Price too high", "top lost reason");
const mine = (await a.get("/api/dashboard?salespersonId=999999")).json;
// 4 = id1 (won), id2 (lost), e3 (cancelled), e6 (open, quoted by B but still A's)
check(mine.salespersonId === ea.json.id && mine.kpis.total === 4, "employee dashboard forced to own scope", mine.kpis);
const perf = (await admin.get("/api/dashboard/employees")).json;
const rowA = perf.find((r) => r.id === ea.json.id);
check(rowA?.ACCEPTED === 1 && rowA?.winRate === 50, "employee performance table row", rowA);

// 7. page guards (proxy)
const page = async (c, path) => {
  const res = await fetch(BASE + path, { redirect: "manual", headers: { cookie: c.cookie() } });
  return { status: res.status, location: new URL(res.headers.get("location") ?? "/", BASE).pathname };
};
let pg = await page(new Client(), "/dashboard");
check([302, 307].includes(pg.status) && pg.location === "/login", "logged-out /dashboard -> /login", pg);
pg = await page(a, "/employees");
check([302, 307].includes(pg.status) && pg.location === "/dashboard", "employee /employees -> /dashboard", pg);
pg = await page(a, "/login");
check([302, 307].includes(pg.status) && pg.location === "/dashboard", "logged-in /login -> /dashboard", pg);
check((await page(admin, "/employees")).status === 200, "admin can open /employees");

// 8. deactivate
check((await admin.patch(`/api/employees/${eb.json.id}`, { isActive: false })).status === 200, "admin deactivates B");
check((await b.get("/api/profile")).status === 401, "B's existing session rejected immediately");
check(!(await new Client().login(`b.${stamp}@test.local`, "AdminSet@B1")), "deactivated B cannot log in");
const self = await admin.get("/api/profile");
check((await admin.patch(`/api/employees/${self.json.id}`, { isActive: false })).status === 400, "admin cannot deactivate self");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
