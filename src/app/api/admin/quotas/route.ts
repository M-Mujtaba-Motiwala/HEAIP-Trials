// =============================================================================
// Quota Configuration Management — CRUD + Hierarchical Resolution
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;

  try {
    const quotas = await db.quotaConfig.findMany({
      orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: quotas });
  } catch (error) {
    console.error("[QUOTAS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const {
      scope, scopeTargetId,
      monthlyBudgetPkr, dailyBudgetPkr, yearlyBudgetPkr,
      monthlyTokenLimit, dailyTokenLimit,
      monthlyRequestLimit, dailyRequestLimit,
      maxConcurrentSessions, monthlyUploadLimit, maxFileSizeBytes,
      modelLimitsJson, effectiveAt, expiresAt,
    } = body;

    if (!scope) {
      return NextResponse.json({ error: "Scope is required." }, { status: 400 });
    }

    const validScopes = ["ORGANIZATION", "DEPARTMENT", "TEAM", "USER", "MODEL"];
    if (!validScopes.includes(scope)) {
      return NextResponse.json({ error: `Invalid scope. Must be one of: ${validScopes.join(", ")}` }, { status: 400 });
    }

    const quota = await db.quotaConfig.create({
      data: {
        scope,
        scopeTargetId: scopeTargetId || null,
        monthlyBudgetPkr: monthlyBudgetPkr ?? null,
        dailyBudgetPkr: dailyBudgetPkr ?? null,
        yearlyBudgetPkr: yearlyBudgetPkr ?? null,
        monthlyTokenLimit: monthlyTokenLimit ?? null,
        dailyTokenLimit: dailyTokenLimit ?? null,
        monthlyRequestLimit: monthlyRequestLimit ?? null,
        dailyRequestLimit: dailyRequestLimit ?? null,
        maxConcurrentSessions: maxConcurrentSessions ?? null,
        monthlyUploadLimit: monthlyUploadLimit ?? null,
        maxFileSizeBytes: maxFileSizeBytes ?? null,
        modelLimitsJson: typeof modelLimitsJson === "string" ? modelLimitsJson : JSON.stringify(modelLimitsJson || {}),
        effectiveAt: effectiveAt ? new Date(effectiveAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "CREATE_QUOTA_CONFIG",
        resource: `quotaConfig:${quota.id}`,
        details: JSON.stringify({ scope, scopeTargetId, monthlyBudgetPkr }),
      },
    });

    return NextResponse.json({ data: quota }, { status: 201 });
  } catch (error) {
    console.error("[QUOTAS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
