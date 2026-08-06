// =============================================================================
// Resolve Quota — Hierarchical evaluation: User → Team → Department → Org
// =============================================================================
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveQuota, type QuotaResult } from "@/lib/quota";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.employee.findUnique({
      where: { id: session.user.id },
      select: { id: true, departmentId: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const quota = await resolveQuota(user.id, user.departmentId || undefined, user.teamId || undefined);

    return NextResponse.json({ data: quota });
  } catch (error) {
    console.error("[QUOTA_RESOLVE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
