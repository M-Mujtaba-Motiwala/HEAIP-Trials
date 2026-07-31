// =============================================================================
// Admin Policies Page — AI policy management
// =============================================================================

import { db } from "@/lib/db";
import styles from "../admin.module.css";
import { Shield, CheckCircle, XCircle } from "lucide-react";

export default async function AdminPoliciesPage() {
  const policies = await db.aiPolicy.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  return (
    <>
      <div className={styles.adminPageHeader}>
        <h1 className={styles.adminPageTitle}>AI Policies</h1>
        <p className={styles.adminPageSubtitle}>
          Configure guardrails, rate limits, and content filters for AI usage
        </p>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Shield size={18} />
            Active Policies
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Policy Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {policies.length > 0 ? (
                policies.map((policy) => (
                  <tr key={policy.id}>
                    <td style={{ fontWeight: 500 }}>{policy.name}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles.admin}`}>
                        {policy.policyType.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ maxWidth: "300px", fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                      {policy.description}
                    </td>
                    <td>
                      {policy.isActive ? (
                        <span style={{ color: "var(--color-success)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <XCircle size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td>{policy.createdBy.name}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-2xl)" }}>
                    No policies configured yet. Policies will help control AI usage across the organization.
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
