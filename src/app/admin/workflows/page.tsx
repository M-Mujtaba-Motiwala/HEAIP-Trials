// =============================================================================
// Admin Workflows Page — Manage automated approval pipelines
// =============================================================================

"use client";

import { useState } from "react";
import { 
  GitBranch, 
  Search, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ExternalLink
} from "lucide-react";
import adminStyles from "../admin.module.css";
import styles from "./workflows.module.css";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  status: "Draft" | "Pending Approval" | "Published" | "Running" | "Paused" | "Completed" | "Failed";
  lastRun: string;
  runsCount: number;
}

const INITIAL_WORKFLOWS: Workflow[] = [
  { id: "1", name: "Contract Risk Assessment", trigger: "On File Upload (.docx)", status: "Published", lastRun: "2026-07-30 11:20", runsCount: 142 },
  { id: "2", name: "Finance Policy Approval", trigger: "On Policy Deviation Detected", status: "Pending Approval", lastRun: "—", runsCount: 0 },
  { id: "3", name: "Employee Onboarding Agent", trigger: "On Registration Approval", status: "Published", lastRun: "2026-07-29 09:15", runsCount: 38 },
  { id: "4", name: "Quarterly Analytics Aggregator", trigger: "Cron Schedule (Every 3 Months)", status: "Paused", lastRun: "2026-06-30 00:00", runsCount: 4 },
];

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(INITIAL_WORKFLOWS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("On File Upload");

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.trigger.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === id) {
        const nextStatus = w.status === "Published" ? "Paused" : "Published";
        return { ...w, status: nextStatus };
      }
      return w;
    }));
  };

  const deleteWorkflow = (id: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      setWorkflows(prev => prev.filter(w => w.id !== id));
    }
  };

  const handleAddWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newWf: Workflow = {
      id: String(workflows.length + 1),
      name: newName,
      trigger: newTrigger,
      status: "Draft",
      lastRun: "—",
      runsCount: 0
    };

    setWorkflows(prev => [...prev, newWf]);
    setNewName("");
    setIsModalOpen(false);
  };

  const getStatusBadge = (status: Workflow["status"]) => {
    switch (status) {
      case "Published":
      case "Completed":
        return <span className={`${styles.statusBadge} ${styles.published}`}><CheckCircle2 size={12} /> {status}</span>;
      case "Paused":
      case "Pending Approval":
        return <span className={`${styles.statusBadge} ${styles.paused}`}><Clock size={12} /> {status}</span>;
      case "Failed":
        return <span className={`${styles.statusBadge} ${styles.failed}`}><AlertCircle size={12} /> {status}</span>;
      default:
        return <span className={`${styles.statusBadge} ${styles.draft}`}>{status}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={adminStyles.adminPageHeader}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className={adminStyles.adminPageTitle}>Automated Agent Workflows</h1>
            <p className={adminStyles.adminPageSubtitle}>Design triggers, approval paths, and pipelines linking AI capabilities with tools.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Create Workflow
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search workflows..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={adminStyles.sectionCard}>
        <div className={adminStyles.sectionHeader}>
          <h2 className={adminStyles.sectionTitle}>
            <GitBranch size={18} /> Orchestrated Workflows
          </h2>
        </div>
        <table className={adminStyles.dataTable}>
          <thead>
            <tr>
              <th>Workflow Name</th>
              <th>Trigger Type</th>
              <th>Status</th>
              <th>Run Stats</th>
              <th>Last Executed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                  <div className={styles.emptyState}>No workflows defined yet.</div>
                </td>
              </tr>
            ) : (
              filteredWorkflows.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td>{w.trigger}</td>
                  <td>{getStatusBadge(w.status)}</td>
                  <td>{w.runsCount} executions</td>
                  <td>{w.lastRun}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => toggleStatus(w.id)}
                        disabled={w.status === "Pending Approval" || w.status === "Draft"}
                        title={w.status === "Published" ? "Pause Workflow" : "Publish Workflow"}
                      >
                        {w.status === "Published" ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => deleteWorkflow(w.id)}
                        title="Delete Workflow"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Design New AI Agent Workflow</h3>
            <form onSubmit={handleAddWorkflow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Workflow Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Leave Request Document Parsing"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Trigger Condition</label>
                <select 
                  className={styles.select}
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                >
                  <option value="On File Upload">On File Upload (RAG ingestion)</option>
                  <option value="On User Message">On User Conversation Trigger</option>
                  <option value="On Policy Deviation">On AI Compliance Deviation</option>
                  <option value="Cron Schedule">Cron Recurring Job (Hourly/Daily)</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Initialize Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
