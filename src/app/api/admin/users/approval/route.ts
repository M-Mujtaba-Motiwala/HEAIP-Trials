// =============================================================================
// Admin Registration Approval API — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Endpoint for admins to approve or reject pending employee registrations.
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canApprove = await hasPermission(session.user.id, "registration.approve");
    if (!canApprove) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = await db.employee.findMany({
      where: { registrationStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        userType: true,
        registrationStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: pending, total: pending.length });
  } catch (error) {
    console.error("[APPROVAL_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canApprove = await hasPermission(session.user.id, "registration.approve");
    if (!canApprove && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Lack registration.approve permission." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action } = body; // action: "APPROVE" | "REJECT"

    if (!userId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters. Specify userId and action ('APPROVE' or 'REJECT')." }, { status: 400 });
    }

    const targetEmployee = await db.employee.findUnique({ where: { id: userId } });
    if (!targetEmployee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updatedEmployee = await db.employee.update({
      where: { id: userId },
      data: { registrationStatus: newStatus },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: action === "APPROVE" ? "REGISTRATION_APPROVED" : "REGISTRATION_REJECTED",
        resource: "Employee",
        details: JSON.stringify({
          targetUserId: userId,
          employeeId: targetEmployee.employeeId,
          newStatus,
        }),
      },
    });

    return NextResponse.json({
      message: `Employee ${targetEmployee.employeeId} registration ${newStatus.toLowerCase()}.`,
      employee: {
        id: updatedEmployee.id,
        employeeId: updatedEmployee.employeeId,
        registrationStatus: updatedEmployee.registrationStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Registration approval error:", error);
    return NextResponse.json({ error: "Failed to process registration approval." }, { status: 500 });
  }
}
