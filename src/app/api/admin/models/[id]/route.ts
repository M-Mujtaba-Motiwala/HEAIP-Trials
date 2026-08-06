// =============================================================================
// AI Model Registry — PATCH & DELETE single model
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.aiModel.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Model not found." }, { status: 404 });

    const body = await req.json();
    const {
      provider, modelId, displayName, enabled, isDefault,
      category, version, description,
      capabilities, limits, pricing, policy,
      credentialId, metadataJson, inputCostPer1K, outputCostPer1K,
    } = body;

    // Verify credential exists if provided
    if (credentialId) {
      const cred = await db.apiCredential.findUnique({ where: { id: credentialId } });
      if (!cred) return NextResponse.json({ error: "Credential not found." }, { status: 400 });
    }

    // Handle default model logic
    if (isDefault && (provider ?? existing.provider)) {
      await db.aiModel.updateMany({
        where: { provider: provider ?? existing.provider, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    // Build pricing JSON
    let nextPricingJson: string | undefined;
    if (pricing !== undefined) {
      nextPricingJson = typeof pricing === "string" ? pricing : JSON.stringify(pricing);
    } else if (inputCostPer1K !== undefined || outputCostPer1K !== undefined) {
      let p: Record<string, unknown> = {};
      try { p = JSON.parse(existing.pricingJson); } catch { p = {}; }
      if (inputCostPer1K !== undefined) p.inputCostPer1K = inputCostPer1K;
      if (outputCostPer1K !== undefined) p.outputCostPer1K = outputCostPer1K;
      nextPricingJson = JSON.stringify(p);
    }

    // Build capabilities JSON
    let nextCapabilitiesJson: string | undefined;
    if (capabilities !== undefined) {
      nextCapabilitiesJson = typeof capabilities === "string" ? capabilities : JSON.stringify(capabilities);
    }

    // Build limits JSON
    let nextLimitsJson: string | undefined;
    if (limits !== undefined) {
      nextLimitsJson = typeof limits === "string" ? limits : JSON.stringify(limits);
    }

    // Build policy JSON
    let nextPolicyJson: string | undefined;
    if (policy !== undefined) {
      nextPolicyJson = typeof policy === "string" ? policy : JSON.stringify(policy);
    }

    // Build metadata JSON (legacy compat)
    let nextMetadataJson: string | undefined;
    if (metadataJson !== undefined) {
      nextMetadataJson = JSON.stringify(metadataJson);
    }

    const model = await db.aiModel.update({
      where: { id },
      data: {
        ...(provider !== undefined && { provider }),
        ...(modelId !== undefined && { modelId }),
        ...(displayName !== undefined && { displayName }),
        ...(enabled !== undefined && { enabled }),
        ...(isDefault !== undefined && { isDefault }),
        ...(category !== undefined && { category }),
        ...(version !== undefined && { version }),
        ...(description !== undefined && { description }),
        ...(nextCapabilitiesJson !== undefined && { capabilitiesJson: nextCapabilitiesJson }),
        ...(nextLimitsJson !== undefined && { limitsJson: nextLimitsJson }),
        ...(nextPricingJson !== undefined && { pricingJson: nextPricingJson }),
        ...(nextPolicyJson !== undefined && { policyJson: nextPolicyJson }),
        ...(nextMetadataJson !== undefined && { metadataJson: nextMetadataJson }),
        ...(credentialId !== undefined && { credentialId: credentialId || null }),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "UPDATE_AI_MODEL",
        resource: `aiModel:${id}`,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({ data: model });
  } catch (error) {
    console.error("[AI_MODEL_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.aiModel.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Model not found." }, { status: 404 });

    await db.modelHealthCheck.deleteMany({ where: { modelId: id } });
    await db.aiModel.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "DELETE_AI_MODEL",
        resource: `aiModel:${id}`,
        details: JSON.stringify({ provider: existing.provider, modelId: existing.modelId }),
      },
    });

    return NextResponse.json({ message: "Model deleted." });
  } catch (error) {
    console.error("[AI_MODEL_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
