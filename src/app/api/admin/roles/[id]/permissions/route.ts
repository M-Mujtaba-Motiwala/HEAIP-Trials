import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAssignAccess = await hasPermission(session.user.id, 'drbac.permission.assign');
    if (!hasAssignAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { permissionIds } = body; // array of permission IDs to set

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json({ error: 'permissionIds must be an array' }, { status: 400 });
    }

    // Validate all permission IDs exist
    if (permissionIds.length > 0) {
      const validPermissions = await db.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });
      if (validPermissions.length !== permissionIds.length) {
        const validIds = new Set(validPermissions.map(p => p.id));
        const invalidIds = permissionIds.filter((id: string) => !validIds.has(id));
        return NextResponse.json({ error: `Invalid permission IDs: ${invalidIds.join(", ")}` }, { status: 400 });
      }
    }

    // Protect system roles from full permission removal
    const role = await db.role.findUnique({ where: { id: resolvedParams.id }, select: { code: true } });
    if (role && ["SUPER_ADMIN"].includes(role.code) && permissionIds.length === 0) {
      return NextResponse.json({ error: "Cannot remove all permissions from SUPER_ADMIN role." }, { status: 400 });
    }

    // Wrap in a transaction: remove all existing, then insert new
    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: resolvedParams.id }
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((id: string) => ({
            roleId: resolvedParams.id,
            permissionId: id
          }))
        });
      }
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE_ROLE_PERMISSIONS',
        resource: 'ROLE',
        details: JSON.stringify({ roleId: resolvedParams.id, permissionIds })
      }
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('[ROLE_PERMISSIONS_POST]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
