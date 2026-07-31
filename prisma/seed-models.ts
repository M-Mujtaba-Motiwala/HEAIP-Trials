// Targeted seed for AI Model registry only — run after main seed
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const AI_MODELS = [
  { provider: "google",    modelId: "gemini-2.0-flash",          displayName: "Gemini 2.0 Flash",          enabled: true,  isDefault: true  },
  { provider: "google",    modelId: "gemini-2.0-flash-thinking",  displayName: "Gemini 2.0 Flash Thinking", enabled: true,  isDefault: false },
  { provider: "google",    modelId: "gemini-1.5-pro",             displayName: "Gemini 1.5 Pro",            enabled: true,  isDefault: false },
  { provider: "openai",    modelId: "gpt-4o-mini",                displayName: "GPT-4o Mini",               enabled: true,  isDefault: true  },
  { provider: "openai",    modelId: "gpt-4o",                     displayName: "GPT-4o",                    enabled: true,  isDefault: false },
  { provider: "anthropic", modelId: "claude-3-5-haiku-latest",    displayName: "Claude 3.5 Haiku",          enabled: true,  isDefault: true  },
  { provider: "anthropic", modelId: "claude-3-7-sonnet-latest",   displayName: "Claude 3.7 Sonnet",         enabled: false, isDefault: false },
];

async function main() {
  console.log("🤖 Seeding AI Model Registry…");
  for (const model of AI_MODELS) {
    await prisma.aiModel.upsert({
      where: { provider_modelId: { provider: model.provider, modelId: model.modelId } },
      update: { displayName: model.displayName, enabled: model.enabled, isDefault: model.isDefault },
      create: { ...model, metadataJson: "{}" },
    });
    console.log(`   ✓ ${model.displayName} (${model.modelId})`);
  }
  console.log(`\n✅ Seeded ${AI_MODELS.length} AI models.`);
}

main()
  .catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
