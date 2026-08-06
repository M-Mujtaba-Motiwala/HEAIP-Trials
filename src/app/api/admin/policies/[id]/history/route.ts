import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("policies.read");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const existing = await db.aiPolicy.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    const logs = await db.policyEvaluationLog.findMany({
      where: { policyId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        employee: { select: { id: true, name: true, email: true } },
      },
    });

    // Aggregate stats
    const stats = await db.policyEvaluationLog.groupBy({
      by: ["decision"],
      where: { policyId: id },
      _count: { id: true },
    });

    return NextResponse.json({
      data: logs,
      stats: stats.map(s => ({ decision: s.decision, count: s._count.id })),
      total: logs.length,
    });
  } catch (error) {
    console.error("[POLICY_HISTORY]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
