// =============================================================================
// AI Model Management — Full Enterprise CRUD
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

const MODEL_CATEGORIES = ["Chat", "Vision", "Embedding", "Audio", "Video", "OCR", "Code", "Reasoning"];

export async function GET() {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;

  try {
    const models = await db.aiModel.findMany({
      orderBy: [{ provider: "asc" }, { displayName: "asc" }],
      include: {
        credential: { select: { id: true, name: true, provider: true, apiKeyAlias: true, status: true } },
        _count: { select: { healthChecks: true } },
      },
    });

    const data = models.map((m) => {
      let pricing: Record<string, number> = {};
      let capabilities: Record<string, boolean> = {};
      let limits: Record<string, number> = {};
      let policy: Record<string, unknown> = {};

      try { pricing = JSON.parse(m.pricingJson); } catch { /* */ }
      try { capabilities = JSON.parse(m.capabilitiesJson); } catch { /* */ }
      try { limits = JSON.parse(m.limitsJson); } catch { /* */ }
      try { policy = JSON.parse(m.policyJson); } catch { /* */ }

      return {
        id: m.id,
        provider: m.provider,
        modelId: m.modelId,
        displayName: m.displayName,
        enabled: m.enabled,
        isDefault: m.isDefault,
        category: m.category,
        version: m.version,
        description: m.description,
        capabilities,
        limits,
        pricing,
        policy,
        metadataJson: m.metadataJson,
        credentialId: m.credentialId,
        credential: m.credential,
        healthStatus: m.healthStatus,
        lastHealthCheck: m.lastHealthCheck,
        totalRequests: m.totalRequests,
        totalCostUsd: m.totalCostUsd,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });

    return NextResponse.json({ data, categories: MODEL_CATEGORIES });
  } catch (error) {
    console.error("[MODELS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const {
      provider, modelId, displayName, enabled, isDefault,
      category, version, description,
      capabilities, limits, pricing, policy, credentialId,
    } = body;

    if (!provider || !modelId || !displayName) {
      return NextResponse.json({ error: "Provider, model ID, and display name are required." }, { status: 400 });
    }

    // Verify credential exists if provided
    if (credentialId) {
      const cred = await db.apiCredential.findUnique({ where: { id: credentialId } });
      if (!cred) return NextResponse.json({ error: "Credential not found." }, { status: 400 });
    }

    // Build metadata (legacy compat)
    const metadata: Record<string, unknown> = typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {};
    if (pricing) {
      if (typeof pricing.inputCostPer1K === "number") metadata.inputCostPer1K = pricing.inputCostPer1K;
      if (typeof pricing.outputCostPer1K === "number") metadata.outputCostPer1K = pricing.outputCostPer1K;
    }

    const model = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.aiModel.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.aiModel.create({
        data: {
          provider,
          modelId,
          displayName,
          enabled: enabled !== false,
          isDefault: isDefault === true,
          category: category || "Chat",
          version: version || null,
          description: description || null,
          capabilitiesJson: typeof capabilities === "string" ? capabilities : JSON.stringify(capabilities || {}),
          limitsJson: typeof limits === "string" ? limits : JSON.stringify(limits || {}),
          pricingJson: typeof pricing === "string" ? pricing : JSON.stringify(pricing || {}),
          policyJson: typeof policy === "string" ? policy : JSON.stringify(policy || {}),
          metadataJson: JSON.stringify(metadata),
          credentialId: credentialId || null,
        },
      });
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "CREATE_AI_MODEL",
        resource: `aiModel:${model.id}`,
        details: JSON.stringify({ provider, modelId, category, credentialId }),
      },
    });

    return NextResponse.json({ data: model }, { status: 201 });
  } catch (error) {
    console.error("[MODELS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
