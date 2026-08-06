import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { enforceUserManagement } from "@/lib/policy-enforcer";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.id, "users.employee.read");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const employee = await db.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        departmentId: true,
        teamId: true,
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

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ data: employee });
  } catch (error) {
    console.error("[USER_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.id, "users.employee.update");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { designation, departmentId, teamId, role, isActive, userType } = body;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // ── Policy Enforcement: User Management ───────────────────────────────
    const policyCheck = await enforceUserManagement("EDIT", id);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: policyCheck.decision.blockReason || "User edit blocked by policy",
        decisions: policyCheck.decision.decisions,
      }, { status: 403 });
    }

    // Check for privilege escalation (role change)
    if (role && role !== existing.role) {
      const escalationCheck = await enforceUserManagement("PRIVILEGE_ESCALATION", id, role);
      if (!escalationCheck.allowed) {
        return NextResponse.json({
          error: "POLICY_BLOCKED",
          reason: escalationCheck.decision.blockReason || "Privilege escalation blocked by policy",
          decisions: escalationCheck.decision.decisions,
        }, { status: 403 });
      }
    }

    let departmentName = existing.department;
    if (departmentId) {
      const dept = await db.department.findUnique({ where: { id: departmentId } });
      if (dept) departmentName = dept.name;
    }

    const updated = await db.employee.update({
      where: { id },
      data: {
        ...(designation !== undefined && { designation }),
        ...(departmentId !== undefined && { departmentId, department: departmentName }),
        ...(teamId !== undefined && { teamId }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(userType !== undefined && { userType }),
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        role: true,
        userType: true,
        registrationStatus: true,
        isActive: true,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "UPDATE_EMPLOYEE",
        resource: `employee:${id}`,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[USER_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
