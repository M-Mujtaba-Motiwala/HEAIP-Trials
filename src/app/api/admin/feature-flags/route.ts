// =============================================================================
// Feature Flags API — Configuration Engine
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureFlags = await db.featureFlag.findMany({
      orderBy: { featureName: "asc" },
      include: {
        department: { select: { name: true, code: true } },
        role: { select: { name: true, code: true } },
      },
    });

    return NextResponse.json({ featureFlags });
  } catch {
    return NextResponse.json({ error: "Failed to fetch feature flags" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission(session.user.id, "settings.update");
    if (!canUpdate && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { featureName, enabled, departmentId, roleId } = body;

    if (!featureName) {
      return NextResponse.json({ error: "featureName is required" }, { status: 400 });
    }

    const flag = await db.featureFlag.upsert({
      where: { featureName },
      update: { enabled: !!enabled, departmentId, roleId },
      create: { featureName, enabled: !!enabled, departmentId, roleId },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "FEATURE_FLAG_UPDATED",
        resource: "FeatureFlag",
        details: JSON.stringify({ featureName, enabled: !!enabled }),
      },
    });

    return NextResponse.json({ flag });
  } catch {
    return NextResponse.json({ error: "Failed to update feature flag" }, { status: 500 });
  }
}
