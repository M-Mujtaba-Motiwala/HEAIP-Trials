import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasManageAccess = await hasPermission(session.user.id, 'drbac.role.manage');
    const hasAssignAccess = await hasPermission(session.user.id, 'drbac.permission.assign');
    
    if (!hasManageAccess && !hasAssignAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const permissions = await db.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    return NextResponse.json({ data: permissions });
  } catch (error) {
    console.error('[PERMISSIONS_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
