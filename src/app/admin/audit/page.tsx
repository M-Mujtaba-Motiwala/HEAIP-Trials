// =============================================================================
// Admin Audit Logs Page — Searchable audit trail
// =============================================================================

import { db } from "@/lib/db";
import styles from "../admin.module.css";

export default async function AdminAuditPage() {
  const auditLogs = await db.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { name: true, employeeId: true, department: true } },
    },
  });

  return (
    <>
      <div className={styles.adminPageHeader}>
        <h1 className={styles.adminPageTitle}>Audit Logs</h1>
        <p className={styles.adminPageSubtitle}>
          Complete record of all administrative and security-relevant actions
        </p>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Actions</h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
            Last 50 entries
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Department</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {log.createdAt.toLocaleDateString("en-PK", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.actor.name}</td>
                    <td>{log.actor.department}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles.employee}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resource}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-2xl)" }}>
                    No audit logs recorded yet. Actions will be logged as the platform is used.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
