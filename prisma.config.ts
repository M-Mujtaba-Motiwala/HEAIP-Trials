// =============================================================================
// Prisma Configuration — Prisma v7
// =============================================================================

import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_va8pDuFC2dWJ@ep-old-term-ay2jbuak.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
  migrations: {
    seed: "node --env-file=.env.local node_modules/tsx/dist/cli.mjs prisma/seed.ts",
  },
});

