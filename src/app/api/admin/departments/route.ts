import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "departments.view");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const departments = await db.department.findMany({
      include: {
        headOfDepartment: { select: { id: true, name: true, email: true } },
        _count: { select: { teams: true, employees: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: departments });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await hasPermission(session.user.id, "departments.create");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { code, name, description, headOfDepartmentId } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and Name are required" }, { status: 400 });
    }

    const department = await db.department.create({
      data: {
        code,
        name,
        description,
        headOfDepartmentId,
        status: "ACTIVE",
      },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE_DEPARTMENT",
        resource: `department:${department.id}`,
        details: JSON.stringify({ code, name, description, headOfDepartmentId }),
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: department });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 });
  }
}
