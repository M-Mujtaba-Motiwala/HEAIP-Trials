// =============================================================================
// Single Cost Center — PATCH, DELETE
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.costCenter.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Cost center not found." }, { status: 404 });

    const body = await req.json();
    const { code, name, description, status } = body;

    const costCenter = await db.costCenter.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "UPDATE_COST_CENTER",
        resource: `costCenter:${id}`,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({ data: costCenter });
  } catch (error) {
    console.error("[COST_CENTER_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.costCenter.findUnique({
      where: { id },
      include: { _count: { select: { departments: true, teams: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Cost center not found." }, { status: 404 });

    if (existing._count.departments > 0 || existing._count.teams > 0) {
      return NextResponse.json({ error: `Cannot delete cost center used by ${existing._count.departments} department(s) and ${existing._count.teams} team(s).` }, { status: 400 });
    }

    await db.costCenter.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "DELETE_COST_CENTER",
        resource: `costCenter:${id}`,
        details: JSON.stringify({ code: existing.code, name: existing.name }),
      },
    });

    return NextResponse.json({ message: "Cost center deleted." });
  } catch (error) {
    console.error("[COST_CENTER_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
