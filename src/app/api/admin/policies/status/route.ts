import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePermission("policies.read");
  if ("error" in guard) return guard.error;

  try {
    // Get all active policies grouped by category
    const policies = await db.aiPolicy.findMany({
      where: { isActive: true, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        category: true,
        severity: true,
        scope: true,
        priority: true,
        actions: true,
      },
    });

    // Get evaluation statistics
    const totalEvaluations = await db.policyEvaluationLog.count();
    const blockedRequests = await db.policyEvaluationLog.count({
      where: { decision: "BLOCK_REQUEST" },
    });
    const recentViolations = await db.auditLog.count({
      where: {
        action: "POLICY_VIOLATION",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    // Map categories to protected modules
    const moduleProtection: Record<string, { protected: boolean; policyCount: number; categories: string[] }> = {
      "AI Chat": { protected: false, policyCount: 0, categories: [] },
      "File Upload": { protected: false, policyCount: 0, categories: [] },
      "Authentication": { protected: false, policyCount: 0, categories: [] },
      "Model Access": { protected: false, policyCount: 0, categories: [] },
      "Agent Management": { protected: false, policyCount: 0, categories: [] },
      "Workflow Management": { protected: false, policyCount: 0, categories: [] },
      "Analytics": { protected: false, policyCount: 0, categories: [] },
      "User Management": { protected: false, policyCount: 0, categories: [] },
      "Knowledge Base": { protected: false, policyCount: 0, categories: [] },
    };

    // Map policy categories to modules they protect
    const categoryModuleMap: Record<string, string[]> = {
      ACCESS_AUTHORIZATION: ["Authentication", "User Management"],
      AI_MODEL_ACCESS: ["Model Access", "AI Chat"],
      QUOTA_USAGE: ["AI Chat"],
      CONTENT_MODERATION: ["AI Chat"],
      DATA_PROTECTION: ["AI Chat", "File Upload"],
      ATTACHMENT_SECURITY: ["File Upload"],
      CONFIDENTIALITY: ["File Upload", "AI Chat", "Knowledge Base"],
      LEGAL_COMPLIANCE: ["AI Chat", "Analytics"],
      CONVERSATION_GOVERNANCE: ["AI Chat"],
      PROMPT_INJECTION: ["AI Chat"],
      KNOWLEDGE_BASE: ["Knowledge Base"],
      AI_RESPONSE_VALIDATION: ["AI Chat"],
      AUDIT_MONITORING: ["Analytics", "AI Chat"],
      DATA_RETENTION: ["Analytics"],
    };

    for (const policy of policies) {
      const modules = categoryModuleMap[policy.category] || [];
      for (const mod of modules) {
        if (moduleProtection[mod]) {
          moduleProtection[mod].protected = true;
          moduleProtection[mod].policyCount++;
          if (!moduleProtection[mod].categories.includes(policy.category)) {
            moduleProtection[mod].categories.push(policy.category);
          }
        }
      }
    }

    return NextResponse.json({
      summary: {
        totalPolicies: policies.length,
        totalEvaluations,
        blockedRequests,
        recentViolations,
        protectionRate: policies.length > 0 ? Math.round((Object.values(moduleProtection).filter(m => m.protected).length / Object.keys(moduleProtection).length) * 100) : 0,
      },
      moduleProtection,
      policiesByCategory: policies.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error("[POLICY_STATUS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
