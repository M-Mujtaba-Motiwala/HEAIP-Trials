"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3, Users, Shield, Lock, TrendingUp,
  Zap, ArrowLeft, Building2, ScrollText, Bot, GitBranch,
  RefreshCw, Plus, Edit2, Trash2, UserCheck, UserX, Search,
  AlertTriangle, Activity, DollarSign, Cpu, X, Copy, Archive, type LucideIcon,
} from "lucide-react";
import { HamdardLogo } from "@/components/HamdardLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Types ───────────────────────────────────────────────────────────────────
type AdminTab =
  | "overview" | "users" | "teams" | "roles" | "policies"
  | "costs" | "analytics" | "audit" | "agents" | "workflows" | "models"
  | "credentials" | "quotas" | "costcenters";

interface Employee {
  id: string; employeeId: string; name: string; email: string;
  department: string; designation: string; role: string;
  isActive: boolean; registrationStatus: string;
}

interface AuditLog {
  id: string; actorId: string; action: string; resource: string;
  details: string; ipAddress?: string; createdAt: string;
  actor: { name: string; email: string };
}

interface UsageStat {
  department: string; tokensInput: number; tokensOutput: number; costUsd: number; _count: number;
}

interface OverviewStats {
  totalUsers: number; activeUsers: number; totalCost: number; totalTokens: number;
}

interface DepartmentData {
  id: string; name: string; code?: string; description?: string; status?: string;
  _count?: { teams?: number; employees?: number };
}

interface AgentData {
  name: string; model: string; status?: string; temp?: number; systemPrompt?: string;
}

interface WorkflowData {
  name: string; description?: string; status?: string; agents?: number;
}

interface ModelData {
  id: string; provider: string; modelId: string; displayName: string;
  enabled: boolean; isDefault: boolean;
  category?: string; version?: string; description?: string;
  capabilities?: Record<string, boolean>; limits?: Record<string, number>;
  pricing?: Record<string, number>; policy?: Record<string, unknown>;
  metadataJson?: string; credentialId?: string | null;
  credential?: { id: string; name: string; apiKeyAlias: string; status: string } | null;
  healthStatus?: string; lastHealthCheck?: string;
  totalRequests?: number; totalCostUsd?: number;
  inputCostPer1K?: number | null; outputCostPer1K?: number | null;
  createdAt?: string; updatedAt?: string;
}

interface CredentialData {
  id: string; name: string; provider: string; apiKeyAlias: string;
  baseUrl?: string; authType: string; status: string;
  lastTestedAt?: string; lastTestResult?: string;
  lastRotatedAt?: string; expiresAt?: string;
  notes?: string; modelCount?: number;
  createdAt: string; updatedAt: string;
}

interface QuotaData {
  id: string; scope: string; scopeTargetId?: string | null;
  monthlyBudgetPkr?: number | null; dailyBudgetPkr?: number | null;
  yearlyBudgetPkr?: number | null;
  monthlyTokenLimit?: number | null; dailyTokenLimit?: number | null;
  monthlyRequestLimit?: number | null; dailyRequestLimit?: number | null;
  maxConcurrentSessions?: number | null;
  monthlyUploadLimit?: number | null; maxFileSizeBytes?: number | null;
  modelLimitsJson?: string; status: string;
  effectiveAt?: string; expiresAt?: string;
  createdAt: string; updatedAt: string;
}

interface CostCenterData {
  id: string; code: string; name: string; description?: string;
  status: string; createdAt: string; updatedAt: string;
  _count?: { departments: number; teams: number };
}

// ─── Tab Config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "Overview",    icon: BarChart3 },
  { id: "users",       label: "Users",       icon: Users },
  { id: "teams",       label: "Teams",       icon: Building2 },
  { id: "roles",       label: "Roles",       icon: Lock },
  { id: "policies",    label: "Policies",    icon: Shield },
  { id: "costs",       label: "Costs",       icon: DollarSign },
  { id: "analytics",   label: "Analytics",   icon: TrendingUp },
  { id: "audit",       label: "Audit",       icon: ScrollText },
  { id: "agents",      label: "Agents",      icon: Bot },
  { id: "workflows",   label: "Workflows",   icon: GitBranch },
  { id: "models",      label: "Models",      icon: Cpu },
  { id: "credentials", label: "Credentials", icon: Lock },
  { id: "quotas",      label: "Quotas",      icon: DollarSign },
  { id: "costcenters", label: "Cost Centers", icon: Building2 },
] as const;

// ─── Sub-Components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, sub }: {
  label: string; value: string; icon: LucideIcon; sub?: string;
}) {
  return (
    <div className="p-5 bg-card border border-border hover:border-primary/30 rounded-xl transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then(r => r.json()),
      fetch("/api/admin/analytics").then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([users, analytics]) => {
      const totalUsers = users.meta?.total || 0;
      const activeUsers = users.data?.filter((u: Employee) => u.isActive).length || 0;
      const totalCost = analytics.data?.reduce((s: number, d: UsageStat) => s + d.costUsd, 0) || 0;
      const totalTokens = analytics.data?.reduce((s: number, d: UsageStat) => s + d.tokensInput + d.tokensOutput, 0) || 0;
      setStats({ totalUsers, activeUsers, totalCost, totalTokens });
    }).catch(() => {
      setStats({ totalUsers: 0, activeUsers: 0, totalCost: 0, totalTokens: 0 });
    }).finally(() => setLoading(false));
  }, []);

  const services = ["API Gateway", "Database Cluster", "AI Provider — Gemini", "AI Provider — OpenAI", "Audit Service", "Cache Layer"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Executive Overview</h2>
        <p className="text-muted-foreground text-sm">Real-time metrics and system status</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Users" value={String(stats?.totalUsers)} icon={Users} sub={`${stats?.activeUsers} active`} />
          <MetricCard label="Tokens Used" value={`${((stats?.totalTokens || 0) / 1_000_000).toFixed(1)}M`} icon={Zap} sub="this month" />
          <MetricCard label="Total Spend" value={`PKR ${((stats?.totalCost || 0) * 280).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`} icon={TrendingUp} sub="approx." />
          <MetricCard label="System Health" value="99.8%" icon={Shield} sub="all services operational" />
        </div>
      )}

      <div className="p-6 bg-card border border-border rounded-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Service Status
        </h3>
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
              <span className="text-foreground/80 text-sm">{svc}</span>
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Operational
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [roles, setRoles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", employeeId: "", password: "", departmentId: "", designation: "", role: "EMPLOYEE" });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterRole) params.set("role", filterRole);
    if (filterStatus) params.set("status", filterStatus);

    fetch(`/api/admin/users?${params}`)
      .then(r => r.json())
      .then(data => {
        setUsers(data.data || []);
        setRoles(data.meta?.roles || []);
        setDepartments(data.meta?.departments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filterRole, filterStatus]);

  useEffect(() => { const t = setTimeout(fetchUsers, 0); return () => clearTimeout(t); }, [fetchUsers]);

  const toggleActivation = async (id: string, current: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchUsers();
  };

  const openCreate = () => {
    setEditingUser(null); setError(null);
    setForm({ name: "", email: "", employeeId: "", password: "", departmentId: "", designation: "", role: "EMPLOYEE" });
    setModalOpen(true);
  };

  const openEdit = (u: Employee) => {
    setEditingUser(u); setError(null);
    const dept = departments.find(d => d.name === u.department);
    setForm({ name: u.name, email: u.email, employeeId: u.employeeId, password: "", departmentId: dept?.id || "", designation: u.designation, role: u.role });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) {
      if (!form.name || !form.email || !form.employeeId || !form.password || !form.departmentId || !form.designation) {
        setError("All fields are required."); return;
      }
      setSaving(true); setError(null);
      try {
        const res = await fetch("/api/admin/onboarding", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, userType: "THIRD_PARTY" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
        setModalOpen(false); fetchUsers();
      } catch (err) { setError(err instanceof Error ? err.message : "Create failed"); }
      finally { setSaving(false); }
    } else {
      setSaving(true); setError(null);
      try {
        const payload: Record<string, string> = {};
        if (form.designation) payload.designation = form.designation;
        if (form.departmentId) payload.departmentId = form.departmentId;
        if (form.role) payload.role = form.role;
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        setModalOpen(false); fetchUsers();
      } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); }
      finally { setSaving(false); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Suspend this user? They will no longer be able to log in.")) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    fetchUsers();
  };

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground text-sm mt-1">{users.length} employees registered</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground/80 focus:outline-none"
        >
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.code}>{r.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground/80 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Suspended</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Name</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Email</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Department</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Role</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Status</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-muted/70 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.map(user => (
              <tr key={user.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary border border-primary/30 flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                      {user.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{user.name}</p>
                      <p className="text-muted-foreground/70 text-xs">{user.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs font-mono">{user.email}</td>
                <td className="px-5 py-3 text-foreground/80 text-xs">{user.department}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === "SUPER_ADMIN" ? "bg-purple-500/10 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-500/20 dark:border-purple-700/30" :
                    user.role === "ADMIN" ? "bg-blue-500/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-500/20 dark:border-blue-700/30" :
                    "bg-primary/10 text-primary border border-border"
                  }`}>
                    {user.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.isActive ? "bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-300" : "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300"
                  }`}>
                    {user.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActivation(user.id, user.isActive)}
                      title={user.isActive ? "Suspend" : "Activate"}
                      className={`p-1.5 rounded hover:bg-accent transition-colors ${user.isActive ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}`}
                    >
                      {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive" title="Suspend">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{editingUser ? "Edit User" : "Add User"}</h3>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="John Doe" disabled={!!editingUser} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="john@hamdard.com.pk" disabled={!!editingUser} />
              </div>
            </div>
            {!editingUser && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Employee ID</label>
                  <input type="text" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} className={inputClass} placeholder="HAM-007" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={inputClass} placeholder="Min 8 characters" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Department</label>
                <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} className={inputClass}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Designation</label>
                <input type="text" value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} className={inputClass} placeholder="Software Engineer" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputClass}>
                {roles.map(r => <option key={r.id} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold transition-colors">
                {saving ? "Saving..." : (editingUser ? "Save Changes" : "Create User")}
              </button>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teams Tab ─────────────────────────────────────────────────────────────────
function TeamsTab() {
  const [depts, setDepts] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "" });

  const fetchDepts = () => {
    setLoading(true);
    fetch("/api/admin/departments")
      .then(r => r.json())
      .then(d => setDepts(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(fetchDepts, 0); return () => clearTimeout(t); }, []);

  const openCreate = () => { setEditingDept(null); setError(null); setForm({ code: "", name: "", description: "" }); setModalOpen(true); };
  const openEdit = (d: DepartmentData) => { setEditingDept(d); setError(null); setForm({ code: d.code || "", name: d.name, description: d.description || "" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { setError("Name and code are required."); return; }
    setSaving(true); setError(null);
    try {
      const url = editingDept ? `/api/admin/departments/${editingDept.id}` : "/api/admin/departments";
      const method = editingDept ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false); fetchDepts();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this department?")) return;
    await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    fetchDepts();
  };

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Departments & Teams</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage organizational structure and cross-functional teams</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="h-36 bg-muted/50 rounded-xl animate-pulse" />
        )) : depts.map(dept => (
          <div key={dept.id} className="p-5 bg-card border border-border hover:border-primary/30 rounded-xl transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">{dept.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{dept.code}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(dept)} className="p-1.5 hover:bg-accent rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(dept.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
            {dept.description && <p className="text-xs text-muted-foreground/70 mb-3 line-clamp-2">{dept.description}</p>}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground/70 text-xs">Teams</span>
                <p className="font-semibold text-primary">{dept._count?.teams || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground/70 text-xs">Staff</span>
                <p className="font-semibold text-primary">{dept._count?.employees || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground/70 text-xs">Status</span>
                <p className={`font-semibold text-xs ${dept.status === "ACTIVE" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {dept.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{editingDept ? "Edit Department" : "Add Department"}</h3>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Department Code</label>
              <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className={inputClass} placeholder="IT" />
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Department Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Information Technology" />
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={inputClass + " resize-none"} placeholder="Optional description..." />
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold transition-colors">
                {saving ? "Saving..." : (editingDept ? "Save Changes" : "Create Department")}
              </button>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────
interface MatrixRole {
  id: string; code: string; name: string; delegationLevel: number;
  isActive?: boolean;
  _count?: { userRoles?: number };
  permissions: { permission: { id: string; permissionKey: string } }[];
}
interface MatrixPerm {
  id: string; module: string; resource: string; action: string; permissionKey: string; description?: string;
}

function RolesTab() {
  const [roles, setRoles] = useState<MatrixRole[]>([]);
  const [permissions, setPermissions] = useState<MatrixPerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<MatrixRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", delegationLevel: "0" });

  const fetchRoles = () => {
    Promise.all([
      fetch("/api/admin/roles").then((r) => r.json()),
      fetch("/api/admin/permissions").then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([rolesData, permData]) => {
        setRoles((rolesData.data || []).filter((r: MatrixRole) => r.isActive !== false));
        setPermissions(permData.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(fetchRoles, 0); return () => clearTimeout(t); }, []);

  const SYSTEM_LOCKED = ["SUPER_ADMIN"];
  const mark = new Map(roles.map((r) => [r.id, new Set(r.permissions.map((p) => p.permission.id))]));

  const togglePermission = async (roleId: string, permissionId: string) => {
    if (savingRole) return;
    const checked = new Set(mark.get(roleId) || []);
    if (checked.has(permissionId)) checked.delete(permissionId);
    else checked.add(permissionId);

    setRoles((prev) => prev.map((r) => {
      if (r.id !== roleId) return r;
      const currentlyHave = r.permissions.map((p) => p.permission.id);
      if (currentlyHave.includes(permissionId)) {
        return { ...r, permissions: r.permissions.filter((p) => p.permission.id !== permissionId) };
      }
      const perm = permissions.find((p) => p.id === permissionId);
      return { ...r, permissions: [...r.permissions, { permission: { id: permissionId, permissionKey: perm?.permissionKey || permissionId } }] };
    }));

    setSavingRole(roleId);
    try {
      await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(checked) }),
      });
    } catch {}
    setSavingRole(null);
  };

  const groupedPermissions = permissions.reduce<Record<string, MatrixPerm[]>>((acc, p) => {
    (acc[p.module] = acc[p.module] || []).push(p);
    return acc;
  }, {});

  const openCreateRole = () => { setEditingRole(null); setError(null); setForm({ code: "", name: "", description: "", delegationLevel: "0" }); setModalOpen(true); };
  const openEditRole = (r: MatrixRole) => { setEditingRole(r); setError(null); setForm({ code: r.code, name: r.name, description: "", delegationLevel: String(r.delegationLevel || 0) }); setModalOpen(true); };

  const handleSaveRole = async () => {
    if (!form.code || !form.name) { setError("Code and name are required."); return; }
    setSaving(true); setError(null);
    try {
      const url = editingRole ? `/api/admin/roles/${editingRole.id}` : "/api/admin/roles";
      const method = editingRole ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false); fetchRoles();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDeleteRole = async (id: string, code: string) => {
    if (SYSTEM_LOCKED.includes(code)) return;
    if (!confirm("Delete this role? Users with this role will lose their permissions.")) return;
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      fetchRoles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Roles & Permissions</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage dynamic RBAC roles and permission delegation</p>
        </div>
        {isSuperAdmin && (
          <button onClick={openCreateRole} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {/* Sticky Superadmin System-Alert */}
      <div className="sticky top-0 z-10 p-4 bg-yellow-500/10 dark:bg-yellow-900/30 border border-yellow-500/30 dark:border-yellow-600/40 rounded-xl flex items-start gap-3 backdrop-blur">
        <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-yellow-100">System Default Role — Unmodifiable</p>
          <p className="text-yellow-200/80 mt-1">
            Superadmin is a default system role with full unmodifiable access
            (<code className="text-xs bg-black/30 px-2 py-0.5 rounded font-mono">superadmin@hamdard.com.pk</code>).
            Higher-hierarchy roles may grant delegation permissions to modify lower-hierarchy role privileges.
          </p>
        </div>
      </div>

      {/* Roles Table */}
      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Role</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Code</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Permissions</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Users</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Status</th>
              {isSuperAdmin && <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-border/30">
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-4 bg-muted/70 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : roles.map(role => {
              const isLocked = SYSTEM_LOCKED.includes(role.code);
              return (
                <tr key={role.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isLocked && <Lock className="w-4 h-4 text-yellow-400" />}
                      <span className="text-foreground font-semibold">{role.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <code className="text-xs text-muted-foreground bg-muted/70 px-2 py-0.5 rounded font-mono">{role.code}</code>
                  </td>
                  <td className="px-5 py-3 text-foreground/80 text-xs">{role.permissions?.length || 0} permissions</td>
                  <td className="px-5 py-3 text-foreground/80 text-xs">{role._count?.userRoles || 0} assigned</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isLocked
                        ? "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-500/20 dark:border-yellow-700/30"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {isLocked ? "System Locked" : "Editable"}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {!isLocked && (
                          <button onClick={() => openEditRole(role)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {!isLocked && (
                          <button onClick={() => handleDeleteRole(role.id, role.code)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permission Matrix */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-card border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-semibold">Permission Matrix</h3>
            <p className="text-muted-foreground text-sm mt-0.5">Checkbox grid — assign granular permissions per role</p>
          </div>
          {savingRole && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
        </div>
        <div className="overflow-x-auto max-h-[32rem]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-muted-foreground font-semibold min-w-56">Permission</th>
                {roles.map((r) => (
                  <th key={r.id} className={`px-3 py-3 text-center font-semibold min-w-32 ${SYSTEM_LOCKED.includes(r.code) ? "text-yellow-400" : "text-primary"}`}>
                    <div className="flex items-center justify-center gap-1">
                      {SYSTEM_LOCKED.includes(r.code) && <Lock className="w-3 h-3" />}
                      {r.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={roles.length + 1} className="px-4 py-6 text-center text-muted-foreground/70">Loading permission catalog…</td></tr>
              ) : Object.entries(groupedPermissions).length === 0 ? (
                <tr><td colSpan={roles.length + 1} className="px-4 py-6 text-center text-muted-foreground/70">No permissions available.</td></tr>
              ) : (
                Object.entries(groupedPermissions).map(([module, perms]) => (
                  <Fragment key={module}>
                    <tr className="bg-primary/5">
                      <td colSpan={roles.length + 1} className="px-4 py-2 text-[0.7rem] font-bold uppercase tracking-wider text-primary">
                        {module}
                      </td>
                    </tr>
                    {perms.map((p) => (
                      <tr key={p.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-foreground/80">
                          <code className="text-primary/80 font-mono">{p.permissionKey}</code>
                          {p.description && <p className="text-muted-foreground/70 mt-0.5">{p.description}</p>}
                        </td>
                        {roles.map((r) => {
                          const isLocked = SYSTEM_LOCKED.includes(r.code);
                          const checked = mark.get(r.id)?.has(p.id) || false;
                          return (
                            <td key={r.id} className="px-3 py-2.5 text-center">
                              {isLocked ? (
                                <input type="checkbox" checked disabled className="accent-primary cursor-not-allowed opacity-40" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={savingRole === r.id}
                                  onChange={() => togglePermission(r.id, p.id)}
                                  className="accent-primary cursor-pointer"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{editingRole ? "Edit Role" : "New Role"}</h3>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Role Code</label>
              <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className={inputClass} placeholder="MANAGER" disabled={!!editingRole} />
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Role Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Department Manager" />
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} placeholder="Optional description..." />
            </div>
            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Delegation Level (0-100)</label>
              <input type="number" min={0} max={100} value={form.delegationLevel} onChange={e => setForm(p => ({ ...p, delegationLevel: e.target.value }))} className={inputClass} />
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveRole} disabled={saving} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold transition-colors">
                {saving ? "Saving..." : (editingRole ? "Save Changes" : "Create Role")}
              </button>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Policies Tab ──────────────────────────────────────────────────────────────
function PoliciesTab() {
  interface AiPolicyItem {
    id: string; name: string; description: string; category: string;
    policyType?: string; severity: string; scope: string; scopeTargets: string;
    actions: string; conditions: string; exceptions: string;
    priority: number; effectiveAt?: string; expiresAt?: string;
    status: string; version: number; isActive: boolean;
    createdAt: string; updatedAt: string;
    createdBy?: { id: string; name: string };
    updatedBy?: { id: string; name: string };
    _count?: { evaluationLogs: number };
  }
  interface PolicyStatus {
    summary: { totalPolicies: number; totalEvaluations: number; blockedRequests: number; recentViolations: number; protectionRate: number };
    moduleProtection: Record<string, { protected: boolean; policyCount: number; categories: string[] }>;
    policiesByCategory: Record<string, number>;
  }
  interface PolicyHistoryItem {
    id: string; policyId: string; employeeId: string; contextType: string;
    contextJson: string; decision: string; details: string; createdAt: string;
    employee?: { name: string; email: string };
  }

  const [policies, setPolicies] = useState<AiPolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ categories: string[]; severities: string[]; scopes: string[]; statuses: string[] }>({ categories: [], severities: [], scopes: [], statuses: [] });
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [activeView, setActiveView] = useState<"list" | "status" | "history">("list");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AiPolicyItem | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("desc");

  const [form, setForm] = useState({
    name: "", description: "", category: "CONTENT_MODERATION",
    severity: "MEDIUM", scope: "ORGANIZATION", scopeTargets: "[]",
    actions: '["BLOCK_REQUEST"]', conditions: "{}", exceptions: "[]",
    priority: 50, effectiveAt: "", expiresAt: "", status: "ACTIVE",
  });

  const CATEGORY_LABELS: Record<string, string> = {
    ACCESS_AUTHORIZATION: "Access & Authorization",
    AI_MODEL_ACCESS: "AI Model Access",
    QUOTA_USAGE: "Quota & Usage",
    CONTENT_MODERATION: "Content Moderation",
    DATA_PROTECTION: "Data Protection & DLP",
    ATTACHMENT_SECURITY: "Attachment Security",
    CONFIDENTIALITY: "Confidentiality Classification",
    LEGAL_COMPLIANCE: "Legal & Compliance",
    CONVERSATION_GOVERNANCE: "Conversation Governance",
    PROMPT_INJECTION: "Prompt Injection Protection",
    KNOWLEDGE_BASE: "Knowledge Base Access",
    AI_RESPONSE_VALIDATION: "AI Response Validation",
    AUDIT_MONITORING: "Audit & Monitoring",
    DATA_RETENTION: "Data Retention",
  };

  const CATEGORY_ICONS: Record<string, string> = {
    ACCESS_AUTHORIZATION: "🔐", AI_MODEL_ACCESS: "🤖", QUOTA_USAGE: "📊",
    CONTENT_MODERATION: "🛡️", DATA_PROTECTION: "🔒", ATTACHMENT_SECURITY: "📎",
    CONFIDENTIALITY: "🤫", LEGAL_COMPLIANCE: "⚖️", CONVERSATION_GOVERNANCE: "💬",
    PROMPT_INJECTION: "💉", KNOWLEDGE_BASE: "📚", AI_RESPONSE_VALIDATION: "✅",
    AUDIT_MONITORING: "📋", DATA_RETENTION: "🗄️",
  };

  const SEVERITY_COLORS: Record<string, string> = {
    LOW: "bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",
    MEDIUM: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300",
    HIGH: "bg-orange-500/10 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300",
    CRITICAL: "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300",
  };

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-300",
    INACTIVE: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300",
    ARCHIVED: "bg-muted text-muted-foreground",
  };

  const CONTEXT_TYPE_LABELS: Record<string, string> = {
    MESSAGE: "💬 AI Chat", FILE_UPLOAD: "📎 File Upload", LOGIN: "🔑 Login",
    MODEL_ACCESS: "🤖 Model Access", ADMIN_ACTION: "⚙️ Admin Action",
    AGENT_ACTION: "🤖 Agent", WORKFLOW_ACTION: "🔄 Workflow",
    ANALYTICS_VIEW: "📊 Analytics", USER_MANAGEMENT: "👥 User Management",
    KNOWLEDGE_BASE: "📚 Knowledge Base",
  };

  const MODULE_STATUS_ICONS: Record<string, string> = {
    "AI Chat": "💬", "File Upload": "📎", "Authentication": "🔑",
    "Model Access": "🤖", "Agent Management": "🤖", "Workflow Management": "🔄",
    "Analytics": "📊", "User Management": "👥", "Knowledge Base": "📚",
  };

  const fetchPolicies = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCategory) params.set("category", filterCategory);
    if (filterSeverity) params.set("severity", filterSeverity);
    if (filterStatus) params.set("status", filterStatus);
    params.set("sort", sortBy);
    params.set("order", sortOrder);

    fetch(`/api/admin/policies?${params}`)
      .then(r => r.json())
      .then(d => { setPolicies(d.data || []); setMeta(d.meta || meta); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchStatus = () => {
    fetch("/api/admin/policies/status")
      .then(r => r.json())
      .then(d => {
        if (d && d.summary) {
          setPolicyStatus(d);
        }
      })
      .catch(() => {});
  };

  useEffect(() => { const t = setTimeout(fetchPolicies, 0); return () => clearTimeout(t); }, [search, filterCategory, filterSeverity, filterStatus, sortBy, sortOrder]);
  useEffect(() => { fetchStatus(); }, []);

  const toggleActive = async (policy: AiPolicyItem) => {
    setSaving(policy.id);
    try {
      const newStatus = policy.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await fetch(`/api/admin/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, isActive: newStatus === "ACTIVE" }),
      });
      fetchPolicies(); fetchStatus();
    } catch {}
    setSaving(null);
  };

  const openCreate = () => {
    setEditingPolicy(null); setError(null);
    setForm({ name: "", description: "", category: "CONTENT_MODERATION", severity: "MEDIUM", scope: "ORGANIZATION", scopeTargets: "[]", actions: '["BLOCK_REQUEST"]', conditions: "{}", exceptions: "[]", priority: 50, effectiveAt: "", expiresAt: "", status: "ACTIVE" });
    setModalOpen(true);
  };

  const openEdit = (p: AiPolicyItem) => {
    setEditingPolicy(p); setError(null);
    setForm({
      name: p.name, description: p.description, category: p.category,
      severity: p.severity, scope: p.scope, scopeTargets: p.scopeTargets || "[]",
      actions: p.actions || '["BLOCK_REQUEST"]', conditions: p.conditions || "{}",
      exceptions: p.exceptions || "[]", priority: p.priority,
      effectiveAt: p.effectiveAt ? p.effectiveAt.split("T")[0] : "",
      expiresAt: p.expiresAt ? p.expiresAt.split("T")[0] : "",
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.description) { setError("Name and description are required."); return; }
    setFormSaving(true); setError(null);
    try {
      const payload = {
        ...form,
        priority: Number(form.priority),
        effectiveAt: form.effectiveAt || null,
        expiresAt: form.expiresAt || null,
        scopeTargets: form.scopeTargets,
        actions: form.actions,
        conditions: form.conditions,
        exceptions: form.exceptions,
      };
      const url = editingPolicy ? `/api/admin/policies/${editingPolicy.id}` : "/api/admin/policies";
      const method = editingPolicy ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false); fetchPolicies(); fetchStatus();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy? This cannot be undone.")) return;
    try {
      await fetch(`/api/admin/policies/${id}`, { method: "DELETE" });
      fetchPolicies(); fetchStatus();
    } catch {}
  };

  const handleDuplicate = async (id: string) => {
    try {
      await fetch(`/api/admin/policies/${id}/duplicate`, { method: "POST" });
      fetchPolicies(); fetchStatus();
    } catch {}
  };

  const handleArchive = async (id: string) => {
    try {
      await fetch(`/api/admin/policies/${id}/archive`, { method: "POST" });
      fetchPolicies(); fetchStatus();
    } catch {}
  };

  const handleSeedDefaults = async () => {
    if (!confirm("Seed 14 default enterprise policies? This will add policies if none exist.")) return;
    try {
      const res = await fetch("/api/admin/policies/seed", { method: "POST" });
      const data = await res.json();
      alert(data.message || `Seeded ${data.count || 0} policies`);
      fetchPolicies(); fetchStatus();
    } catch {}
  };

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Enterprise Policy & Governance Engine</h2>
          <p className="text-muted-foreground text-sm mt-1">Central governance system — policies are automatically enforced across all modules</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeedDefaults} className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors" title="Seed 14 default enterprise policies">
            <Zap className="w-4 h-4" /> Seed Defaults
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
            <Plus className="w-4 h-4" /> Create Policy
          </button>
        </div>
      </div>

      {/* Enforcement Status Banner */}
      {policyStatus?.summary && (
        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Policy Enforcement Status
            </h3>
            <span className="text-sm text-muted-foreground">
              {policyStatus.summary.protectionRate ?? 0}% of modules protected
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="text-center p-2 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{policyStatus.summary.totalPolicies}</div>
              <div className="text-xs text-muted-foreground">Active Policies</div>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{policyStatus.summary.totalEvaluations.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Evaluations</div>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{policyStatus.summary.blockedRequests.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Blocked Requests</div>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{policyStatus.summary.recentViolations}</div>
              <div className="text-xs text-muted-foreground">24h Violations</div>
            </div>
          </div>
          {/* Module Protection Grid */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(policyStatus.moduleProtection).map(([mod, info]) => (
              <div key={mod} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${info.protected ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                <span>{MODULE_STATUS_ICONS[mod] || "📦"}</span>
                <span className="truncate">{mod}</span>
                {info.protected && <span className="ml-auto font-mono text-[10px] opacity-70">{info.policyCount}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["list", "status", "history"] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {v === "list" ? "Policies" : v === "status" ? "Module Coverage" : "Evaluation History"}
          </button>
        ))}
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────────────────── */}
      {activeView === "list" && (
        <>
          {/* Filters & Search */}
          <div className="p-4 bg-card border border-border rounded-xl space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search policies..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground/80 focus:outline-none">
                <option value="">All Categories</option>
                {meta.categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
              </select>
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground/80 focus:outline-none">
                <option value="">All Severities</option>
                {meta.severities.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground/80 focus:outline-none">
                <option value="">All Statuses</option>
                {meta.statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={`${sortBy}-${sortOrder}`} onChange={e => { const [s, o] = e.target.value.split("-"); setSortBy(s); setSortOrder(o); }} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground/80 focus:outline-none">
                <option value="priority-desc">Priority (High-Low)</option>
                <option value="priority-asc">Priority (Low-High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{policies.length} policies</span>
              <span>{policies.filter(p => p.status === "ACTIVE").length} active</span>
              <span>{policies.filter(p => p.severity === "CRITICAL").length} critical</span>
              <span>{policies.filter(p => p.severity === "HIGH").length} high</span>
            </div>
          </div>

          {/* Policy List */}
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}</div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm border border-border rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No policies found. Create your first governance policy or seed defaults.</p>
              <button onClick={handleSeedDefaults} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
                <Zap className="w-4 h-4 inline mr-1" /> Seed Default Policies
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map((policy) => {
                const parsedActions = (() => { try { return JSON.parse(policy.actions); } catch { return []; } })();
                return (
                  <div key={policy.id} className="p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">{CATEGORY_ICONS[policy.category] || "📜"}</span>
                          <h3 className="font-semibold text-foreground">{policy.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[policy.severity] || ""}`}>{policy.severity}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[policy.status] || ""}`}>{policy.status}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-border">{CATEGORY_LABELS[policy.category] || policy.category}</span>
                          <span className="text-xs text-muted-foreground">v{policy.version}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{policy.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/70">
                          <span>Scope: {policy.scope}</span>
                          <span>Priority: {policy.priority}</span>
                          <span>{parsedActions.length} action{parsedActions.length !== 1 ? "s" : ""}</span>
                          {policy._count?.evaluationLogs ? <span>{policy._count.evaluationLogs} evaluations</span> : null}
                          {policy.createdBy?.name && <span>by {policy.createdBy.name}</span>}
                          <span>Updated {new Date(policy.updatedAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleActive(policy)} disabled={saving === policy.id}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors flex-shrink-0 ${policy.status === "ACTIVE" ? "bg-primary" : "bg-muted"}`}
                          title={policy.status === "ACTIVE" ? "Deactivate" : "Activate"}>
                          {saving === policy.id && <div className="absolute inset-0 flex items-center justify-center"><RefreshCw className="w-3 h-3 animate-spin text-foreground/70" /></div>}
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${policy.status === "ACTIVE" ? "translate-x-8" : "translate-x-1"}`} />
                        </button>
                        <button onClick={() => openEdit(policy)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDuplicate(policy.id)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Duplicate"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => handleArchive(policy.id)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title={policy.status === "ARCHIVED" ? "Restore" : "Archive"}>
                          <Archive className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(policy.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── STATUS VIEW ────────────────────────────────────────────────────── */}
      {activeView === "status" && policyStatus?.moduleProtection && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module Coverage */}
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Module Protection Coverage
              </h3>
              <div className="space-y-2">
                {Object.entries(policyStatus.moduleProtection).map(([mod, info]) => (
                  <div key={mod} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <span className="text-lg">{MODULE_STATUS_ICONS[mod] || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{mod}</div>
                      <div className="text-xs text-muted-foreground">
                        {info.protected ? `${info.policyCount} policies: ${info.categories.map(c => CATEGORY_LABELS[c] || c).join(", ")}` : "No policies applied"}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${info.protected ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Policies by Category */}
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Policies by Category
              </h3>
              <div className="space-y-2">
                {Object.entries(policyStatus.policiesByCategory).sort(([,a],[,b]) => b-a).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-lg">{CATEGORY_ICONS[cat] || "📜"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{CATEGORY_LABELS[cat] || cat}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(policyStatus.policiesByCategory))) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-mono text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY VIEW ───────────────────────────────────────────────────── */}
      {activeView === "history" && (
        <PolicyHistoryView />
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !formSaving && setModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{editingPolicy ? "Edit Policy" : "Create Policy"}</h3>
              <button onClick={() => setModalOpen(false)} disabled={formSaving} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Policy Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="e.g., Content Moderation - Standard" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{CATEGORY_ICONS[k]} {v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} placeholder="Describe the policy purpose and scope..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Severity</label>
                  <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} className={inputClass}>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Scope</label>
                  <select value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} className={inputClass}>
                    {["ORGANIZATION", "DEPARTMENT", "TEAM", "ROLE", "USER"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Priority (1-100)</label>
                  <input type="number" min={1} max={100} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 50 }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Effective Date</label>
                  <input type="date" value={form.effectiveAt} onChange={e => setForm(p => ({ ...p, effectiveAt: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Expiration Date</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Actions (JSON array)</label>
                <textarea value={form.actions} onChange={e => setForm(p => ({ ...p, actions: e.target.value }))} rows={2} className={inputClass + " resize-none font-mono text-xs"} placeholder='["BLOCK_REQUEST","LOG_EVENT_ONLY"]' />
                <p className="text-xs text-muted-foreground/60 mt-1">Available: BLOCK_REQUEST, STOP_AI_RESPONSE, DISABLE_MODEL_ACCESS, WARN, REQUIRE_APPROVAL, MASK_SENSITIVE_DATA, REDACT_CONTENT, QUARANTINE_FILE, NOTIFY_MANAGER, NOTIFY_SECURITY_TEAM, LOG_EVENT_ONLY, ALLOW</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Trigger Conditions (JSON)</label>
                <textarea value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} rows={3} className={inputClass + " resize-none font-mono text-xs"} placeholder='{"contextType": "MESSAGE", "roles": ["EMPLOYEE"], "allowedHours": {"start": 9, "end": 17}}' />
                <p className="text-xs text-muted-foreground/60 mt-1">Available: contextType, roles, departments, teams, allowedHours, maxTokens, allowedModels, blockedModels, allowedFileTypes, blockedFileTypes, maxFileSize, ipWhitelist, ipBlacklist</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Exceptions (JSON array)</label>
                <textarea value={form.exceptions} onChange={e => setForm(p => ({ ...p, exceptions: e.target.value }))} rows={2} className={inputClass + " resize-none font-mono text-xs"} placeholder='[{"roles": ["SUPER_ADMIN"]}, {"userIds": ["user-id-1"]}]' />
              </div>
              {form.scope !== "ORGANIZATION" && (
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Scope Target IDs (JSON array)</label>
                  <textarea value={form.scopeTargets} onChange={e => setForm(p => ({ ...p, scopeTargets: e.target.value }))} rows={2} className={inputClass + " resize-none font-mono text-xs"} placeholder='["dept-id-1", "dept-id-2"]' />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertTriangle className="w-4 h-4" /><span>{error}</span>
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setModalOpen(false)} disabled={formSaving} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={formSaving} className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold transition-colors">
                  {formSaving ? "Saving..." : (editingPolicy ? "Save Changes" : "Create Policy")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Policy History Sub-Tab ───────────────────────────────────────────────────
function PolicyHistoryView() {
  const [history, setHistory] = useState<Array<{
    id: string; policyId: string; employeeId: string; contextType: string;
    contextJson: string; decision: string; details: string; createdAt: string;
    employee?: { name: string; email: string };
    policy?: { name: string; category: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, blocked: 0, warnings: 0, allowed: 0 });

  const CONTEXT_TYPE_LABELS: Record<string, string> = {
    MESSAGE: "💬 AI Chat", FILE_UPLOAD: "📎 File Upload", LOGIN: "🔑 Login",
    MODEL_ACCESS: "🤖 Model Access", ADMIN_ACTION: "⚙️ Admin",
    AGENT_ACTION: "🤖 Agent", WORKFLOW_ACTION: "🔄 Workflow",
    ANALYTICS_VIEW: "📊 Analytics", USER_MANAGEMENT: "👥 Users",
    KNOWLEDGE_BASE: "📚 KB",
  };

  const DECISION_COLORS: Record<string, string> = {
    BLOCK_REQUEST: "bg-red-500/10 text-red-600",
    STOP_AI_RESPONSE: "bg-red-500/10 text-red-600",
    DISABLE_MODEL_ACCESS: "bg-red-500/10 text-red-600",
    QUARANTINE_FILE: "bg-red-500/10 text-red-600",
    REQUIRE_APPROVAL: "bg-orange-500/10 text-orange-600",
    WARN: "bg-yellow-500/10 text-yellow-600",
    ALLOW_WITH_WARNING: "bg-yellow-500/10 text-yellow-600",
    MASK_SENSITIVE_DATA: "bg-blue-500/10 text-blue-600",
    REDACT_CONTENT: "bg-blue-500/10 text-blue-600",
    LOG_EVENT_ONLY: "bg-muted text-muted-foreground",
    ALLOW: "bg-green-500/10 text-green-600",
  };

  useEffect(() => {
    // Fetch recent evaluation logs from all policies
    fetch("/api/admin/policies?sort=createdAt&order=desc")
      .then(r => r.json())
      .then(async (d) => {
        const policies = d.data || [];
        const allLogs: Array<Record<string, unknown>> = [];
        // Fetch history for top 5 policies
        for (const p of policies.slice(0, 5)) {
          try {
            const res = await fetch(`/api/admin/policies/${p.id}/history`);
            const hist = await res.json();
            if (hist.data) {
              for (const log of hist.data) {
                log.policy = { name: p.name, category: p.category };
                allLogs.push(log);
              }
            }
          } catch {}
        }
        allLogs.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
        setHistory(allLogs as typeof history);

        const blocked = allLogs.filter(l => ["BLOCK_REQUEST", "STOP_AI_RESPONSE", "DISABLE_MODEL_ACCESS", "QUARANTINE_FILE"].includes(l.decision as string)).length;
        const warnings = allLogs.filter(l => ["WARN", "ALLOW_WITH_WARNING", "MASK_SENSITIVE_DATA", "REDACT_CONTENT"].includes(l.decision as string)).length;
        setStats({ total: allLogs.length, blocked, warnings, allowed: allLogs.length - blocked - warnings });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Evaluations</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
          <div className="text-xs text-muted-foreground">Blocked</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
          <div className="text-xs text-muted-foreground">Warnings</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-xl text-center">
          <div className="text-2xl font-bold text-green-600">{stats.allowed}</div>
          <div className="text-xs text-muted-foreground">Allowed</div>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      ) : history.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm border border-border rounded-xl">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No evaluation history yet. Policies will log evaluations as requests are processed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((log) => (
            <div key={log.id} className="p-3 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${DECISION_COLORS[log.decision] || "bg-muted text-muted-foreground"}`}>
                  {log.decision}
                </span>
                <span className="text-sm font-medium text-foreground truncate">{log.policy?.name || log.policyId}</span>
                <span className="text-xs text-muted-foreground">{log.policy?.category}</span>
                <span className="text-xs text-muted-foreground">{CONTEXT_TYPE_LABELS[log.contextType] || log.contextType}</span>
                {log.employee?.name && <span className="text-xs text-muted-foreground">by {log.employee.name}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Costs Tab ─────────────────────────────────────────────────────────────────
function CostsTab() {
  const [data, setData] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyQuotaPKR, setMonthlyQuotaPKR] = useState(15000);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/analytics").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/admin/settings").then(r => r.json()).catch(() => ({ settings: [] })),
    ])
      .then(([analytics, settings]) => {
        setData(analytics.data || []);
        const quotaSetting = (settings.settings || []).find(
          (s: { key: string; value: string }) => s.key === "ai.monthly_quota_pkr"
        );
        const parsedQuota = Number(quotaSetting?.value);
        if (quotaSetting && Number.isFinite(parsedQuota) && parsedQuota > 0) {
          setMonthlyQuotaPKR(parsedQuota);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PKR_RATE = 280;
  const totalCost = data.reduce((s, d) => s + d.costUsd, 0);
  const totalTokens = data.reduce((s, d) => s + d.tokensInput + d.tokensOutput, 0);
  const MONTHLY_QUOTA_PKR = monthlyQuotaPKR;
  const spentPKR = totalCost * PKR_RATE;
  const pctUsed = Math.min((spentPKR / MONTHLY_QUOTA_PKR) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Cost Calculation Engine</h2>
        <p className="text-muted-foreground text-sm mt-1">Mathematical spend breakdown across roles, departments, and teams</p>
      </div>

      {/* Budget Bar */}
      <div className="p-5 bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Monthly Budget Utilization</h3>
          <span className={`text-sm font-bold ${pctUsed > 85 ? "text-red-400" : pctUsed > 60 ? "text-yellow-400" : "text-primary"}`}>
            {pctUsed.toFixed(1)}% used
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${pctUsed > 85 ? "bg-red-500" : pctUsed > 60 ? "bg-yellow-400" : "bg-gradient-to-r from-primary to-primary"}`}
            style={{ width: `${pctUsed}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <span>PKR {spentPKR.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} spent</span>
          <span>PKR {MONTHLY_QUOTA_PKR.toLocaleString()} limit</span>
        </div>
        {pctUsed > 85 && (
          <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-300 text-xs bg-red-500/10 dark:bg-red-900/20 border border-red-500/20 dark:border-red-700/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            ⚠️ Approaching quota cap — auto-restriction may trigger at 100%
          </div>
        )}
      </div>

      {/* Department breakdown */}
      <div className="p-5 bg-card border border-border rounded-xl">
        <h3 className="font-semibold text-foreground mb-4">Spend by Department</h3>
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/60 rounded animate-pulse" />)}</div>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm">No usage data available yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map(row => {
              const pct = totalTokens > 0 ? Math.round(((row.tokensInput + row.tokensOutput) / totalTokens) * 100) : 0;
              return (
                <div key={row.department}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground/80">{row.department}</span>
                    <span className="text-primary font-semibold">
                      PKR {(row.costUsd * PKR_RATE).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-primary h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{pct}% of total tokens</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground text-xs mb-1">Total Tokens Used</p>
          <p className="text-2xl font-bold text-foreground">{(totalTokens / 1_000_000).toFixed(2)}M</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground text-xs mb-1">Total Spend (USD)</p>
          <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [data, setData] = useState<UsageStat[]>([]);
  const [modelData, setModelData] = useState<Array<{ aiProvider: string; aiModel: string; _sum: { tokensInput: number; tokensOutput: number; costUsd: number } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
        setModelData(d.models || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTokens = data.reduce((s, d) => s + d.tokensInput + d.tokensOutput, 0);
  const totalModelTokens = modelData.reduce((s, d) => s + (d._sum.tokensInput || 0) + (d._sum.tokensOutput || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Usage Analysis</h2>
        <p className="text-muted-foreground text-sm mt-1">Token consumption and AI model distribution insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="font-semibold text-foreground mb-4">Token Consumption by Department</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-muted/60 rounded animate-pulse" />)}</div>
          ) : data.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm">No data available</p>
          ) : (
            <div className="space-y-4">
              {data.slice(0, 7).map(row => {
                const tokens = row.tokensInput + row.tokensOutput;
                const pct = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0;
                return (
                  <div key={row.department}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground/80">{row.department}</span>
                      <span className="text-primary font-semibold text-xs">
                        {(tokens / 1000).toFixed(1)}K tokens
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-primary h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{pct}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 bg-card border border-border rounded-xl">
          <h3 className="font-semibold text-foreground mb-4">AI Model Distribution</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-muted/60 rounded animate-pulse" />)}</div>
          ) : modelData.length === 0 ? (
            <p className="text-muted-foreground/70 text-sm">No model usage data yet.</p>
          ) : (
            <div className="space-y-3">
              {modelData.slice(0, 6).map((m) => {
                const tokens = (m._sum.tokensInput || 0) + (m._sum.tokensOutput || 0);
                const pct = totalModelTokens > 0 ? Math.round((tokens / totalModelTokens) * 100) : 0;
                const label = m.aiModel || m.aiProvider;
                return (
                  <div key={`${m.aiProvider}-${m.aiModel}`} className="flex items-center gap-3">
                    <span className="text-foreground/80 text-sm w-36 flex-shrink-0 truncate" title={label}>{label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-gradient-to-r from-primary to-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted-foreground text-xs w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const isAllowed = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN";

  useEffect(() => {
    if (!isAllowed) return;
    fetch("/api/admin/audit")
      .then(r => r.json())
      .then(d => setLogs(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAllowed]);

  if (!isAllowed) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Lock className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground">Restricted Access</h3>
      <p className="text-muted-foreground/70 text-sm mt-1">This section is restricted to Executives and Super Admins only.</p>
    </div>
  );

  const levelColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("SUSPEND")) return "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300 border border-red-500/20 dark:border-red-700/20";
    if (action.includes("UPDATE") || action.includes("PATCH")) return "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-500/20 dark:border-yellow-700/20";
    return "bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-500/20 dark:border-blue-700/20";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Platform Audit Log</h2>
        <p className="text-muted-foreground text-sm mt-1">High-density security and event audit trail — Executives & Super Admins only</p>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Timestamp</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Actor</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Action</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Resource</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-border/30">
                {[...Array(5)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-3 bg-muted/70 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : logs.map(log => (
              <tr key={log.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground font-mono">
                  {new Date(log.createdAt).toLocaleString("en-PK", { hour12: false })}
                </td>
                <td className="px-4 py-2.5 text-foreground">{log.actor?.name || log.actorId}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-foreground/80">{log.resource}</td>
                <td className="px-4 py-2.5 text-muted-foreground/70 font-mono">{log.ipAddress || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Agents Tab ─────────────────────────────────────────────────────────────────
function AgentsTab() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", model: "gemini-2.5-pro", temp: 0.7, systemPrompt: "" });

  const fetchAgents = () => {
    setLoading(true);
    fetch("/api/admin/agents")
      .then(r => r.json())
      .then(d => setAgents(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(fetchAgents, 0); return () => clearTimeout(t); }, []);

  const handleSave = async () => {
    await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", model: "gemini-2.5-pro", temp: 0.7, systemPrompt: "" });
    fetchAgents();
  };

  const handleDelete = async (name: string) => {
    await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", name }),
    });
    fetchAgents();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agent Studio</h2>
          <p className="text-muted-foreground text-sm mt-1">Create, configure, and manage AI agents with system prompts</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {showForm && (
        <div className="p-5 bg-card border border-primary/30 rounded-xl space-y-4">
          <h3 className="text-foreground font-semibold">New Agent Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Agent Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                placeholder="HR Assistant"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Model</label>
              <select
                value={form.model}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none"
              >
                {["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768", "meta-llama/llama-4-scout-17b-16e-instruct"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Temperature: {form.temp.toFixed(1)}</label>
            <input
              type="range" min={0} max={1} step={0.1}
              value={form.temp}
              onChange={e => setForm(p => ({ ...p, temp: parseFloat(e.target.value) }))}
              className="mt-1 w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={e => setForm(p => ({ ...p, systemPrompt: e.target.value }))}
              rows={3}
              className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 resize-none"
              placeholder="You are a Hamdard HR specialist..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition-colors">Save Agent</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="h-44 bg-muted/50 rounded-xl animate-pulse" />
        )) : agents.map(agent => (
          <div key={agent.name} className="p-5 bg-card border border-border hover:border-primary/30 rounded-xl transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">{agent.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{agent.model}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                agent.status === "Active" ? "bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-300" : "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300"
              }`}>
                {agent.status || "Active"}
              </span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Temperature</span>
                <span className="text-foreground/80">{(agent.temp || 0.7).toFixed(1)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-primary to-primary h-1.5 rounded-full"
                  style={{ width: `${(agent.temp || 0.7) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs transition-colors">
                Edit
              </button>
              <button
                onClick={() => handleDelete(agent.name)}
                className="flex-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg text-xs transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Workflows Tab ─────────────────────────────────────────────────────────────
function WorkflowsTab() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", agents: 1, description: "", status: "Draft" });

  const fetchWorkflows = () => {
    setLoading(true);
    fetch("/api/admin/workflows")
      .then(r => r.json())
      .then(d => setWorkflows(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(fetchWorkflows, 0); return () => clearTimeout(t); }, []);

  const handleSave = async () => {
    await fetch("/api/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    fetchWorkflows();
  };

  const handleDelete = async (name: string) => {
    await fetch("/api/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", name }),
    });
    fetchWorkflows();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Workflow Manager</h2>
          <p className="text-muted-foreground text-sm mt-1">Visual workflow builder for multi-agent orchestration pipelines</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {showForm && (
        <div className="p-5 bg-card border border-primary/30 rounded-xl space-y-4">
          <h3 className="text-foreground font-semibold">New Workflow</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Workflow Name</label>
              <input
                type="text" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                placeholder="Report Generation Pipeline"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Agent Count</label>
              <input
                type="number" min={1} max={10} value={form.agents}
                onChange={e => setForm(p => ({ ...p, agents: parseInt(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        )) : workflows.map(wf => (
          <div key={wf.name} className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/40 border border-primary/20 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{wf.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{wf.agents} agents chained</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  wf.status === "Active" ? "bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-300" :
                  wf.status === "Testing" ? "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300" :
                  "bg-muted text-foreground/80"
                }`}>
                  {wf.status || "Draft"}
                </span>
                <button className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs">Configure</button>
                <button
                  onClick={() => handleDelete(wf.name)}
                  className="p-1.5 hover:bg-red-500/10 dark:hover:bg-red-900/20 rounded transition-colors text-red-500 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Models Tab ────────────────────────────────────────────────────────────────
const MODEL_PROVIDERS = ["google", "openai", "anthropic", "groq", "azure", "ollama", "huggingface", "together", "custom"];
const MODEL_CATEGORIES = ["Chat", "Vision", "Embedding", "Audio", "Video", "OCR", "Code", "Reasoning"];
const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: "bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-300 border-green-500/20",
  DEGRADED: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-500/20",
  DOWN: "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300 border-red-500/20",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};

function ModelsTab() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModelData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [form, setForm] = useState({
    provider: "groq", modelId: "", displayName: "", category: "Chat", version: "", description: "",
    inputCostPer1K: "", outputCostPer1K: "", enabled: true, isDefault: false, credentialId: "",
    maxTokensPerRequest: "", requestsPerMinute: "", dailyRequestLimit: "",
  });

  const fetchModels = () => {
    setLoading(true);
    fetch("/api/admin/models")
      .then(r => r.json())
      .then(d => setModels(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchCredentials = () => {
    fetch("/api/admin/credentials")
      .then(r => r.json())
      .then(d => setCredentials((d.data || []).filter((c: CredentialData) => c.status === "ACTIVE")))
      .catch(() => {});
  };

  useEffect(() => { const t = setTimeout(() => { fetchModels(); fetchCredentials(); }, 0); return () => clearTimeout(t); }, []);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ provider: "groq", modelId: "", displayName: "", category: "Chat", version: "", description: "", inputCostPer1K: "", outputCostPer1K: "", enabled: true, isDefault: false, credentialId: "", maxTokensPerRequest: "", requestsPerMinute: "", dailyRequestLimit: "" });
    setModalOpen(true);
  };

  const openEdit = (m: ModelData) => {
    setEditing(m);
    setError(null);
    const limits = m.limits || {};
    const pricing = m.pricing || {};
    setForm({
      provider: m.provider,
      modelId: m.modelId,
      displayName: m.displayName,
      category: m.category || "Chat",
      version: m.version || "",
      description: m.description || "",
      inputCostPer1K: pricing.inputCostPer1K != null ? String(pricing.inputCostPer1K) : (m.inputCostPer1K != null ? String(m.inputCostPer1K) : ""),
      outputCostPer1K: pricing.outputCostPer1K != null ? String(pricing.outputCostPer1K) : (m.outputCostPer1K != null ? String(m.outputCostPer1K) : ""),
      enabled: m.enabled,
      isDefault: m.isDefault,
      credentialId: m.credentialId || "",
      maxTokensPerRequest: limits.maxTokensPerRequest != null ? String(limits.maxTokensPerRequest) : "",
      requestsPerMinute: limits.requestsPerMinute != null ? String(limits.requestsPerMinute) : "",
      dailyRequestLimit: limits.dailyRequestLimit != null ? String(limits.dailyRequestLimit) : "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.modelId.trim() || !form.displayName.trim()) {
      setError("Model ID and display name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      provider: form.provider,
      modelId: form.modelId.trim(),
      displayName: form.displayName.trim(),
      category: form.category,
      enabled: form.enabled,
      isDefault: form.isDefault,
    };
    if (form.version.trim()) payload.version = form.version.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.credentialId) payload.credentialId = form.credentialId;
    else payload.credentialId = null;
    const inputCost = parseFloat(form.inputCostPer1K);
    const outputCost = parseFloat(form.outputCostPer1K);
    if (form.inputCostPer1K !== "" && Number.isFinite(inputCost) && inputCost >= 0) payload.inputCostPer1K = inputCost;
    if (form.outputCostPer1K !== "" && Number.isFinite(outputCost) && outputCost >= 0) payload.outputCostPer1K = outputCost;
    const limits: Record<string, number> = {};
    const maxTokens = parseInt(form.maxTokensPerRequest);
    const rpm = parseInt(form.requestsPerMinute);
    const dailyReq = parseInt(form.dailyRequestLimit);
    if (form.maxTokensPerRequest !== "" && Number.isFinite(maxTokens) && maxTokens > 0) limits.maxTokensPerRequest = maxTokens;
    if (form.requestsPerMinute !== "" && Number.isFinite(rpm) && rpm > 0) limits.requestsPerMinute = rpm;
    if (form.dailyRequestLimit !== "" && Number.isFinite(dailyReq) && dailyReq > 0) limits.dailyRequestLimit = dailyReq;
    if (Object.keys(limits).length > 0) payload.limits = limits;

    try {
      const res = await fetch(editing ? `/api/admin/models/${editing.id}` : "/api/admin/models", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false);
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: ModelData) => {
    if (!window.confirm(`Delete model "${m.displayName}" (${m.modelId})?`)) return;
    try {
      const res = await fetch(`/api/admin/models/${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Delete failed");
      }
      fetchModels();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleHealthCheck = async (m: ModelData) => {
    try {
      const res = await fetch(`/api/admin/models/${m.id}/health`, { method: "POST" });
      if (!res.ok) throw new Error("Health check failed");
      fetchModels();
    } catch {
      window.alert("Health check failed");
    }
  };

  const filteredModels = filterCategory === "all" ? models : models.filter(m => m.category === filterCategory);
  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";
  const selectClass = inputClass;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Model Registry</h2>
          <p className="text-muted-foreground text-sm mt-1">Enterprise model management with credentials, capabilities, and health monitoring</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground text-sm">
          <option value="all">All Categories</option>
          {MODEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-muted-foreground text-xs">{filteredModels.length} model(s)</span>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Model</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Provider</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Category</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Credential</th>
              <th className="px-4 py-3 text-right text-muted-foreground font-semibold">Input $/1K</th>
              <th className="px-4 py-3 text-right text-muted-foreground font-semibold">Output $/1K</th>
              <th className="px-4 py-3 text-center text-muted-foreground font-semibold">Health</th>
              <th className="px-4 py-3 text-center text-muted-foreground font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-muted-foreground font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-border/30">
                {[...Array(9)].map((_, j) => (
                  <td key={j} className="px-4 py-4"><div className="h-4 bg-muted/70 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : filteredModels.map(m => {
              const pricing = m.pricing || {};
              const inputCost = pricing.inputCostPer1K ?? m.inputCostPer1K ?? 0;
              const outputCost = pricing.outputCostPer1K ?? m.outputCostPer1K ?? 0;
              return (
              <tr key={m.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-foreground font-medium">{m.displayName}</p>
                  <p className="text-muted-foreground/70 text-xs font-mono">{m.modelId}{m.version ? ` v${m.version}` : ""}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-500/20 capitalize">
                    {m.provider}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-foreground/80 text-xs">{m.category || "Chat"}</span>
                </td>
                <td className="px-4 py-3">
                  {m.credential ? (
                    <span className="text-foreground/80 text-xs" title={m.credential.apiKeyAlias}>{m.credential.name}</span>
                  ) : (
                    <span className="text-muted-foreground/50 text-xs italic">env</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-foreground/80 font-mono text-xs">${inputCost.toFixed(4)}</td>
                <td className="px-4 py-3 text-right text-foreground/80 font-mono text-xs">${outputCost.toFixed(4)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${HEALTH_COLORS[m.healthStatus || "UNKNOWN"]}`}>
                    {m.healthStatus || "UNKNOWN"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {m.isDefault && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-500/20">Default</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.enabled ? "bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-300" : "bg-red-500/10 text-red-600 dark:bg-red-900/20 dark:text-red-300"
                    }`}>
                      {m.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleHealthCheck(m)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Health Check">
                      <Activity className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 rounded hover:bg-red-500/10 dark:hover:bg-red-900/20 transition-colors text-red-500 dark:text-red-400" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-muted border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                {editing ? "Edit Model" : "Add Model"}
              </h3>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Provider *</label>
                  <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className={selectClass}>
                    {MODEL_PROVIDERS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Model ID *</label>
                  <input type="text" value={form.modelId} onChange={e => setForm(p => ({ ...p, modelId: e.target.value }))} className={inputClass} placeholder="llama-3.3-70b-versatile" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={selectClass}>
                    {MODEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Display Name *</label>
                <input type="text" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} className={inputClass} placeholder="Llama 3.3 70B Versatile" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Version</label>
                  <input type="text" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className={inputClass} placeholder="3.3" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">API Credential</label>
                  <select value={form.credentialId} onChange={e => setForm(p => ({ ...p, credentialId: e.target.value }))} className={selectClass}>
                    <option value="">Use environment variable</option>
                    {credentials.map(c => <option key={c.id} value={c.id}>{c.name} ({c.apiKeyAlias})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} placeholder="Brief description of this model" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Input Cost $ / 1K tokens</label>
                  <input type="number" min={0} step="0.0001" value={form.inputCostPer1K} onChange={e => setForm(p => ({ ...p, inputCostPer1K: e.target.value }))} className={inputClass} placeholder="0.0008" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Output Cost $ / 1K tokens</label>
                  <input type="number" min={0} step="0.0001" value={form.outputCostPer1K} onChange={e => setForm(p => ({ ...p, outputCostPer1K: e.target.value }))} className={inputClass} placeholder="0.004" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Max Tokens/Request</label>
                  <input type="number" min={1} value={form.maxTokensPerRequest} onChange={e => setForm(p => ({ ...p, maxTokensPerRequest: e.target.value }))} className={inputClass} placeholder="8192" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Requests/Minute</label>
                  <input type="number" min={1} value={form.requestsPerMinute} onChange={e => setForm(p => ({ ...p, requestsPerMinute: e.target.value }))} className={inputClass} placeholder="30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Daily Request Limit</label>
                  <input type="number" min={1} value={form.dailyRequestLimit} onChange={e => setForm(p => ({ ...p, dailyRequestLimit: e.target.value }))} className={inputClass} placeholder="1000" />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                  <input type="checkbox" checked={form.enabled} onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))} className="accent-primary" />
                  Enabled
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="accent-primary" />
                  Default model
                </label>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-500/10 dark:bg-red-900/20 border border-red-500/20 dark:border-red-700/30 rounded-xl text-red-600 dark:text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : (editing ? "Save Changes" : "Add Model")}
              </button>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Credentials Tab ──────────────────────────────────────────────────────────
function CredentialsTab() {
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialData | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", provider: "groq", apiKey: "", baseUrl: "",
    authType: "api_key", organizationId: "", projectId: "",
    region: "", apiVersion: "", notes: "", expiresAt: "",
  });

  const PROVIDERS = ["openai", "anthropic", "google", "groq", "azure", "ollama", "huggingface", "together", "custom"];

  const fetchCredentials = () => {
    setLoading(true);
    fetch("/api/admin/credentials")
      .then(r => r.json())
      .then(d => setCredentials(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCredentials(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.apiKey) { setError("Name and API key are required."); return; }
    setFormSaving(true); setError(null);
    try {
      const payload = { ...form, baseUrl: form.baseUrl || undefined, organizationId: form.organizationId || undefined, projectId: form.projectId || undefined, region: form.region || undefined, apiVersion: form.apiVersion || undefined, expiresAt: form.expiresAt || undefined };
      const url = editing ? `/api/admin/credentials/${editing.id}` : "/api/admin/credentials";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false); fetchCredentials();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credential?")) return;
    try {
      const res = await fetch(`/api/admin/credentials/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      fetchCredentials();
    } catch {}
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/admin/credentials/${id}/test`, { method: "POST" });
      const data = await res.json();
      alert(`Test result: ${data.data?.status || "unknown"} (${data.data?.latencyMs || 0}ms)${data.data?.error ? `\nError: ${data.data.error}` : ""}`);
      fetchCredentials();
    } catch { alert("Test failed"); }
    setTesting(null);
  };

  const openCreate = () => {
    setEditing(null); setError(null);
    setForm({ name: "", provider: "groq", apiKey: "", baseUrl: "", authType: "api_key", organizationId: "", projectId: "", region: "", apiVersion: "", notes: "", expiresAt: "" });
    setModalOpen(true);
  };

  const openEdit = (c: CredentialData) => {
    setEditing(c); setError(null);
    setForm({ name: c.name, provider: c.provider, apiKey: "", baseUrl: c.baseUrl || "", authType: c.authType, organizationId: "", projectId: "", region: "", apiVersion: "", notes: c.notes || "", expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "" });
    setModalOpen(true);
  };

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-600", INACTIVE: "bg-yellow-500/10 text-yellow-600", ROTATED: "bg-blue-500/10 text-blue-600",
  };
  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">API Credential Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage API keys, test connections, rotate credentials</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm"><Plus className="w-4 h-4" /> Add Credential</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      ) : credentials.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-sm border border-border rounded-xl">
          <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No API credentials configured. Add your first credential.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map(c => (
            <div key={c.id} className="p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{c.provider}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] || ""}`}>{c.status}</span>
                    <span className="text-xs text-muted-foreground font-mono">{c.apiKeyAlias}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{c.modelCount || 0} models</span>
                    {c.lastTestedAt && <span>Last tested: {new Date(c.lastTestedAt).toLocaleDateString()}</span>}
                    {c.lastTestResult && <span className={c.lastTestResult === "HEALTHY" ? "text-green-600" : "text-red-600"}>{c.lastTestResult}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleTest(c.id)} disabled={testing === c.id} className="p-1.5 rounded hover:bg-accent text-muted-foreground" title="Test Connection">
                    {testing === c.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-accent text-muted-foreground" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !formSaving && setModalOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">{editing ? "Edit Credential" : "Add Credential"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Name</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="My Groq API" /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Provider</label><select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className={inputClass}>{PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="text-xs text-muted-foreground font-medium">API Key</label><input type="password" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} className={inputClass} placeholder={editing ? "Leave empty to keep current" : "sk-..."} /></div>
              <div><label className="text-xs text-muted-foreground font-medium">Base URL (optional)</label><input type="text" value={form.baseUrl} onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))} className={inputClass} placeholder="https://api.groq.com/openai/v1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Org ID</label><input type="text" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Project ID</label><input type="text" value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Region</label><input type="text" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Expiry Date</label><input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className={inputClass} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground font-medium">Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className={inputClass + " resize-none"} /></div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              {error && <div className="flex items-center gap-2 text-destructive text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-muted hover:bg-accent rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={formSaving} className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold">{formSaving ? "Saving..." : editing ? "Save" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quotas Tab ───────────────────────────────────────────────────────────────
function QuotasTab() {
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuotaData | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    scope: "ORGANIZATION", scopeTargetId: "",
    monthlyBudgetPkr: "", dailyBudgetPkr: "", yearlyBudgetPkr: "",
    monthlyTokenLimit: "", dailyTokenLimit: "",
    monthlyRequestLimit: "", dailyRequestLimit: "",
    maxConcurrentSessions: "", monthlyUploadLimit: "", maxFileSizeBytes: "",
  });

  const SCOPE_LABELS: Record<string, string> = { ORGANIZATION: "🏢 Organization", DEPARTMENT: "🏛️ Department", TEAM: "👥 Team", USER: "👤 User", MODEL: "🤖 Model" };

  const fetchQuotas = () => {
    setLoading(true);
    fetch("/api/admin/quotas").then(r => r.json()).then(d => setQuotas(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchQuotas(); }, []);

  const handleSave = async () => {
    if (!form.scope) { setError("Scope is required."); return; }
    setFormSaving(true); setError(null);
    try {
      const payload: Record<string, unknown> = { scope: form.scope, scopeTargetId: form.scopeTargetId || null };
      if (form.monthlyBudgetPkr) payload.monthlyBudgetPkr = parseFloat(form.monthlyBudgetPkr);
      if (form.dailyBudgetPkr) payload.dailyBudgetPkr = parseFloat(form.dailyBudgetPkr);
      if (form.yearlyBudgetPkr) payload.yearlyBudgetPkr = parseFloat(form.yearlyBudgetPkr);
      if (form.monthlyTokenLimit) payload.monthlyTokenLimit = parseInt(form.monthlyTokenLimit);
      if (form.dailyTokenLimit) payload.dailyTokenLimit = parseInt(form.dailyTokenLimit);
      if (form.monthlyRequestLimit) payload.monthlyRequestLimit = parseInt(form.monthlyRequestLimit);
      if (form.dailyRequestLimit) payload.dailyRequestLimit = parseInt(form.dailyRequestLimit);
      if (form.maxConcurrentSessions) payload.maxConcurrentSessions = parseInt(form.maxConcurrentSessions);
      if (form.monthlyUploadLimit) payload.monthlyUploadLimit = parseInt(form.monthlyUploadLimit);
      if (form.maxFileSizeBytes) payload.maxFileSizeBytes = parseInt(form.maxFileSizeBytes);

      const url = editing ? `/api/admin/quotas/${editing.id}` : "/api/admin/quotas";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false); fetchQuotas();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quota config?")) return;
    const res = await fetch(`/api/admin/quotas/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    fetchQuotas();
  };

  const openCreate = () => {
    setEditing(null); setError(null);
    setForm({ scope: "ORGANIZATION", scopeTargetId: "", monthlyBudgetPkr: "", dailyBudgetPkr: "", yearlyBudgetPkr: "", monthlyTokenLimit: "", dailyTokenLimit: "", monthlyRequestLimit: "", dailyRequestLimit: "", maxConcurrentSessions: "", monthlyUploadLimit: "", maxFileSizeBytes: "" });
    setModalOpen(true);
  };

  const openEdit = (q: QuotaData) => {
    setEditing(q); setError(null);
    setForm({
      scope: q.scope, scopeTargetId: q.scopeTargetId || "",
      monthlyBudgetPkr: q.monthlyBudgetPkr?.toString() || "", dailyBudgetPkr: q.dailyBudgetPkr?.toString() || "", yearlyBudgetPkr: q.yearlyBudgetPkr?.toString() || "",
      monthlyTokenLimit: q.monthlyTokenLimit?.toString() || "", dailyTokenLimit: q.dailyTokenLimit?.toString() || "",
      monthlyRequestLimit: q.monthlyRequestLimit?.toString() || "", dailyRequestLimit: q.dailyRequestLimit?.toString() || "",
      maxConcurrentSessions: q.maxConcurrentSessions?.toString() || "", monthlyUploadLimit: q.monthlyUploadLimit?.toString() || "", maxFileSizeBytes: q.maxFileSizeBytes?.toString() || "",
    });
    setModalOpen(true);
  };

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quota Management</h2>
          <p className="text-muted-foreground text-sm mt-1">Hierarchical quotas: User → Team → Department → Organization</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm"><Plus className="w-4 h-4" /> Add Quota</button>
      </div>

      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      : quotas.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm border border-border rounded-xl"><DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No quota configurations. Organization default will be used.</p></div>
      : (
        <div className="space-y-2">
          {quotas.map(q => (
            <div key={q.id} className="p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{SCOPE_LABELS[q.scope] || q.scope}</span>
                    {q.scopeTargetId && <span className="text-xs text-muted-foreground font-mono">{q.scopeTargetId.substring(0, 8)}...</span>}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.status === "ACTIVE" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>{q.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {q.monthlyBudgetPkr && <span>Monthly: PKR {q.monthlyBudgetPkr.toLocaleString()}</span>}
                    {q.dailyBudgetPkr && <span>Daily: PKR {q.dailyBudgetPkr.toLocaleString()}</span>}
                    {q.monthlyTokenLimit && <span>Tokens: {q.monthlyTokenLimit.toLocaleString()}</span>}
                    {q.monthlyRequestLimit && <span>Requests: {q.monthlyRequestLimit}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Edit2 className="w-4 h-4" /></button>
                  {q.scope !== "ORGANIZATION" && <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !formSaving && setModalOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">{editing ? "Edit Quota" : "Add Quota"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Scope</label><select value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} className={inputClass} disabled={!!editing}>{Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="text-xs text-muted-foreground font-medium">Target ID (optional)</label><input type="text" value={form.scopeTargetId} onChange={e => setForm(p => ({ ...p, scopeTargetId: e.target.value }))} className={inputClass} placeholder="dept/team/user ID" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Monthly Budget (PKR)</label><input type="number" value={form.monthlyBudgetPkr} onChange={e => setForm(p => ({ ...p, monthlyBudgetPkr: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Daily Budget (PKR)</label><input type="number" value={form.dailyBudgetPkr} onChange={e => setForm(p => ({ ...p, dailyBudgetPkr: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Yearly Budget (PKR)</label><input type="number" value={form.yearlyBudgetPkr} onChange={e => setForm(p => ({ ...p, yearlyBudgetPkr: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Monthly Token Limit</label><input type="number" value={form.monthlyTokenLimit} onChange={e => setForm(p => ({ ...p, monthlyTokenLimit: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Daily Token Limit</label><input type="number" value={form.dailyTokenLimit} onChange={e => setForm(p => ({ ...p, dailyTokenLimit: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Monthly Request Limit</label><input type="number" value={form.monthlyRequestLimit} onChange={e => setForm(p => ({ ...p, monthlyRequestLimit: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Daily Request Limit</label><input type="number" value={form.dailyRequestLimit} onChange={e => setForm(p => ({ ...p, dailyRequestLimit: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs text-muted-foreground font-medium">Max Concurrent</label><input type="number" value={form.maxConcurrentSessions} onChange={e => setForm(p => ({ ...p, maxConcurrentSessions: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Monthly Uploads</label><input type="number" value={form.monthlyUploadLimit} onChange={e => setForm(p => ({ ...p, monthlyUploadLimit: e.target.value }))} className={inputClass} /></div>
                <div><label className="text-xs text-muted-foreground font-medium">Max File Size (bytes)</label><input type="number" value={form.maxFileSizeBytes} onChange={e => setForm(p => ({ ...p, maxFileSizeBytes: e.target.value }))} className={inputClass} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              {error && <div className="flex items-center gap-2 text-destructive text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-muted hover:bg-accent rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={formSaving} className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold">{formSaving ? "Saving..." : editing ? "Save" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cost Centers Tab ─────────────────────────────────────────────────────────
function CostCentersTab() {
  const [centers, setCenters] = useState<CostCenterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenterData | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ code: "", name: "", description: "" });

  const fetchCenters = () => {
    setLoading(true);
    fetch("/api/admin/cost-centers").then(r => r.json()).then(d => setCenters(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchCenters(); }, []);

  const handleSave = async () => {
    if (!form.code || !form.name) { setError("Code and name are required."); return; }
    setFormSaving(true); setError(null);
    try {
      const url = editing ? `/api/admin/cost-centers/${editing.id}` : "/api/admin/cost-centers";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setModalOpen(false); fetchCenters();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cost center?")) return;
    const res = await fetch(`/api/admin/cost-centers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    fetchCenters();
  };

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cost Centers</h2>
          <p className="text-muted-foreground text-sm mt-1">Track AI expenditure by department, team, or project</p>
        </div>
        <button onClick={() => { setEditing(null); setError(null); setForm({ code: "", name: "", description: "" }); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm"><Plus className="w-4 h-4" /> Add Cost Center</button>
      </div>

      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}</div>
      : centers.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm border border-border rounded-xl"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No cost centers configured.</p></div>
      : (
        <div className="space-y-2">
          {centers.map(c => (
            <div key={c.id} className="p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === "ACTIVE" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{c._count?.departments || 0} departments</span>
                    <span>{c._count?.teams || 0} teams</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(c); setForm({ code: c.code, name: c.name, description: c.description || "" }); setModalOpen(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !formSaving && setModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">{editing ? "Edit Cost Center" : "Add Cost Center"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div><label className="text-xs text-muted-foreground font-medium">Code</label><input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className={inputClass} placeholder="FIN-001" /></div>
              <div><label className="text-xs text-muted-foreground font-medium">Name</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Finance Department" /></div>
              <div><label className="text-xs text-muted-foreground font-medium">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} /></div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              {error && <div className="flex items-center gap-2 text-destructive text-xs"><AlertTriangle className="w-4 h-4" /><span>{error}</span></div>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-muted hover:bg-accent rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={formSaving} className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-semibold">{formSaving ? "Saving..." : editing ? "Save" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":    return <OverviewTab />;
      case "users":       return <UsersTab />;
      case "teams":       return <TeamsTab />;
      case "roles":       return <RolesTab />;
      case "policies":    return <PoliciesTab />;
      case "costs":       return <CostsTab />;
      case "analytics":   return <AnalyticsTab />;
      case "audit":       return <AuditTab />;
      case "agents":      return <AgentsTab />;
      case "workflows":   return <WorkflowsTab />;
      case "models":      return <ModelsTab />;
      case "credentials": return <CredentialsTab />;
      case "quotas":      return <QuotasTab />;
      case "costcenters": return <CostCentersTab />;
      default:            return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <HamdardLogo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Hamdard Enterprise AI Management</p>
            </div>
          </div>

          {/* Live metrics */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              All Systems Operational
            </div>
            <div className="text-muted-foreground">{session?.user?.name} · {session?.user?.role?.replace("_", " ")}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted rounded-lg p-1">
              <ThemeToggle collapsed />
            </div>
            <a
              href="/chat"
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-border text-primary rounded-lg text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </a>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card px-6 overflow-x-auto">
        <div className="max-w-screen-2xl mx-auto flex gap-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-screen-2xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
