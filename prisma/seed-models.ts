// Targeted seed for AI Model registry — Groq free models
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
  // Groq free models (all $0 cost)
  { provider: "groq", modelId: "llama-3.3-70b-versatile",      displayName: "Llama 3.3 70B",       enabled: true,  isDefault: true,  metadataJson: JSON.stringify({ inputCostPer1K: 0, outputCostPer1K: 0 }) },
  { provider: "groq", modelId: "llama-3.1-8b-instant",         displayName: "Llama 3.1 8B Instant", enabled: true,  isDefault: false, metadataJson: JSON.stringify({ inputCostPer1K: 0, outputCostPer1K: 0 }) },
  { provider: "groq", modelId: "gemma2-9b-it",                 displayName: "Gemma 2 9B",           enabled: true,  isDefault: false, metadataJson: JSON.stringify({ inputCostPer1K: 0, outputCostPer1K: 0 }) },
  { provider: "groq", modelId: "mixtral-8x7b-32768",           displayName: "Mixtral 8x7B",         enabled: true,  isDefault: false, metadataJson: JSON.stringify({ inputCostPer1K: 0, outputCostPer1K: 0 }) },
  { provider: "groq", modelId: "meta-llama/llama-4-scout-17b-16e-instruct", displayName: "Llama 4 Scout 17B", enabled: true, isDefault: false, metadataJson: JSON.stringify({ inputCostPer1K: 0, outputCostPer1K: 0 }) },
];

async function main() {
  console.log("Seeding AI Model Registry (Groq)...");
  for (const model of AI_MODELS) {
    const meta = model.metadataJson || "{}";
    await prisma.aiModel.upsert({
      where: { provider_modelId: { provider: model.provider, modelId: model.modelId } },
      update: { displayName: model.displayName, enabled: model.enabled, isDefault: model.isDefault, metadataJson: meta },
      create: { ...model, metadataJson: meta },
    });
    console.log(`  ${model.displayName} (${model.modelId})`);
  }
  console.log(`\nSeeded ${AI_MODELS.length} AI models.`);
}

main()
  .catch((err) => { console.error("Seed failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
