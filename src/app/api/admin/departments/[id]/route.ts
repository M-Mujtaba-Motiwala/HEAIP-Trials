import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "departments.view");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const department = await db.department.findUnique({
      where: { id },
      include: {
        headOfDepartment: { select: { id: true, name: true } },
        teams: true,
      },
    });

    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    return NextResponse.json({ data: department });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "departments.update");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, description, status, headOfDepartmentId } = body;

    const department = await db.department.update({
      where: { id },
      data: { name, description, status, headOfDepartmentId },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_DEPARTMENT",
        resource: `department:${department.id}`,
        details: JSON.stringify({ name, description, status, headOfDepartmentId }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: department });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "departments.delete");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const department = await db.department.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "DEACTIVATE_DEPARTMENT",
        resource: `department:${department.id}`,
        details: JSON.stringify({ status: "INACTIVE" }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: department });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
