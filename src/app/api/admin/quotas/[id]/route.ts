// =============================================================================
// Single Quota Config — PATCH, DELETE
// =============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.quotaConfig.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Quota not found." }, { status: 404 });

    const body = await req.json();
    const {
      monthlyBudgetPkr, dailyBudgetPkr, yearlyBudgetPkr,
      monthlyTokenLimit, dailyTokenLimit,
      monthlyRequestLimit, dailyRequestLimit,
      maxConcurrentSessions, monthlyUploadLimit, maxFileSizeBytes,
      modelLimitsJson, status, effectiveAt, expiresAt,
    } = body;

    const quota = await db.quotaConfig.update({
      where: { id },
      data: {
        ...(monthlyBudgetPkr !== undefined && { monthlyBudgetPkr }),
        ...(dailyBudgetPkr !== undefined && { dailyBudgetPkr }),
        ...(yearlyBudgetPkr !== undefined && { yearlyBudgetPkr }),
        ...(monthlyTokenLimit !== undefined && { monthlyTokenLimit }),
        ...(dailyTokenLimit !== undefined && { dailyTokenLimit }),
        ...(monthlyRequestLimit !== undefined && { monthlyRequestLimit }),
        ...(dailyRequestLimit !== undefined && { dailyRequestLimit }),
        ...(maxConcurrentSessions !== undefined && { maxConcurrentSessions }),
        ...(monthlyUploadLimit !== undefined && { monthlyUploadLimit }),
        ...(maxFileSizeBytes !== undefined && { maxFileSizeBytes }),
        ...(modelLimitsJson !== undefined && { modelLimitsJson: typeof modelLimitsJson === "string" ? modelLimitsJson : JSON.stringify(modelLimitsJson) }),
        ...(status !== undefined && { status }),
        ...(effectiveAt !== undefined && { effectiveAt: effectiveAt ? new Date(effectiveAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "UPDATE_QUOTA_CONFIG",
        resource: `quotaConfig:${id}`,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({ data: quota });
  } catch (error) {
    console.error("[QUOTA_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("settings.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;

  try {
    const existing = await db.quotaConfig.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Quota not found." }, { status: 404 });

    // Don't allow deleting org default
    if (existing.scope === "ORGANIZATION" && !existing.scopeTargetId) {
      return NextResponse.json({ error: "Cannot delete organization default quota." }, { status: 400 });
    }

    await db.quotaConfig.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "DELETE_QUOTA_CONFIG",
        resource: `quotaConfig:${id}`,
        details: JSON.stringify({ scope: existing.scope, scopeTargetId: existing.scopeTargetId }),
      },
    });

    return NextResponse.json({ message: "Quota deleted." });
  } catch (error) {
    console.error("[QUOTA_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
