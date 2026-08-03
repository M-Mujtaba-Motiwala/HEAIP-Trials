// =============================================================================
// Prisma Client Singleton — Hamdard AI Platform (Prisma v7)
// -----------------------------------------------------------------------------
// Prisma v7 with a driver adapter MUST always receive the adapter at
// construction time. A plain `new PrismaClient()` (without options) will
// throw at startup when previewFeatures or driver-adapter mode is active.
//
// This singleton always constructs the client with PrismaPg so that all
// model delegates (including `aiModel`) are available at runtime.
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Add it to your .env.local file before starting the server."
    );
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  // Cast needed because Prisma v7 types `adapter` as the internal
  // DriverAdapter interface, but the public PrismaPg class satisfies it.
  return new PrismaClient({ adapter } as any);
}

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
