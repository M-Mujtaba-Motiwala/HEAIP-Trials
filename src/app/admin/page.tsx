"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3, Users, Shield, Lock, TrendingUp,
  Zap, ArrowLeft, Building2, ScrollText, Bot, GitBranch,
  RefreshCw, Plus, Edit2, Trash2, UserCheck, UserX, Search,
  AlertTriangle, Activity, DollarSign, Cpu, X, type LucideIcon,
} from "lucide-react";
import { HamdardLogo } from "@/components/HamdardLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Types ───────────────────────────────────────────────────────────────────
type AdminTab =
  | "overview" | "users" | "teams" | "roles" | "policies"
  | "costs" | "analytics" | "audit" | "agents" | "workflows" | "models";

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
  enabled: boolean; isDefault: boolean; metadataJson?: string;
  inputCostPer1K?: number | null; outputCostPer1K?: number | null;
}

// ─── Tab Config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Overview",   icon: BarChart3 },
  { id: "users",      label: "Users",      icon: Users },
  { id: "teams",      label: "Teams",      icon: Building2 },
  { id: "roles",      label: "Roles",      icon: Lock },
  { id: "policies",   label: "Policies",   icon: Shield },
  { id: "costs",      label: "Costs",      icon: DollarSign },
  { id: "analytics",  label: "Analytics",  icon: TrendingUp },
  { id: "audit",      label: "Audit",      icon: ScrollText },
  { id: "agents",     label: "Agents",     icon: Bot },
  { id: "workflows",  label: "Workflows",  icon: GitBranch },
  { id: "models",     label: "Models",     icon: Cpu },
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
      setStats({ totalUsers: 52, activeUsers: 48, totalCost: 162.41, totalTokens: 12400000 });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground text-sm mt-1">{users.length} employees registered</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
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
                    user.role === "SUPER_ADMIN" ? "bg-purple-900/30 text-purple-300 border border-purple-700/30" :
                    user.role === "ADMIN" ? "bg-blue-900/30 text-blue-300 border border-blue-700/30" :
                    "bg-primary/10 text-primary border border-border"
                  }`}>
                    {user.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.isActive ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"
                  }`}>
                    {user.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActivation(user.id, user.isActive)}
                      title={user.isActive ? "Suspend" : "Activate"}
                      className={`p-1.5 rounded hover:bg-accent transition-colors ${user.isActive ? "text-red-400" : "text-green-400"}`}
                    >
                      {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Teams Tab ─────────────────────────────────────────────────────────────────
function TeamsTab() {
  const [depts, setDepts] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then(r => r.json())
      .then(d => setDepts(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Departments & Teams</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage organizational structure and cross-functional teams</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
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
              <button className="p-1.5 hover:bg-accent rounded-lg transition-colors">
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </button>
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
                <p className={`font-semibold text-xs ${dept.status === "ACTIVE" ? "text-green-400" : "text-red-400"}`}>
                  {dept.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
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

  useEffect(() => {
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
  }, []);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Roles & Permissions</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage dynamic RBAC roles and permission delegation</p>
        </div>
        {isSuperAdmin && (
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {/* Sticky Superadmin System-Alert */}
      <div className="sticky top-0 z-10 p-4 bg-yellow-900/30 border border-yellow-600/40 rounded-xl flex items-start gap-3 backdrop-blur">
        <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
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
                        ? "bg-yellow-900/20 text-yellow-300 border border-yellow-700/30"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {isLocked ? "System Locked" : "Editable"}
                    </span>
                  </td>
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
    </div>
  );
}

// ── Policies Tab ──────────────────────────────────────────────────────────────
function PoliciesTab() {
  const [policies, setPolicies] = useState({
    dataSharing: true, quotaAllocation: true, piiMasking: true,
    safetyFilters: true, contentFilter: false, auditLogging: true,
  });
  const [saving, setSaving] = useState<string | null>(null);

  const POLICY_ITEMS = [
    { key: "dataSharing", label: "Data Sharing", description: "Allow cross-department AI context sharing" },
    { key: "quotaAllocation", label: "Quota Allocation", description: "Enable automatic quota distribution per role" },
    { key: "piiMasking", label: "PII Masking", description: "Automatically mask sensitive personal information in prompts" },
    { key: "safetyFilters", label: "Safety Filters", description: "Apply Hamdard HR safety content filters" },
    { key: "contentFilter", label: "Strict Content Filter", description: "Block potentially sensitive corporate topics" },
    { key: "auditLogging", label: "Audit Logging", description: "Log all AI interactions for security review" },
  ];

  const togglePolicy = async (key: string) => {
    const newVal = !policies[key as keyof typeof policies];
    setSaving(key);
    setPolicies(prev => ({ ...prev, [key]: newVal }));
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `policy_${key}`, value: String(newVal), category: "AI" }),
      });
    } catch {}
    setSaving(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Policies & Governance</h2>
        <p className="text-muted-foreground text-sm mt-1">HR/Compliance policies, safety measures, and quota controls</p>
      </div>

      <div className="space-y-3">
        {POLICY_ITEMS.map(({ key, label, description }) => (
          <div key={key} className="p-4 bg-card border border-border rounded-xl flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">{label}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
            <button
              onClick={() => togglePolicy(key)}
              disabled={saving === key}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors flex-shrink-0 ${
                policies[key as keyof typeof policies] ? "bg-primary" : "bg-muted"
              }`}
            >
              {saving === key && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-3 h-3 animate-spin text-foreground/70" />
                </div>
              )}
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  policies[key as keyof typeof policies] ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
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
          <div className="mt-3 flex items-center gap-2 text-red-300 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTokens = data.reduce((s, d) => s + d.tokensInput + d.tokensOutput, 0);

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
          <div className="space-y-3">
            {[
              { model: "Gemini 2.5 Pro", usage: 55, color: "from-blue-600 to-cyan-400" },
              { model: "GPT-4o", usage: 30, color: "from-green-600 to-emerald-400" },
              { model: "Claude Sonnet", usage: 10, color: "from-orange-600 to-amber-400" },
              { model: "Gemini 2.0 Flash", usage: 5, color: "from-purple-600 to-violet-400" },
            ].map(({ model, usage, color }) => (
              <div key={model} className="flex items-center gap-3">
                <span className="text-foreground/80 text-sm w-32 flex-shrink-0">{model}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className={`bg-gradient-to-r ${color} h-2 rounded-full`} style={{ width: `${usage}%` }} />
                </div>
                <span className="text-muted-foreground text-xs w-8 text-right">{usage}%</span>
              </div>
            ))}
          </div>
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
    if (action.includes("DELETE") || action.includes("SUSPEND")) return "bg-red-900/20 text-red-300 border border-red-700/20";
    if (action.includes("UPDATE") || action.includes("PATCH")) return "bg-yellow-900/20 text-yellow-300 border border-yellow-700/20";
    return "bg-blue-900/20 text-blue-300 border border-blue-700/20";
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
                agent.status === "Active" ? "bg-green-900/20 text-green-300" : "bg-yellow-900/20 text-yellow-300"
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
                className="flex-1 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/30 text-red-300 rounded-lg text-xs transition-colors"
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
                  wf.status === "Active" ? "bg-green-900/20 text-green-300" :
                  wf.status === "Testing" ? "bg-yellow-900/20 text-yellow-300" :
                  "bg-muted text-foreground/80"
                }`}>
                  {wf.status || "Draft"}
                </span>
                <button className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs">Configure</button>
                <button
                  onClick={() => handleDelete(wf.name)}
                  className="p-1.5 hover:bg-red-900/20 rounded transition-colors text-red-400"
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
const MODEL_PROVIDERS = ["google", "openai", "anthropic", "custom"];

function ModelsTab() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModelData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider: "google", modelId: "", displayName: "",
    inputCostPer1K: "", outputCostPer1K: "", enabled: true, isDefault: false,
  });

  const fetchModels = () => {
    setLoading(true);
    fetch("/api/admin/models")
      .then(r => r.json())
      .then(d => setModels(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(fetchModels, 0); return () => clearTimeout(t); }, []);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ provider: "google", modelId: "", displayName: "", inputCostPer1K: "", outputCostPer1K: "", enabled: true, isDefault: false });
    setModalOpen(true);
  };

  const openEdit = (m: ModelData) => {
    setEditing(m);
    setError(null);
    setForm({
      provider: m.provider,
      modelId: m.modelId,
      displayName: m.displayName,
      inputCostPer1K: m.inputCostPer1K != null ? String(m.inputCostPer1K) : "",
      outputCostPer1K: m.outputCostPer1K != null ? String(m.outputCostPer1K) : "",
      enabled: m.enabled,
      isDefault: m.isDefault,
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
      enabled: form.enabled,
      isDefault: form.isDefault,
    };
    const inputCost = parseFloat(form.inputCostPer1K);
    const outputCost = parseFloat(form.outputCostPer1K);
    if (form.inputCostPer1K !== "" && Number.isFinite(inputCost) && inputCost >= 0) payload.inputCostPer1K = inputCost;
    if (form.outputCostPer1K !== "" && Number.isFinite(outputCost) && outputCost >= 0) payload.outputCostPer1K = outputCost;

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

  const inputClass = "mt-1 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Model Registry</h2>
          <p className="text-muted-foreground text-sm mt-1">Add any model provider with per-1K token pricing for cost calculation</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Model</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Provider</th>
              <th className="px-5 py-3 text-right text-muted-foreground font-semibold">Input $ / 1K</th>
              <th className="px-5 py-3 text-right text-muted-foreground font-semibold">Output $ / 1K</th>
              <th className="px-5 py-3 text-center text-muted-foreground font-semibold">Status</th>
              <th className="px-5 py-3 text-left text-muted-foreground font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-border/30">
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-4 bg-muted/70 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : models.map(m => (
              <tr key={m.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-foreground font-medium">{m.displayName}</p>
                  <p className="text-muted-foreground/70 text-xs font-mono">{m.modelId}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900/20 text-blue-300 border border-blue-700/20 capitalize">
                    {m.provider}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-foreground/80 font-mono text-xs">${(m.inputCostPer1K ?? 0).toFixed(4)}</td>
                <td className="px-5 py-3 text-right text-foreground/80 font-mono text-xs">${(m.outputCostPer1K ?? 0).toFixed(4)}</td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {m.isDefault && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/20 text-yellow-300 border border-yellow-700/30">Default</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.enabled ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"
                    }`}>
                      {m.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 rounded hover:bg-red-900/20 transition-colors text-red-400" title="Delete">
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
          <div className="w-full max-w-lg bg-muted border border-border rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                {editing ? "Edit Model" : "Add Model"}
              </h3>
              <button onClick={() => setModalOpen(false)} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Provider</label>
                <select
                  value={form.provider}
                  onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                  className={inputClass}
                >
                  {MODEL_PROVIDERS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Model ID</label>
                <input
                  type="text"
                  value={form.modelId}
                  onChange={e => setForm(p => ({ ...p, modelId: e.target.value }))}
                  className={inputClass}
                  placeholder="llama-3.3-70b-versatile"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs text-muted-foreground font-medium">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                className={inputClass}
                placeholder="Claude 3.5 Haiku"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Input Cost $ / 1K tokens</label>
                <input
                  type="number" min={0} step="0.0001"
                  value={form.inputCostPer1K}
                  onChange={e => setForm(p => ({ ...p, inputCostPer1K: e.target.value }))}
                  className={inputClass}
                  placeholder="0.0008"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Output Cost $ / 1K tokens</label>
                <input
                  type="number" min={0} step="0.0001"
                  value={form.outputCostPer1K}
                  onChange={e => setForm(p => ({ ...p, outputCostPer1K: e.target.value }))}
                  className={inputClass}
                  placeholder="0.004"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 mt-5">
              <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                <input type="checkbox" checked={form.enabled} onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))} className="accent-primary" />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="accent-primary" />
                Default model
              </label>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
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

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":   return <OverviewTab />;
      case "users":      return <UsersTab />;
      case "teams":      return <TeamsTab />;
      case "roles":      return <RolesTab />;
      case "policies":   return <PoliciesTab />;
      case "costs":      return <CostsTab />;
      case "analytics":  return <AnalyticsTab />;
      case "audit":      return <AuditTab />;
      case "agents":     return <AgentsTab />;
      case "workflows":  return <WorkflowsTab />;
      case "models":     return <ModelsTab />;
      default:           return <OverviewTab />;
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
