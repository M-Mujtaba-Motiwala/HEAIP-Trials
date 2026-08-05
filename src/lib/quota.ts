// =============================================================================
// Quota Service — Hamdard AI Platform
// Single source of truth for monthly AI spend limits and PKR conversion.
// The monthly quota is configurable via the SystemSetting `ai.monthly_quota_pkr`.
// =============================================================================

import { db } from "@/lib/db";

export const PKR_PER_USD = 280;
export const DEFAULT_MONTHLY_QUOTA_PKR = 15000;

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
