// =============================================================================
// Employee Registration Endpoint — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Self-registration endpoint with Admin Approval Workflow:
// Registers employee with PENDING status requiring admin review before sign-in.
// =============================================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, employeeId, password, designation, userType } = body;

    // 1. Basic field validation
    if (!name || !email || !employeeId || !password || !designation) {
      return NextResponse.json(
        { error: "All required fields must be filled." },
        { status: 400 }
      );
    }

    if (userType && userType !== "EMPLOYEE") {
      return NextResponse.json({ error: "Third-party and guest accounts must be created by an administrator." }, { status: 403 });
    }

    // 2. Email format & domain validation
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();
    const masterEmployee = await db.employeeMaster.findFirst({
      where: { employeeId: normalizedEmployeeId, companyEmail: normalizedEmail, isActive: true },
    });
    if (!masterEmployee) {
      return NextResponse.json({ error: "Employee ID and company email could not be verified." }, { status: 403 });
    }

    // 3. Employee ID uniqueness check
    const existingEmployeeId = await db.employee.findUnique({
      where: { employeeId: normalizedEmployeeId },
    });
    if (existingEmployeeId) {
      return NextResponse.json(
        { error: "An account with this Employee ID already exists." },
        { status: 409 }
      );
    }

    // 4. Email uniqueness check
    const existingEmail = await db.employee.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Master data is authoritative for employee identity and organization fields.
    const deptRecord = await db.department.findFirst({ where: { name: masterEmployee.department } });

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create Employee record with PENDING status (Admin Approval Workflow)
    const newEmployee = await db.employee.create({
      data: {
        employeeId: normalizedEmployeeId,
        name: masterEmployee.name || name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        department: masterEmployee.department,
        departmentId: deptRecord?.id || null,
        designation: masterEmployee.designation || designation.trim(),
        role: "EMPLOYEE",
        userType: "EMPLOYEE",
        registrationStatus: "PENDING", // Requires Admin Approval
        isActive: true,
      },
    });

    // 8. Assign default EMPLOYEE dRBAC role
    const empRole = await db.role.findUnique({ where: { code: "EMPLOYEE" } });
    if (empRole) {
      await db.userRole.create({
        data: {
          userId: newEmployee.id,
          roleId: empRole.id,
        },
      });
    }

    // 9. Log in AuditLog
    await db.auditLog.create({
      data: {
        actorId: newEmployee.id,
        action: "REGISTRATION_SUBMITTED",
        resource: "Employee",
        details: JSON.stringify({
          employeeId: newEmployee.employeeId,
          email: newEmployee.email,
          registrationStatus: "PENDING",
        }),
      },
    });

    return NextResponse.json(
      {
        message: "Registration submitted successfully! Your account is pending admin approval.",
        employeeId: newEmployee.employeeId,
        registrationStatus: "PENDING",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
