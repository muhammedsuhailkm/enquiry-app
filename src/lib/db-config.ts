// Single source of truth for DB connection settings (used by the runtime adapter, the seed
// and prisma.config.ts for the CLI). Values come from .env.
//
// Either set DATABASE_URL (postgresql://user:pass@host:5432/db - what most hosts hand you),
// or the individual DB_* values below and the URL is built from them.
export function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST ?? "localhost";
  const port = Number(process.env.DB_PORT ?? 5432);
  const database = process.env.DB_NAME ?? "enquiry_app";
  const user = encodeURIComponent(process.env.DB_USER ?? "");
  const password = encodeURIComponent(process.env.DB_PASSWORD ?? "");
  return `postgresql://${user}:${password}@${host}:${port}/${encodeURIComponent(database)}`;
}

/**
 * TLS for the runtime pool. DB_SSL=true is required by AWS RDS (rds.force_ssl is on by default).
 * DB_SSL_REJECT_UNAUTHORIZED=false accepts the server certificate without a CA bundle
 * (encrypted but not identity-checked; set it to true and add the RDS CA via NODE_EXTRA_CA_CERTS for full verification).
 */
export function dbSsl() {
  if (process.env.DB_SSL !== "true") return undefined;
  return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}

/** pg.Pool config shared by the app and the seed. */
export function dbPoolConfig() {
  return { connectionString: dbUrl(), ssl: dbSsl() };
}
