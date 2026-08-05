import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  const models = await db.aiModel.findMany({ orderBy: [{ provider: "asc" }, { displayName: "asc" }] });
  const data = models.map((m) => {
    let inputCostPer1K: number | null = null;
    let outputCostPer1K: number | null = null;
    if (m.metadataJson) {
      try {
        const meta = JSON.parse(m.metadataJson);
        if (typeof meta.inputCostPer1K === "number") inputCostPer1K = meta.inputCostPer1K;
        if (typeof meta.outputCostPer1K === "number") outputCostPer1K = meta.outputCostPer1K;
      } catch { /* ignore */ }
    }
    return { ...m, inputCostPer1K, outputCostPer1K };
  });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const guard = await requirePermission("models.manage");
  if ("error" in guard) return guard.error;
  try {
    const body = await request.json();
    if (!body.provider || !body.modelId || !body.displayName) return NextResponse.json({ error: "Provider, model ID, and display name are required." }, { status: 400 });
    const metadata: Record<string, unknown> = typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {};
    if (typeof body.inputCostPer1K === "number") metadata.inputCostPer1K = body.inputCostPer1K;
    if (typeof body.outputCostPer1K === "number") metadata.outputCostPer1K = body.outputCostPer1K;
    const model = await db.$transaction(async (tx) => {
      if (body.isDefault) await tx.aiModel.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      return tx.aiModel.create({ data: { provider: body.provider, modelId: body.modelId, displayName: body.displayName, enabled: body.enabled !== false, isDefault: body.isDefault === true, metadataJson: JSON.stringify(metadata) } });
    });
    await db.auditLog.create({ data: { actorId: guard.session.user.id, action: "CREATE_AI_MODEL", resource: `aiModel:${model.id}`, details: JSON.stringify({ provider: model.provider, modelId: model.modelId, metadata }) } });
    return NextResponse.json({ data: model }, { status: 201 });
  } catch (error) { console.error("[MODELS_POST]", error); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}
