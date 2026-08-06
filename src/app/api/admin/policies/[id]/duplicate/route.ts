import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("policies.create");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const existing = await db.aiPolicy.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    const duplicate = await db.aiPolicy.create({
      data: {
        name: `${existing.name} (Copy)`,
        description: existing.description,
        category: existing.category,
        policyType: existing.policyType,
        severity: existing.severity,
        scope: existing.scope,
        scopeTargets: existing.scopeTargets,
        actions: existing.actions,
        conditions: existing.conditions,
        exceptions: existing.exceptions,
        priority: existing.priority,
        effectiveAt: existing.effectiveAt,
        expiresAt: existing.expiresAt,
        status: "INACTIVE",
        isActive: false,
        version: 1,
        createdById: guard.session.user.id,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "DUPLICATE_AI_POLICY",
        resource: `aiPolicy:${duplicate.id}`,
        details: JSON.stringify({ originalId: id, name: duplicate.name }),
      },
    });

    return NextResponse.json({ data: duplicate }, { status: 201 });
  } catch (error) {
    console.error("[POLICY_DUPLICATE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
