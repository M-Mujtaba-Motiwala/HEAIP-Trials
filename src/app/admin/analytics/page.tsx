// =============================================================================
// Admin Analytics Page — Usage analytics with department breakdowns
// =============================================================================

import { db } from "@/lib/db";
import styles from "../admin.module.css";

export default async function AdminAnalyticsPage() {
  // Usage by department
  const usageByDept = await db.usageLog.groupBy({
    by: ["department"],
    _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
    _count: true,
    orderBy: { _count: { department: "desc" } },
  });

  // Usage by AI provider
  const usageByProvider = await db.usageLog.groupBy({
    by: ["aiProvider"],
    _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
    _count: true,
    orderBy: { _count: { aiProvider: "desc" } },
  });

  // Usage by model
  const usageByModel = await db.usageLog.groupBy({
    by: ["aiModel"],
    _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
    _count: true,
    orderBy: { _count: { aiModel: "desc" } },
  });

  return (
    <>
      <div className={styles.adminPageHeader}>
        <h1 className={styles.adminPageTitle}>Usage Analytics</h1>
        <p className={styles.adminPageSubtitle}>
          Platform usage breakdown by department, provider, and model
        </p>
      </div>

      {/* Usage by Department */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Usage by Department</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Requests</th>
                <th>Input Tokens</th>
                <th>Output Tokens</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {usageByDept.length > 0 ? (
                usageByDept.map((row) => (
                  <tr key={row.department}>
                    <td style={{ fontWeight: 500 }}>{row.department}</td>
                    <td>{row._count}</td>
                    <td>{(row._sum.tokensInput || 0).toLocaleString()}</td>
                    <td>{(row._sum.tokensOutput || 0).toLocaleString()}</td>
                    <td>${(row._sum.costUsd || 0).toFixed(4)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                    No usage data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.twoColumn}>
        {/* Usage by Provider */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Usage by Provider</h2>
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
                {usageByProvider.length > 0 ? (
                  usageByProvider.map((row) => (
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
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage by Model */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Usage by Model</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Requests</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {usageByModel.length > 0 ? (
                  usageByModel.map((row) => (
                    <tr key={row.aiModel}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                        {row.aiModel}
                      </td>
                      <td>{row._count}</td>
                      <td>${(row._sum.costUsd || 0).toFixed(4)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                      No data yet
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
