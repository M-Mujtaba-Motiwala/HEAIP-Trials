// =============================================================================
// System Settings API — Configuration Engine
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

    const settings = await db.systemSetting.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    });

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
    const { key, value, category } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    const setting = await db.systemSetting.upsert({
      where: { key },
      update: { value: String(value), category: category || "SYSTEM" },
      create: { key, value: String(value), category: category || "SYSTEM" },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "SETTING_UPDATED",
        resource: "SystemSetting",
        details: JSON.stringify({ key, value }),
      },
    });

    return NextResponse.json({ setting });
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
