import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "teams.update");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, description, status } = body;

    const team = await db.team.update({
      where: { id },
      data: { name, description, status },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_TEAM",
        resource: `team:${team.id}`,
        details: JSON.stringify({ name, description, status }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: team });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "teams.delete");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const team = await db.team.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "DEACTIVATE_TEAM",
        resource: `team:${team.id}`,
        details: JSON.stringify({ status: "INACTIVE" }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: team });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
