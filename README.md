# Enquiry App

Next.js 16 (App Router) · Prisma 7 + PostgreSQL · Auth.js v5 (credentials, JWT) · argon2id.
Backend APIs are complete; UI: Tailwind v4 + shadcn/ui (`src/components/ui`) + Recharts.

## Setup
1. Create a Postgres login + database it owns (as `postgres`):
   `CREATE ROLE enquiry_app LOGIN CREATEDB PASSWORD '...'; CREATE DATABASE enquiry_app OWNER enquiry_app;`
   (`CREATEDB` is only for the shadow DB of `migrate dev`; the owner can enable the `citext` extension the migration needs.)
2. `cp .env.example .env` and fill `DB_*` (or `DATABASE_URL`), `AUTH_SECRET` (`npx auth secret`), seed admin and `DEFAULT_EMPLOYEE_PASSWORD`.
3. `npm install` (runs `prisma generate`)
4. `npm run db:migrate` (dev) / `npm run db:deploy` (prod) - create tables
5. `npm run db:seed` - admin account, work-scope catalogue, lead sources (idempotent)
6. `npm run dev` → http://localhost:5678, login with the seeded admin
7. Optional: `npm run test:e2e -- http://localhost:5678` (58 API/guard checks; creates test data)

## Status workflow (`src/lib/constants.ts` TRANSITIONS)
| From | Allowed next |
|---|---|
| RECEIVED | QUOTED, CANCELLED (reason required) |
| QUOTED | ACCEPTED, REJECTED (lost reason required), QUOTED (= revision, Rev+1), CANCELLED (reason required) |
| ACCEPTED / REJECTED / CANCELLED | closed - admin-only `POST /api/enquiries/:id/reopen` |

## API (all JSON, session cookie required; errors `{ error, details }` with 400/401/403/404/409)
| Endpoint | Notes |
|---|---|
| `GET/POST /api/enquiries` | list (`page,pageSize≤100,status,from,to,q,customerId,salespersonId[admin]`) / create (`customerId` **or** `newCustomer`) |
| `GET/PATCH/DELETE /api/enquiries/:id` | view (+history, allowed `actions`) / edit (open only) / soft delete |
| `POST /api/enquiries/:id/status` | `{ to, remarks?, lostReason? }` |
| `POST /api/enquiries/:id/reopen` | admin, `{ remarks }` |
| `GET/POST /api/customers`, `GET/PATCH /api/customers/:id` | `?q=` search |
| `GET /api/lookups` | work types, categories, lead sources |
| `POST /api/lookups/:type`, `PATCH /api/lookups/:type/:id` | admin; type = `work-types` \| `categories` \| `lead-sources` |
| `GET /api/dashboard` | KPIs + breakdowns (employee = own; admin = all or `?salespersonId=`) |
| `GET /api/dashboard/employees[/:id]` | admin: performance table / one employee |
| `GET/POST /api/employees`, `GET/PATCH /api/employees/:id` | admin |
| `POST /api/employees/:id/password` | admin: `{ password }` or `{}` = reset to default |
| `GET/PATCH /api/profile`, `POST /api/profile/password` | self |

## Code map
- `src/lib/api.ts` - `route()` wrapper (auth + DB re-check of active user/role, zod, error mapping)
- `src/lib/authz.ts` - `enquiryScope()` row-level security
- `src/lib/enquiries.ts`, `enquiry-workflow.ts`, `analytics.ts` - business logic
- `src/auth.ts`, `auth.config.ts`, `proxy.ts` - Auth.js + page guard
