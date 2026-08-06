import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { enforceAnalyticsVisibility } from "@/lib/policy-enforcer";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission(session.user.id, "analytics.view");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Policy Enforcement: Analytics Visibility ──────────────────────────
    const visibility = await enforceAnalyticsVisibility();
    if (!visibility.allowed) {
      return NextResponse.json({
        error: "POLICY_BLOCKED",
        reason: visibility.decision.blockReason || "Analytics access denied by policy",
        decisions: visibility.decision.decisions,
      }, { status: 403 });
    }

    // Build department filter based on policy visibility
    const departmentFilter: Record<string, unknown> = {};
    if (!visibility.visibleDepartments.includes("*")) {
      if (visibility.visibleDepartments.length === 0) {
        // No departments visible — return empty
        return NextResponse.json({ data: [], totals: { tokensInput: 0, tokensOutput: 0, costUsd: 0, tokensTotal: 0 }, models: [] });
      }
      departmentFilter.department = { in: visibility.visibleDepartments };
    }

    // Aggregate usage by department (filtered by policy)
    const byDepartment = await db.usageLog.groupBy({
      by: ["department"],
      where: departmentFilter,
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
      _count: { id: true },
      orderBy: { _sum: { tokensInput: "desc" } },
    });

    const data = byDepartment.map((row) => ({
      department: row.department,
      tokensInput: row._sum.tokensInput ?? 0,
      tokensOutput: row._sum.tokensOutput ?? 0,
      costUsd: row._sum.costUsd ?? 0,
      _count: row._count,
    }));

    const totals = data.reduce(
      (acc, row) => ({
        tokensInput: acc.tokensInput + row.tokensInput,
        tokensOutput: acc.tokensOutput + row.tokensOutput,
        costUsd: acc.costUsd + row.costUsd,
      }),
      { tokensInput: 0, tokensOutput: 0, costUsd: 0 }
    );

    // Model distribution (filtered by policy)
    const byModel = await db.usageLog.groupBy({
      by: ["aiProvider", "aiModel"],
      where: departmentFilter,
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
      orderBy: { aiProvider: "asc" },
      take: 30,
    });

    return NextResponse.json({
      data,
      totals: {
        ...totals,
        tokensTotal: totals.tokensInput + totals.tokensOutput,
      },
      models: byModel,
      // Include visibility info for the frontend
      _visibility: {
        costVisible: visibility.costVisible,
        departments: visibility.visibleDepartments,
      },
    });
  } catch (error: unknown) {
    console.error("[ANALYTICS_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
