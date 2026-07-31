// =============================================================================
// Admin Costs Page — Cost tracking per provider and department
// =============================================================================

import { db } from "@/lib/db";
import styles from "../admin.module.css";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

export default async function AdminCostsPage() {
  const totalUsage = await db.usageLog.aggregate({
    _sum: { costUsd: true, tokensInput: true, tokensOutput: true },
    _count: true,
  });

  const costByDept = await db.usageLog.groupBy({
    by: ["department"],
    _sum: { costUsd: true },
    _count: true,
    orderBy: { _sum: { costUsd: "desc" } },
  });

  const costByProvider = await db.usageLog.groupBy({
    by: ["aiProvider"],
    _sum: { costUsd: true },
    _count: true,
    orderBy: { _sum: { costUsd: "desc" } },
  });

  const totalCost = totalUsage._sum.costUsd || 0;
  const budgetLimit = 500; // Monthly budget in USD
  const budgetUsed = (totalCost / budgetLimit) * 100;

  return (
    <>
      <div className={styles.adminPageHeader}>
        <h1 className={styles.adminPageTitle}>Cost Control</h1>
        <p className={styles.adminPageSubtitle}>
          Monitor AI spending across departments and providers
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>${totalCost.toFixed(2)}</div>
            <div className={styles.statLabel}>Total Spend</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.gold}`}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>${budgetLimit}</div>
            <div className={styles.statLabel}>Monthly Budget</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${budgetUsed > 80 ? styles.red : styles.blue}`}>
            {budgetUsed > 80 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{budgetUsed.toFixed(1)}%</div>
            <div className={styles.statLabel}>Budget Used</div>
          </div>
        </div>
      </div>

      <div className={styles.twoColumn}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cost by Department</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Requests</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {costByDept.length > 0 ? (
                  costByDept.map((row) => (
                    <tr key={row.department}>
                      <td style={{ fontWeight: 500 }}>{row.department}</td>
                      <td>{row._count}</td>
                      <td>${(row._sum.costUsd || 0).toFixed(4)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                      No cost data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cost by Provider</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Requests</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {costByProvider.length > 0 ? (
                  costByProvider.map((row) => (
                    <tr key={row.aiProvider}>
                      <td style={{ fontWeight: 500, textTransform: "capitalize" }}>
                        {row.aiProvider}
                      </td>
                      <td>{row._count}</td>
                      <td>${(row._sum.costUsd || 0).toFixed(4)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                      No cost data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
