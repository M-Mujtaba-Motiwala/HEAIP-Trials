import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePermission("admin.dashboard.view");
  if ("error" in guard) return guard.error;
  return NextResponse.json({ data: await db.aiModel.findMany({ orderBy: [{ provider: "asc" }, { displayName: "asc" }] }) });
}

export async function POST(request: Request) {
  const guard = await requirePermission("admin.dashboard.view");
  if ("error" in guard) return guard.error;
  try {
    const body = await request.json();
    if (!body.provider || !body.modelId || !body.displayName) return NextResponse.json({ error: "Provider, model ID, and display name are required." }, { status: 400 });
    const model = await db.$transaction(async (tx) => {
      if (body.isDefault) await tx.aiModel.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      return tx.aiModel.create({ data: { provider: body.provider, modelId: body.modelId, displayName: body.displayName, enabled: body.enabled !== false, isDefault: body.isDefault === true, metadataJson: JSON.stringify(body.metadata ?? {}) } });
    });
    await db.auditLog.create({ data: { actorId: guard.session.user.id, action: "CREATE_AI_MODEL", resource: `aiModel:${model.id}`, details: JSON.stringify({ provider: model.provider, modelId: model.modelId }) } });
    return NextResponse.json({ data: model }, { status: 201 });
  } catch (error) { console.error("[MODELS_POST]", error); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}
