import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { enforceUserManagement } from "@/lib/policy-enforcer";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.id, "users.employee.update");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await context.params;
    const { roleId } = await req.json();

    if (!roleId) {
      return NextResponse.json({ error: "roleId is required" }, { status: 400 });
    }

    const employee = await db.employee.findUnique({ where: { id: userId } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // ── Policy Enforcement: Role Assignment ───────────────────────────────
    const policyCheck = await enforceUserManagement("ROLE_ASSIGN", userId, role.code);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: policyCheck.decision.blockReason || "Role assignment blocked by policy",
        decisions: policyCheck.decision.decisions,
      }, { status: 403 });
    }

    const userRole = await db.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId, assignedById: session.user.id },
      include: { role: { select: { id: true, code: true, name: true } } },
    });

    await db.employee.update({
      where: { id: userId },
      data: { role: role.code },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "ASSIGN_ROLE",
        resource: `employee:${userId}`,
        details: JSON.stringify({ roleId, roleCode: role.code }),
      },
    });

    return NextResponse.json({ data: userRole });
  } catch (error) {
    console.error("[USER_ROLES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.id, "users.employee.update");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await context.params;
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return NextResponse.json({ error: "roleId query param is required" }, { status: 400 });
    }

    // ── Policy Enforcement: Role Revocation ───────────────────────────────
    const policyCheck = await enforceUserManagement("ROLE_ASSIGN", userId);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: policyCheck.decision.blockReason || "Role revocation blocked by policy",
        decisions: policyCheck.decision.decisions,
      }, { status: 403 });
    }

    await db.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    const remaining = await db.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { assignedAt: "desc" },
    });

    const primaryRole = remaining[0]?.role.code || "EMPLOYEE";
    await db.employee.update({
      where: { id: userId },
      data: { role: primaryRole },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "REVOKE_ROLE",
        resource: `employee:${userId}`,
        details: JSON.stringify({ roleId }),
      },
    });

    return NextResponse.json({ message: "Role revoked", primaryRole });
  } catch (error) {
    console.error("[USER_ROLES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
