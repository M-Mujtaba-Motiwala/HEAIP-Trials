"use client";

// =============================================================================
// AI Model Registry Client — CRUD table for admin model management
// Reuses users.module.css patterns for consistent admin UI
// =============================================================================

import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Star, StarOff, X } from "lucide-react";
import adminStyles from "../admin.module.css";
import styles from "../users/users.module.css";

interface AiModel {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  enabled: boolean;
  isDefault: boolean;
  metadataJson: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ModelFormData {
  provider: string;
  modelId: string;
  displayName: string;
  enabled: boolean;
  isDefault: boolean;
}

const EMPTY_FORM: ModelFormData = {
  provider: "google",
  modelId: "",
  displayName: "",
  enabled: true,
  isDefault: false,
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google (Gemini)",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  mistral: "Mistral AI",
  cohere: "Cohere",
};

function StatusBadge({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={enabled ? "Click to disable" : "Click to enable"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: "0.78rem",
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        background: enabled ? "var(--color-success-subtle, #dcfce7)" : "var(--bg-tertiary)",
        color: enabled ? "var(--color-success, #16a34a)" : "var(--text-tertiary)",
      }}
    >
      {enabled ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {enabled ? "Enabled" : "Disabled"}
    </button>
  );
}

export default function ModelsClient({ initialModels }: { initialModels: AiModel[] }) {
  const [models, setModels] = useState<AiModel[]>(initialModels);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(model: AiModel) {
    setEditId(model.id);
    setForm({
      provider: model.provider,
      modelId: model.modelId,
      displayName: model.displayName,
      enabled: model.enabled,
      isDefault: model.isDefault,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const url = editId ? `/api/admin/models/${editId}` : "/api/admin/models";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save model.");
        return;
      }
      const { data: saved } = await res.json();
      if (editId) {
        setModels((prev) => prev.map((m) => (m.id === editId ? saved : m)));
      } else {
        setModels((prev) => [...prev, saved]);
      }
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this model? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
      if (res.ok) {
        setModels((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleEnabled(model: AiModel) {
    const res = await fetch(`/api/admin/models/${model.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !model.enabled }),
    });
    if (res.ok) {
      const { data: saved } = await res.json();
      setModels((prev) => prev.map((m) => (m.id === model.id ? saved : m)));
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {models.length} model{models.length !== 1 ? "s" : ""} registered
        </span>
        <button className={styles.btnPrimary} onClick={openCreate}>
          <Plus size={16} style={{ marginRight: 4 }} /> Add Model
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editId ? "Edit Model" : "Register New Model"}</h3>
              <button className={styles.modalClose} onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                  required
                >
                  {Object.entries(PROVIDER_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                  <option value="custom">Custom / Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Model ID <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>(e.g., gemini-2.0-flash)</span></label>
                <input
                  value={form.modelId}
                  onChange={(e) => setForm((p) => ({ ...p, modelId: e.target.value }))}
                  placeholder="provider-model-name"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Gemini 2.0 Flash"
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                  Enabled
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                  />
                  Set as Default (for provider)
                </label>
              </div>
              {formError && <p className={styles.formError}>{formError}</p>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editId ? "Update Model" : "Register Model"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={adminStyles.sectionCard}>
        <table className={adminStyles.dataTable}>
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Provider</th>
              <th>Model ID</th>
              <th>Status</th>
              <th>Default</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    No models registered yet. Click <strong>Add Model</strong> to begin.
                  </div>
                </td>
              </tr>
            ) : (
              models.map((model) => (
                <tr key={model.id}>
                  <td>
                    <strong style={{ color: "var(--text-primary)" }}>{model.displayName}</strong>
                  </td>
                  <td>
                    <span className={`${adminStyles.roleBadge} ${adminStyles.employee}`}>
                      {PROVIDER_LABELS[model.provider] || model.provider}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.82rem", padding: "2px 6px", background: "var(--bg-tertiary)", borderRadius: 4, fontFamily: "monospace" }}>
                      {model.modelId}
                    </code>
                  </td>
                  <td>
                    <StatusBadge enabled={model.enabled} onClick={() => toggleEnabled(model)} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {model.isDefault ? (
                      <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    ) : (
                      <StarOff size={16} color="var(--text-tertiary)" />
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => openEdit(model)}
                        title="Edit model"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleDelete(model.id)}
                        disabled={deletingId === model.id}
                        title="Delete model"
                        style={{ color: "var(--color-danger)" }}
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
    </div>
  );
}
