// =============================================================================
// Quota Service — Hamdard AI Platform
// Hierarchical quota evaluation: User → Team → Department → Organization
// =============================================================================

import { db } from "@/lib/db";

export const PKR_PER_USD = 280;
export const DEFAULT_MONTHLY_QUOTA_PKR = 15000;

export interface QuotaResult {
  monthlyBudgetPkr: number | null;
  dailyBudgetPkr: number | null;
  yearlyBudgetPkr: number | null;
  monthlyTokenLimit: number | null;
  dailyTokenLimit: number | null;
  monthlyRequestLimit: number | null;
  dailyRequestLimit: number | null;
  maxConcurrentSessions: number | null;
  monthlyUploadLimit: number | null;
  maxFileSizeBytes: number | null;
  modelLimits: Record<string, { dailyRequests?: number; costCeiling?: number }>;
  source: "USER" | "TEAM" | "DEPARTMENT" | "ORGANIZATION" | "DEFAULT";
}

/**
 * Resolve quota hierarchically: User → Team → Department → Organization → Default
 * The first non-null value wins for each field.
 */
export async function resolveQuota(
  userId: string,
  departmentId?: string,
  teamId?: string
): Promise<QuotaResult> {
  const now = new Date();

  // Fetch all applicable quota configs
  const [userQuota, teamQuota, deptQuota, orgQuota] = await Promise.all([
    // User-level quota
    db.quotaConfig.findUnique({
      where: { scope_scopeTargetId: { scope: "USER", scopeTargetId: userId } },
    }),
    // Team-level quota
    teamId ? db.quotaConfig.findUnique({
      where: { scope_scopeTargetId: { scope: "TEAM", scopeTargetId: teamId } },
    }) : null,
    // Department-level quota
    departmentId ? db.quotaConfig.findUnique({
      where: { scope_scopeTargetId: { scope: "DEPARTMENT", scopeTargetId: departmentId } },
    }) : null,
    // Organization-level quota
    db.quotaConfig.findUnique({
      where: { scope_scopeTargetId: { scope: "ORGANIZATION", scopeTargetId: null as unknown as string } },
    }),
  ]);

  // Filter out expired quotas
  const isExpired = (q: { expiresAt: Date | null } | null) =>
    q?.expiresAt && q.expiresAt < now;

  const quotas = [userQuota, teamQuota, deptQuota, orgQuota].filter(
    (q): q is NonNullable<typeof q> => q !== null && !isExpired(q) && q.status === "ACTIVE"
  );

  // Merge quotas: first non-null value wins for each field
  const result: QuotaResult = {
    monthlyBudgetPkr: null,
    dailyBudgetPkr: null,
    yearlyBudgetPkr: null,
    monthlyTokenLimit: null,
    dailyTokenLimit: null,
    monthlyRequestLimit: null,
    dailyRequestLimit: null,
    maxConcurrentSessions: null,
    monthlyUploadLimit: null,
    maxFileSizeBytes: null,
    modelLimits: {},
    source: "DEFAULT",
  };

  const fieldPriority: Array<keyof QuotaResult> = [
    "monthlyBudgetPkr", "dailyBudgetPkr", "yearlyBudgetPkr",
    "monthlyTokenLimit", "dailyTokenLimit",
    "monthlyRequestLimit", "dailyRequestLimit",
    "maxConcurrentSessions", "monthlyUploadLimit", "maxFileSizeBytes",
  ];

  const sourceOrder = ["USER", "TEAM", "DEPARTMENT", "ORGANIZATION"] as const;

  for (let i = quotas.length - 1; i >= 0; i--) {
    const q = quotas[i];
    const sourceIdx = sourceOrder.indexOf(q.scope as "USER" | "TEAM" | "DEPARTMENT" | "ORGANIZATION");
    const sourceName = sourceIdx >= 0 ? sourceOrder[sourceIdx] : "ORGANIZATION";

    for (const field of fieldPriority) {
      const value = q[field as keyof typeof q];
      if (value !== null && value !== undefined && result[field] === null) {
        (result as unknown as Record<string, unknown>)[field] = value;
      }
    }

    // Parse model limits
    if (q.modelLimitsJson) {
      try {
        const parsed = JSON.parse(q.modelLimitsJson);
        if (typeof parsed === "object" && parsed !== null) {
          result.modelLimits = { ...parsed, ...result.modelLimits };
        }
      } catch { /* ignore */ }
    }

    if (result.source === "DEFAULT") {
      result.source = sourceName as typeof result.source;
    }
  }

  // Fallback to legacy SystemSetting if no quota config found
  if (result.monthlyBudgetPkr === null) {
    result.monthlyBudgetPkr = await getMonthlyQuotaPKR();
    result.source = "DEFAULT";
  }

  return result;
}

/**
 * Get monthly quota from legacy SystemSetting (backward compat).
 */
export async function getMonthlyQuotaPKR(): Promise<number> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "ai.monthly_quota_pkr" },
    });
    if (setting) {
      const parsed = Number(setting.value);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // Fall through to default if DB is unavailable
  }
  return DEFAULT_MONTHLY_QUOTA_PKR;
}

/**
 * Get monthly spend for a user (in PKR).
 */
export async function getMonthlySpendPKR(employeeId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageCount = await db.usageLog.aggregate({
    where: {
      employeeId,
      createdAt: { gte: startOfMonth },
    },
    _sum: { costUsd: true },
  });

  return (usageCount._sum.costUsd || 0) * PKR_PER_USD;
}

/**
 * Get daily spend for a user (in PKR).
 */
export async function getDailySpendPKR(employeeId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const usageCount = await db.usageLog.aggregate({
    where: {
      employeeId,
      createdAt: { gte: startOfDay },
    },
    _sum: { costUsd: true },
  });

  return (usageCount._sum.costUsd || 0) * PKR_PER_USD;
}

/**
 * Get daily request count for a user.
 */
export async function getDailyRequestCount(employeeId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return db.usageLog.count({
    where: {
      employeeId,
      createdAt: { gte: startOfDay },
    },
  });
}

/**
 * Get monthly request count for a user.
 */
export async function getMonthlyRequestCount(employeeId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return db.usageLog.count({
    where: {
      employeeId,
      createdAt: { gte: startOfMonth },
    },
  });
}
