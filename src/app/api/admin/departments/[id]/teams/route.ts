import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: departmentId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "teams.view");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const teams = await db.team.findMany({
      where: { departmentId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: teams });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: departmentId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "teams.create");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const team = await db.team.create({
      data: {
        name,
        description,
        departmentId,
        status: "ACTIVE",
      },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE_TEAM",
        resource: `team:${team.id}`,
        details: JSON.stringify({ name, description, departmentId }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: team });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
