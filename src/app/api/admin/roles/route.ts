import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasManageAccess = await hasPermission(session.user.id, 'drbac.role.manage');
    if (!hasManageAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roles = await db.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { userRoles: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error('[ROLES_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasManageAccess = await hasPermission(session.user.id, 'drbac.role.manage');
    if (!hasManageAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, parentRoleId, delegationLevel } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    const role = await db.role.create({
      data: {
        code,
        name,
        description,
        parentRoleId: parentRoleId || null,
        delegationLevel: delegationLevel ? parseInt(delegationLevel.toString(), 10) : 0,
      }
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'CREATE_ROLE',
        resource: 'ROLE',
        details: JSON.stringify(role)
      }
    });

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('[ROLES_POST]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
