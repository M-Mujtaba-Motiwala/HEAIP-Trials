// =============================================================================
// Cost Centers Management — CRUD
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;

  try {
    const costCenters = await db.costCenter.findMany({
      include: {
        _count: { select: { departments: true, teams: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: costCenters });
  } catch (error) {
    console.error("[COST_CENTERS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required." }, { status: 400 });
    }

    const costCenter = await db.costCenter.create({
      data: { code, name, description },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "CREATE_COST_CENTER",
        resource: `costCenter:${costCenter.id}`,
        details: JSON.stringify({ code, name }),
      },
    });

    return NextResponse.json({ data: costCenter }, { status: 201 });
  } catch (error) {
    console.error("[COST_CENTERS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
