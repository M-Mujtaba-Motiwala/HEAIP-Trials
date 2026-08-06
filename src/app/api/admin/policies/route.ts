import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

const POLICY_CATEGORIES = [
  "ACCESS_AUTHORIZATION",
  "AI_MODEL_ACCESS",
  "QUOTA_USAGE",
  "CONTENT_MODERATION",
  "DATA_PROTECTION",
  "ATTACHMENT_SECURITY",
  "CONFIDENTIALITY",
  "LEGAL_COMPLIANCE",
  "CONVERSATION_GOVERNANCE",
  "PROMPT_INJECTION",
  "KNOWLEDGE_BASE",
  "AI_RESPONSE_VALIDATION",
  "AUDIT_MONITORING",
  "DATA_RETENTION",
];

const POLICY_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const POLICY_SCOPES = ["ORGANIZATION", "DEPARTMENT", "TEAM", "ROLE", "USER"];
const POLICY_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"];

export async function GET(req: Request) {
  const guard = await requirePermission("policies.read");
  if ("error" in guard) return guard.error;
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category") || "";
    const severity = searchParams.get("severity") || "";
    const scope = searchParams.get("scope") || "";
    const status = searchParams.get("status") || "";
    const sort = searchParams.get("sort") || "priority";
    const order = searchParams.get("order") || "desc";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (scope) where.scope = scope;
    if (status) where.status = status;

    const orderBy: Record<string, string> = {};
    if (sort === "name") orderBy.name = order;
    else if (sort === "category") orderBy.category = order;
    else if (sort === "severity") orderBy.severity = order;
    else if (sort === "createdAt") orderBy.createdAt = order;
    else orderBy.priority = order;

    const policies = await db.aiPolicy.findMany({
      where,
      orderBy,
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

    return NextResponse.json({
      data: policies,
      meta: {
        total: policies.length,
        categories: POLICY_CATEGORIES,
        severities: POLICY_SEVERITIES,
        scopes: POLICY_SCOPES,
        statuses: POLICY_STATUSES,
      },
    });
  } catch (error) {
    console.error("[POLICIES_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requirePermission("policies.create");
  if ("error" in guard) return guard.error;
  try {
    const body = await request.json();
    const {
      name, description, category, policyType,
      severity, scope, scopeTargets, actions,
      conditions, exceptions, priority,
      effectiveAt, expiresAt, status,
    } = body;

    if (!name || !description || !category) {
      return NextResponse.json({ error: "Name, description, and category are required." }, { status: 400 });
    }

    if (!POLICY_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${POLICY_CATEGORIES.join(", ")}` }, { status: 400 });
    }

    if (severity && !POLICY_SEVERITIES.includes(severity)) {
      return NextResponse.json({ error: `Invalid severity. Must be one of: ${POLICY_SEVERITIES.join(", ")}` }, { status: 400 });
    }

    if (scope && !POLICY_SCOPES.includes(scope)) {
      return NextResponse.json({ error: `Invalid scope. Must be one of: ${POLICY_SCOPES.join(", ")}` }, { status: 400 });
    }

    if (status && !POLICY_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${POLICY_STATUSES.join(", ")}` }, { status: 400 });
    }

    const policy = await db.aiPolicy.create({
      data: {
        name,
        description,
        category,
        policyType: policyType || null,
        severity: severity || "MEDIUM",
        scope: scope || "ORGANIZATION",
        scopeTargets: typeof scopeTargets === "string" ? scopeTargets : JSON.stringify(scopeTargets || []),
        actions: typeof actions === "string" ? actions : JSON.stringify(actions || ["BLOCK_REQUEST"]),
        conditions: typeof conditions === "string" ? conditions : JSON.stringify(conditions || {}),
        exceptions: typeof exceptions === "string" ? exceptions : JSON.stringify(exceptions || []),
        priority: priority || 50,
        effectiveAt: effectiveAt ? new Date(effectiveAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: status || "ACTIVE",
        isActive: status !== "INACTIVE",
        createdById: guard.session.user.id,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "CREATE_AI_POLICY",
        resource: `aiPolicy:${policy.id}`,
        details: JSON.stringify({ name, category, severity, scope, priority }),
      },
    });

    return NextResponse.json({ data: policy }, { status: 201 });
  } catch (error) {
    console.error("[POLICIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
