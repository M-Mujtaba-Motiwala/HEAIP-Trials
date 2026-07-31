import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasManageAccess = await hasPermission(session.user.id, 'drbac.role.manage');
    if (!hasManageAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const role = await db.role.findUnique({
      where: { id: resolvedParams.id },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('[ROLE_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasManageAccess = await hasPermission(session.user.id, 'drbac.role.manage');
    if (!hasManageAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { code, name, description, parentRoleId, delegationLevel } = body;

    const role = await db.role.update({
      where: { id: resolvedParams.id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(parentRoleId !== undefined && { parentRoleId: parentRoleId || null }),
        ...(delegationLevel !== undefined && { delegationLevel: parseInt(delegationLevel.toString(), 10) }),
      }
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE_ROLE',
        resource: 'ROLE',
        details: JSON.stringify({ roleId: role.id, updates: body })
      }
    });

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('[ROLE_PATCH]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasManageAccess = await hasPermission(session.user.id, 'drbac.role.manage');
    if (!hasManageAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    
    // Check if role has users
    const usersCount = await db.userRole.count({
      where: { roleId: resolvedParams.id }
    });

    if (usersCount > 0) {
      return NextResponse.json({ error: 'Cannot delete role with assigned users. Reassign them first.' }, { status: 400 });
    }

    const role = await db.role.delete({
      where: { id: resolvedParams.id }
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'DELETE_ROLE',
        resource: 'ROLE',
        details: JSON.stringify({ roleId: role.id, name: role.name })
      }
    });

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('[ROLE_DELETE]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
