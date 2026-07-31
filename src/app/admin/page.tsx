// =============================================================================
// Admin Overview Page — Dashboard stats, recent activity, top users
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Users,
  MessageSquare,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await auth();

  // Fetch real stats from the database
  const [
    totalEmployees,
    activeEmployees,
    totalSessions,
    totalMessages,
    totalUsageLogs,
    recentAuditLogs,
    topUsers,
  ] = await Promise.all([
    db.employee.count({ where: { registrationStatus: "APPROVED" } }),
    db.employee.count({ where: { registrationStatus: "APPROVED", isActive: true } }),
    db.chatSession.count(),
    db.message.count(),
    db.usageLog.aggregate({
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
      _count: true,
    }),
    db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true, department: true } } },
    }),
    db.usageLog.groupBy({
      by: ["employeeId"],
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
      _count: true,
      orderBy: { _count: { employeeId: "desc" } },
      take: 5,
    }),
  ]);

  const totalTokens =
    (totalUsageLogs._sum.tokensInput || 0) +
    (totalUsageLogs._sum.tokensOutput || 0);
  const totalCost = totalUsageLogs._sum.costUsd || 0;

  // Fetch user names for top users
  const topUserIds = topUsers.map((u) => u.employeeId);
  const topUserNames = await db.employee.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, department: true },
  });
  const userNameMap = Object.fromEntries(
    topUserNames.map((u) => [u.id, u])
  );

  return (
    <>
      {/* Page Header */}
      <div className={styles.adminPageHeader}>
        <h1 className={styles.adminPageTitle}>Dashboard Overview</h1>
        <p className={styles.adminPageSubtitle}>
          Welcome back, {session?.user?.name}. Here&apos;s what&apos;s happening on the platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{totalEmployees}</div>
            <div className={styles.statLabel}>Total Employees</div>
            <div className={`${styles.statTrend} ${styles.up}`}>
              <TrendingUp size={12} />
              {activeEmployees} active
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <MessageSquare size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{totalSessions}</div>
            <div className={styles.statLabel}>Chat Sessions</div>
            <div className={`${styles.statTrend} ${styles.up}`}>
              <Activity size={12} />
              {totalMessages} messages
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.gold}`}>
            <Zap size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {totalTokens > 1000
                ? `${(totalTokens / 1000).toFixed(1)}K`
                : totalTokens}
            </div>
            <div className={styles.statLabel}>Tokens Used</div>
            <div className={`${styles.statTrend} ${styles.up}`}>
              <TrendingUp size={12} />
              {totalUsageLogs._count} requests
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.red}`}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>${totalCost.toFixed(2)}</div>
            <div className={styles.statLabel}>Total Cost</div>
            <div className={`${styles.statTrend} ${styles.down}`}>
              <TrendingDown size={12} />
              Within budget
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className={styles.twoColumn}>
        {/* Recent Activity */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Activity size={18} />
              Recent Activity
            </h2>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.activityList}>
              {recentAuditLogs.length > 0 ? (
                recentAuditLogs.map((log) => (
                  <div key={log.id} className={styles.activityItem}>
                    <div className={styles.activityDot} />
                    <div className={styles.activityContent}>
                      <p className={styles.activityText}>
                        <strong>{log.actor.name}</strong> {log.action}{" "}
                        {log.resource}
                      </p>
                      <span className={styles.activityTime}>
                        {log.createdAt.toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
                  No activity recorded yet. Activity will appear here as employees use the platform.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <TrendingUp size={18} />
              Top Users by Activity
            </h2>
          </div>
          <div className={styles.sectionBody}>
            {topUsers.length > 0 ? (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user) => {
                    const info = userNameMap[user.employeeId];
                    return (
                      <tr key={user.employeeId}>
                        <td>{info?.name || "Unknown"}</td>
                        <td>{info?.department || "—"}</td>
                        <td>{user._count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
                No usage data yet. Stats will appear once employees start using the AI chat.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
