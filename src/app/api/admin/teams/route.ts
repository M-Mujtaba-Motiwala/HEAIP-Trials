import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await hasPermission(session.user.id, "teams.create");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const departmentId = typeof body.departmentId === "string" ? body.departmentId : "";
    const rawEmployeeIds: unknown[] = Array.isArray(body.employeeIds) ? body.employeeIds : [];
    const employeeIds = [...new Set(
      rawEmployeeIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    )];

    if (!name || !departmentId) {
      return NextResponse.json({ error: "Name and home department are required" }, { status: 400 });
    }

    const [department, employees] = await Promise.all([
      db.department.findUnique({ where: { id: departmentId }, select: { id: true } }),
      employeeIds.length > 0
        ? db.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true } })
        : Promise.resolve([]),
    ]);

    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    if (employees.length !== employeeIds.length) {
      return NextResponse.json({ error: "One or more selected employees were not found" }, { status: 400 });
    }

    const team = await db.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: { name, description, departmentId, status: "ACTIVE" },
      });
      if (employeeIds.length > 0) {
        await tx.employee.updateMany({ where: { id: { in: employeeIds } }, data: { teamId: createdTeam.id } });
      }
      return createdTeam;
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CREATE_TEAM",
        resource: `team:${team.id}`,
        details: JSON.stringify({ name, departmentId, employeeIds }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error("[TEAMS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
