import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserRoles } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserRoles(session.user.id);
    if (!roles.some(r => r.code === "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allRoles = await db.role.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" }
    });

    const allPermissions = await db.permission.findMany({
      orderBy: [{ module: "asc" }, { permissionKey: "asc" }]
    });

    const rolePermissions = await db.rolePermission.findMany();
    
    // Build matrix
    const matrix: Record<string, string[]> = {};
    for (const r of allRoles) {
      matrix[r.id] = rolePermissions
        .filter(rp => rp.roleId === r.id)
        .map(rp => allPermissions.find(p => p.id === rp.permissionId)?.permissionKey)
        .filter(Boolean) as string[];
    }

    return NextResponse.json({
      roles: allRoles,
      permissions: allPermissions,
      matrix
    });
  } catch (error) {
    console.error("GET permissions matrix error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = await getUserRoles(session.user.id);
    if (!userRoles.some(r => r.code === "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { roleId, permissionKeys } = await req.json();
    if (!roleId || !Array.isArray(permissionKeys)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const dbRole = await db.role.findUnique({ where: { id: roleId } });
    if (!dbRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // We can't easily edit SUPER_ADMIN this way, or maybe we can, but it has implicit access anyway.
    
    // Get all permissions to resolve IDs
    const allPermissions = await db.permission.findMany({
      where: { permissionKey: { in: permissionKeys } }
    });
    const permissionIds = allPermissions.map(p => p.id);

    // Transaction to replace permissions for this role
    await db.$transaction([
      db.rolePermission.deleteMany({ where: { roleId } }),
      db.rolePermission.createMany({
        data: permissionIds.map(pid => ({ roleId, permissionId: pid }))
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH permissions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
