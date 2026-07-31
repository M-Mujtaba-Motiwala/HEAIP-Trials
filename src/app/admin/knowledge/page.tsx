// =============================================================================
// Admin Knowledge Base Page — Manage enterprise context sources
// =============================================================================

"use client";

import { useState } from "react";
import { 
  BookOpen, 
  Search, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Globe, 
  FileText, 
  Database,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import adminStyles from "../admin.module.css";
import styles from "./knowledge.module.css";

interface KnowledgeSource {
  id: string;
  name: string;
  type: "PDF" | "Word" | "Website" | "SharePoint" | "SQL";
  status: "Synced" | "Syncing" | "Failed";
  lastSync: string;
  documentCount: number;
}

const INITIAL_SOURCES: KnowledgeSource[] = [
  { id: "1", name: "Employee Handbook 2026.pdf", type: "PDF", status: "Synced", lastSync: "2026-07-29 10:24", documentCount: 1 },
  { id: "2", name: "HR Leave Policy Guidelines", type: "Word", status: "Synced", lastSync: "2026-07-28 14:15", documentCount: 1 },
  { id: "3", name: "Company SOP Portal", type: "Website", status: "Syncing", lastSync: "Syncing now...", documentCount: 45 },
  { id: "4", name: "SharePoint Wiki Archives", type: "SharePoint", status: "Synced", lastSync: "2026-07-25 09:00", documentCount: 120 },
  { id: "5", name: "Sales ERP DB Connector", type: "SQL", status: "Failed", lastSync: "2026-07-29 16:45", documentCount: 0 },
];

export default function AdminKnowledgePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>(INITIAL_SOURCES);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<KnowledgeSource["type"]>("PDF");

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const triggerSync = (id: string) => {
    setSources(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: "Syncing", lastSync: "Syncing now..." };
      }
      return s;
    }));
    // Simulate API callback
    setTimeout(() => {
      setSources(prev => prev.map(s => {
        if (s.id === id) {
          return { ...s, status: "Synced", lastSync: new Date().toISOString().replace('T', ' ').slice(0, 16) };
        }
        return s;
      }));
    }, 3000);
  };

  const deleteSource = (id: string) => {
    if (confirm("Are you sure you want to remove this knowledge source?")) {
      setSources(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    const newSource: KnowledgeSource = {
      id: String(sources.length + 1),
      name: newSourceName,
      type: newSourceType,
      status: "Syncing",
      lastSync: "Syncing now...",
      documentCount: newSourceType === "Website" ? 12 : 1
    };

    setSources(prev => [newSource, ...prev]);
    setNewSourceName("");
    setIsModalOpen(false);

    setTimeout(() => {
      setSources(prev => prev.map(s => {
        if (s.id === newSource.id) {
          return { ...s, status: "Synced", lastSync: new Date().toISOString().replace('T', ' ').slice(0, 16) };
        }
        return s;
      }));
    }, 4000);
  };

  const getTypeIcon = (type: KnowledgeSource["type"]) => {
    switch (type) {
      case "Website": return <Globe size={16} className={styles.typeIcon} />;
      case "SQL": return <Database size={16} className={styles.typeIcon} />;
      default: return <FileText size={16} className={styles.typeIcon} />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={adminStyles.adminPageHeader}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className={adminStyles.adminPageTitle}>Knowledge Base Configuration</h1>
            <p className={adminStyles.adminPageSubtitle}>Manage organizational datasets and pipelines serving context to AI agents.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Add Source
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search knowledge sources..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={adminStyles.sectionCard}>
        <div className={adminStyles.sectionHeader}>
          <h2 className={adminStyles.sectionTitle}>
            <BookOpen size={18} /> Enabled Context Pipelines
          </h2>
        </div>
        <table className={adminStyles.dataTable}>
          <thead>
            <tr>
              <th>Source Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Indexed Items</th>
              <th>Last Synced</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px" }}>
                  <div className={styles.emptyState}>No data sources configured.</div>
                </td>
              </tr>
            ) : (
              filteredSources.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <span className={styles.typeBadge}>
                      {getTypeIcon(s.type)}
                      {s.type}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[s.status.toLowerCase()]}`}>
                      {s.status === "Synced" && <CheckCircle2 size={12} />}
                      {s.status === "Failed" && <AlertCircle size={12} />}
                      {s.status === "Syncing" && <RefreshCw size={12} className={styles.spin} />}
                      {s.status}
                    </span>
                  </td>
                  <td>{s.documentCount} docs</td>
                  <td>{s.lastSync}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => triggerSync(s.id)}
                        disabled={s.status === "Syncing"}
                        title="Force Pipeline Re-Index"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => deleteSource(s.id)}
                        title="Remove Pipeline"
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
            <h3 className={styles.modalTitle}>Connect New Knowledge Pipeline</h3>
            <form onSubmit={handleAddSource}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Source Identifier / URI</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={newSourceName} 
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="e.g. SharePoint Legal Site or policies-s3-bucket"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Pipeline Type</label>
                <select 
                  className={styles.select}
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value as KnowledgeSource["type"])}
                >
                  <option value="PDF">PDF Document Repository</option>
                  <option value="Word">Word Documents (docx)</option>
                  <option value="Website">Website Web Crawler (RAG)</option>
                  <option value="SharePoint">Microsoft SharePoint Portal</option>
                  <option value="SQL">Relational SQL Database Schema</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Connect & Index</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
