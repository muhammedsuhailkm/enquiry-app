import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { dbPoolConfig } from "./db-config";

function createClient() {
  const adapter = new PrismaPg({
    ...dbPoolConfig(),
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in dev (avoids exhausting the connection pool).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
