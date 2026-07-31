import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function POST(request: Request) {
  const guard = await requirePermission("users.employee.create");
  if ("error" in guard) return guard.error;
  try {
    const body = await request.json();
    const { name, email, employeeId, password, departmentId, designation, userType, roleId } = body;
    if (!name || !email || !employeeId || !password || !designation || !departmentId || !["THIRD_PARTY", "GUEST"].includes(userType)) {
      return NextResponse.json({ error: "All required onboarding fields are invalid." }, { status: 400 });
    }
    const department = await db.department.findUnique({ where: { id: departmentId } });
    if (!department) return NextResponse.json({ error: "Department not found." }, { status: 404 });
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedEmployeeId = String(employeeId).trim().toUpperCase();
    const existing = await db.employee.findFirst({ where: { OR: [{ email: normalizedEmail }, { employeeId: normalizedEmployeeId }] } });
    if (existing) return NextResponse.json({ error: "Email or employee ID already exists." }, { status: 409 });
    const role = roleId ? await db.role.findUnique({ where: { id: roleId } }) : await db.role.findUnique({ where: { code: userType === "GUEST" ? "GUEST" : "CONTRACTOR" } });
    if (!role?.isActive) return NextResponse.json({ error: "A valid active role is required." }, { status: 400 });
    const employee = await db.$transaction(async (tx) => {
      const created = await tx.employee.create({ data: { employeeId: normalizedEmployeeId, name: String(name).trim(), email: normalizedEmail, password: await bcrypt.hash(String(password), 10), department: department.name, departmentId, designation: String(designation).trim(), role: role.code, userType, registrationStatus: "APPROVED" } });
      await tx.userRole.create({ data: { userId: created.id, roleId: role.id, assignedById: guard.session.user.id } });
      return created;
    });
    await db.auditLog.create({ data: { actorId: guard.session.user.id, action: "CREATE_EXTERNAL_USER", resource: `employee:${employee.id}`, details: JSON.stringify({ userType, roleId: role.id }) } });
    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (error) {
    console.error("[ONBOARDING_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
