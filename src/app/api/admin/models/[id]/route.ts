// =============================================================================
// AI Model Registry — Patch & Delete single model by [id]
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const { provider, modelId, displayName, enabled, isDefault, metadataJson, inputCostPer1K, outputCostPer1K } = body;
    const existing = await db.aiModel.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Model not found." }, { status: 404 });
    if (isDefault && (provider ?? existing.provider)) {
      await db.aiModel.updateMany({
        where: { provider: provider ?? existing.provider, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    let nextMetadataJson: string | undefined;
    if (metadataJson !== undefined) {
      nextMetadataJson = JSON.stringify(metadataJson);
    } else if (inputCostPer1K !== undefined || outputCostPer1K !== undefined) {
      let meta: Record<string, unknown> = {};
      if (existing.metadataJson) {
        try { meta = JSON.parse(existing.metadataJson); } catch { meta = {}; }
      }
      if (inputCostPer1K !== undefined) meta.inputCostPer1K = inputCostPer1K;
      if (outputCostPer1K !== undefined) meta.outputCostPer1K = outputCostPer1K;
      nextMetadataJson = JSON.stringify(meta);
    }
    const model = await db.aiModel.update({
      where: { id },
      data: {
        ...(provider !== undefined && { provider }),
        ...(modelId !== undefined && { modelId }),
        ...(displayName !== undefined && { displayName }),
        ...(enabled !== undefined && { enabled }),
        ...(isDefault !== undefined && { isDefault }),
        ...(nextMetadataJson !== undefined && { metadataJson: nextMetadataJson }),
      },
    });
    await db.auditLog.create({ data: { actorId: guard.session.user.id, action: "UPDATE_AI_MODEL", resource: `aiModel:${id}`, details: JSON.stringify(body) } });
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
    await db.aiModel.delete({ where: { id } });
    await db.auditLog.create({ data: { actorId: guard.session.user.id, action: "DELETE_AI_MODEL", resource: `aiModel:${id}`, details: JSON.stringify({ provider: existing.provider, modelId: existing.modelId }) } });
    return NextResponse.json({ message: "Model deleted." });
  } catch (error) {
    console.error("[AI_MODEL_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
