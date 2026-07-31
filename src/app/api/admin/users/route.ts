import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.id, "users.employee.read");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const department = searchParams.get("department") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const registrationStatus = searchParams.get("registrationStatus") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    if (department) where.department = department;
    if (role) where.role = role;
    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;
    if (registrationStatus) where.registrationStatus = registrationStatus;

    const employees = await db.employee.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        departmentId: true,
        designation: true,
        role: true,
        userType: true,
        registrationStatus: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          select: {
            id: true,
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    const departments = await db.department.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const roles = await db.role.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: employees,
      meta: {
        total: employees.length,
        departments,
        roles,
      },
    });
  } catch (error) {
    console.error("[USERS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
