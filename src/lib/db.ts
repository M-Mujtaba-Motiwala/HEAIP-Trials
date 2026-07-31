// =============================================================================
// Prisma Client Singleton — Hamdard AI Platform (Prisma v7)
// -----------------------------------------------------------------------------
// Uses PrismaBetterSqlite3 adapter for zero-config dev & edge build capability.
// Production deployment utilizes Docker Compose with PostgreSQL 16.
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    if (process.env.DATABASE_URL) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      const client = new PrismaClient({ adapter });
      if ((client as any).chatSession && (client as any).employee) {
        return client;
      }
    }
  } catch (err) {
    console.warn("PrismaPg adapter initialization warning:", err);
  }
  return new PrismaClient();
}

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
