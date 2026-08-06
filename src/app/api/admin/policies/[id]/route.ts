import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

const POLICY_CATEGORIES = [
  "ACCESS_AUTHORIZATION", "AI_MODEL_ACCESS", "QUOTA_USAGE", "CONTENT_MODERATION",
  "DATA_PROTECTION", "ATTACHMENT_SECURITY", "CONFIDENTIALITY", "LEGAL_COMPLIANCE",
  "CONVERSATION_GOVERNANCE", "PROMPT_INJECTION", "KNOWLEDGE_BASE",
  "AI_RESPONSE_VALIDATION", "AUDIT_MONITORING", "DATA_RETENTION",
];

const POLICY_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const POLICY_SCOPES = ["ORGANIZATION", "DEPARTMENT", "TEAM", "ROLE", "USER"];
const POLICY_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("policies.read");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const policy = await db.aiPolicy.findUnique({
      where: { id },
      select: {
        id: true, name: true, description: true, category: true,
        policyType: true, severity: true, scope: true, scopeTargets: true,
        actions: true, conditions: true, exceptions: true,
        priority: true, effectiveAt: true, expiresAt: true,
        status: true, version: true, isActive: true,
        createdAt: true, updatedAt: true,
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        _count: { select: { evaluationLogs: true } },
      },
    });
    if (!policy) return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("[POLICY_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("policies.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const existing = await db.aiPolicy.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    const body = await req.json();
    const {
      name, description, category, policyType,
      severity, scope, scopeTargets, actions,
      conditions, exceptions, priority,
      effectiveAt, expiresAt, status, isActive,
    } = body;

    if (category && !POLICY_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category.` }, { status: 400 });
    }
    if (severity && !POLICY_SEVERITIES.includes(severity)) {
      return NextResponse.json({ error: `Invalid severity.` }, { status: 400 });
    }
    if (scope && !POLICY_SCOPES.includes(scope)) {
      return NextResponse.json({ error: `Invalid scope.` }, { status: 400 });
    }
    if (status && !POLICY_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status.` }, { status: 400 });
    }

    const policy = await db.aiPolicy.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(policyType !== undefined && { policyType: policyType || null }),
        ...(severity !== undefined && { severity }),
        ...(scope !== undefined && { scope }),
        ...(scopeTargets !== undefined && {
          scopeTargets: typeof scopeTargets === "string" ? scopeTargets : JSON.stringify(scopeTargets),
        }),
        ...(actions !== undefined && {
          actions: typeof actions === "string" ? actions : JSON.stringify(actions),
        }),
        ...(conditions !== undefined && {
          conditions: typeof conditions === "string" ? conditions : JSON.stringify(conditions),
        }),
        ...(exceptions !== undefined && {
          exceptions: typeof exceptions === "string" ? exceptions : JSON.stringify(exceptions),
        }),
        ...(priority !== undefined && { priority }),
        ...(effectiveAt !== undefined && { effectiveAt: effectiveAt ? new Date(effectiveAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(status !== undefined && { status }),
        ...(isActive !== undefined && { isActive }),
        version: existing.version + 1,
        updatedById: guard.session.user.id,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "UPDATE_AI_POLICY",
        resource: `aiPolicy:${id}`,
        details: JSON.stringify({ ...body, previousVersion: existing.version }),
      },
    });

    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("[POLICY_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("policies.update");
  if ("error" in guard) return guard.error;
  const { id } = await params;
  try {
    const existing = await db.aiPolicy.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    // Hard delete - remove evaluation logs first
    await db.policyEvaluationLog.deleteMany({ where: { policyId: id } });
    await db.aiPolicy.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "DELETE_AI_POLICY",
        resource: `aiPolicy:${id}`,
        details: JSON.stringify({ name: existing.name, category: existing.category }),
      },
    });

    return NextResponse.json({ message: "Policy deleted." });
  } catch (error) {
    console.error("[POLICY_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
