import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("policies.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const existing = await db.aiPolicy.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const newStatus = body.status || (existing.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED");
    const isActive = newStatus === "ACTIVE";

    const policy = await db.aiPolicy.update({
      where: { id },
      data: {
        status: newStatus,
        isActive,
        version: existing.version + 1,
        updatedById: guard.session.user.id,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: newStatus === "ARCHIVED" ? "ARCHIVE_AI_POLICY" : "RESTORE_AI_POLICY",
        resource: `aiPolicy:${id}`,
        details: JSON.stringify({ previousStatus: existing.status, newStatus }),
      },
    });

    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("[POLICY_ARCHIVE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
