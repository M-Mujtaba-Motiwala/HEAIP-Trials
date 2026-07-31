"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Search,
  Edit2,
  X,
  UserCheck,
  UserX,
  Users,
  Clock,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import adminStyles from "../admin.module.css";
import styles from "./users.module.css";

interface Role {
  id: string;
  code: string;
  name: string;
}

interface UserRole {
  id: string;
  role: Role;
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  departmentId: string | null;
  designation: string;
  role: string;
  userType: string;
  registrationStatus: string;
  isActive: boolean;
  createdAt: string;
  userRoles: UserRole[];
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface UsersClientProps {
  initialEmployees: Employee[];
  initialPending: Employee[];
  departments: Department[];
  roles: Role[];
}

function regStatusClass(status: string): string {
  if (status === "PENDING") return styles.statusPending;
  if (status === "REJECTED") return styles.statusRejected;
  return styles.statusApproved;
}

export default function UsersClient({
  initialEmployees,
  initialPending,
  departments,
  roles,
}: UsersClientProps) {
  const pageSize = 10;
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [employees, setEmployees] = useState(initialEmployees);
  const [pending, setPending] = useState(initialPending);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState("");

  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    designation: "",
    departmentId: "",
    role: "",
    isActive: true,
    userType: "EMPLOYEE",
  });
  const [assignRoleId, setAssignRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (deptFilter) params.set("department", deptFilter);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      params.set("registrationStatus", "APPROVED");
      const pendingParams = new URLSearchParams({ registrationStatus: "PENDING" });
      const [employeesRes, pendingRes] = await Promise.all([
        fetch(`/api/admin/users?${params}`),
        fetch(`/api/admin/users?${pendingParams}`),
      ]);
      const [employeesJson, pendingJson] = await Promise.all([
        employeesRes.json(),
        pendingRes.json(),
      ]);
      if (employeesJson.data) setEmployees(employeesJson.data);
      if (pendingJson.data) setPending(pendingJson.data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const pageCount = Math.max(1, Math.ceil(employees.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleEmployees = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstEmployee = employees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastEmployee = Math.min(currentPage * pageSize, employees.length);

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setEditForm({
      designation: emp.designation,
      departmentId: emp.departmentId || "",
      role: emp.role,
      isActive: emp.isActive,
      userType: emp.userType,
    });
    setAssignRoleId("");
  };

  const handleSave = async () => {
    if (!editEmployee) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchEmployees();
        setEditEmployee(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!editEmployee || !assignRoleId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editEmployee.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: assignRoleId }),
      });
      if (res.ok) {
        const detail = await fetch(`/api/admin/users/${editEmployee.id}`);
        const json = await detail.json();
        if (json.data) {
          setEditEmployee(json.data);
          setEmployees((prev) =>
            prev.map((e) => (e.id === json.data.id ? json.data : e))
          );
        }
        setAssignRoleId("");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeRole = async (roleId: string) => {
    if (!editEmployee) return;
    const res = await fetch(
      `/api/admin/users/${editEmployee.id}/roles?roleId=${roleId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const detail = await fetch(`/api/admin/users/${editEmployee.id}`);
      const json = await detail.json();
      if (json.data) {
        setEditEmployee(json.data);
        setEmployees((prev) =>
          prev.map((e) => (e.id === json.data.id ? json.data : e))
        );
      }
    }
  };

  const handleApproval = async (userId: string, action: "APPROVE" | "REJECT") => {
    const res = await fetch("/api/admin/users/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.id !== userId));
      await fetchEmployees();
    }
  };

  const handleAddEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddEmployeeError("");
    setAddingEmployee(true);

    try {
      const formData = new FormData(event.currentTarget);
      const userType = String(formData.get("userType") || "EMPLOYEE");
      const isEmployee = userType === "EMPLOYEE";
      const res = await fetch(isEmployee ? "/api/auth/register" : "/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          employeeId: formData.get("employeeId"),
          password: formData.get("password"),
          ...(isEmployee
            ? { departmentCode: formData.get("departmentCode") }
            : { departmentId: departments.find((department) => department.code === formData.get("departmentCode"))?.id }),
          designation: formData.get("designation"),
          userType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddEmployeeError(json.error || "Unable to add the employee.");
        return;
      }

      setIsAddEmployeeOpen(false);
      await fetchEmployees();
      setActiveTab("pending");
    } catch {
      setAddEmployeeError("Unable to reach the registration service. Please try again.");
    } finally {
      setAddingEmployee(false);
    }
  };

  const deptNames = [...new Set(departments.map((d) => d.name))].sort();

  return (
    <>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === "all" ? styles.active : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <Users size={16} />
          All Employees
          <span className={styles.tabBadge}>{employees.length}</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === "pending" ? styles.active : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <Clock size={16} />
          Pending Approvals
          {pending.length > 0 && (
            <span className={styles.tabBadge}>{pending.length}</span>
          )}
        </button>
      </div>

      {activeTab === "all" && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, email, employee ID…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Departments</option>
                {deptNames.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              type="button"
              className={styles.addEmployeeButton}
              onClick={() => {
                setAddEmployeeError("");
                setIsAddEmployeeOpen(true);
              }}
            >
              <UserPlus size={16} />
              Add Employee
            </button>
          </div>

          <div className={adminStyles.sectionCard}>
            <div className={adminStyles.sectionHeader}>
              <h2 className={adminStyles.sectionTitle}>
                Employee Directory
                {loading && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 400 }}>
                    Updating…
                  </span>
                )}
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className={adminStyles.dataTable}>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className={styles.emptyState}>No employees match your filters.</div>
                      </td>
                    </tr>
                  ) : (
                    visibleEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                            {emp.employeeId}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{emp.name}</td>
                        <td>{emp.email}</td>
                        <td>{emp.department}</td>
                        <td>{emp.designation}</td>
                        <td>
                          <div className={styles.roleTags}>
                            {(emp.userRoles?.length ? emp.userRoles : [{ role: { code: emp.role, name: emp.role, id: "" } }]).map((ur) => (
                              <span key={ur.role.code} className={styles.roleTag}>
                                {ur.role.name || ur.role.code.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${adminStyles.roleBadge} ${
                              emp.isActive ? adminStyles.employee : adminStyles.super
                            }`}
                          >
                            {emp.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.actionBtn}
                              title="Edit employee"
                              onClick={() => openEdit(emp)}
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {employees.length > 0 && (
              <nav className={styles.pagination} aria-label="Employee directory pagination">
                <span className={styles.paginationSummary}>
                  Showing {firstEmployee}–{lastEmployee} of {employees.length}
                </span>
                <div className={styles.paginationControls}>
                  <button
                    className={styles.paginationButton}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>
                  <span className={styles.pageIndicator}>Page {currentPage} of {pageCount}</span>
                  <button
                    className={styles.paginationButton}
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={currentPage === pageCount}
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </nav>
            )}
          </div>
        </>
      )}

      {activeTab === "pending" && (
        <div className={adminStyles.sectionCard}>
          <div className={adminStyles.sectionHeader}>
            <h2 className={adminStyles.sectionTitle}>
              Pending Registration Approvals
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
              {pending.length} awaiting review
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={adminStyles.dataTable}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.emptyState}>
                        No pending registrations. All clear!
                      </div>
                    </td>
                  </tr>
                ) : (
                  pending.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                          {emp.employeeId}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>{emp.department}</td>
                      <td>{emp.designation}</td>
                      <td>
                        <span className={`${adminStyles.roleBadge} ${regStatusClass(emp.registrationStatus)}`}>
                          {new Date(emp.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className={`${styles.approveBtn} ${styles.approve}`}
                            onClick={() => handleApproval(emp.id, "APPROVE")}
                          >
                            <UserCheck size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            Approve
                          </button>
                          <button
                            className={`${styles.approveBtn} ${styles.reject}`}
                            onClick={() => handleApproval(emp.id, "REJECT")}
                          >
                            <UserX size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            Reject
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
      )}

      {editEmployee && (
        <div className={styles.modalOverlay} onClick={() => setEditEmployee(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit — {editEmployee.name}</h3>
              <button className={styles.modalClose} onClick={() => setEditEmployee(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Designation</label>
                <input
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Department</label>
                <select
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                >
                  <option value="">— Select —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Primary Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>User Type</label>
                <select
                  value={editForm.userType}
                  onChange={(e) => setEditForm({ ...editForm, userType: e.target.value })}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="THIRD_PARTY">Third Party</option>
                  <option value="GUEST">Guest</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Account Status</label>
                <select
                  value={editForm.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.value === "active" })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Assigned Roles (dRBAC)</label>
                <div className={styles.roleTags} style={{ marginBottom: 8 }}>
                  {editEmployee.userRoles?.map((ur) => (
                    <span key={ur.id} className={styles.roleTag}>
                      {ur.role.name}
                      <button
                        className={styles.roleTagRemove}
                        onClick={() => handleRevokeRole(ur.role.id)}
                        title="Revoke role"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={assignRoleId}
                    onChange={(e) => setAssignRoleId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Add role…</option>
                    {roles
                      .filter(
                        (r) =>
                          !editEmployee.userRoles?.some((ur) => ur.role.id === r.id)
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                  <button
                    className={styles.btnPrimary}
                    disabled={!assignRoleId || saving}
                    onClick={handleAssignRole}
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setEditEmployee(null)}>
                Cancel
              </button>
              <button className={styles.btnPrimary} disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddEmployeeOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddEmployeeOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-employee-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 id="add-employee-title">Add employee</h3>
                <p className={styles.modalDescription}>The account will be sent to Pending Approvals for review.</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setIsAddEmployeeOpen(false)} aria-label="Close add employee dialog">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className={styles.modalBody}>
                {addEmployeeError && <p className={styles.formError} role="alert">{addEmployeeError}</p>}
                <div className={styles.formGroup}>
                  <label htmlFor="employee-name">Full name</label>
                  <input id="employee-name" name="name" required autoComplete="name" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="employee-id">Employee ID</label>
                  <input id="employee-id" name="employeeId" required autoComplete="off" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="employee-email">Work email</label>
                  <input id="employee-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="employee-password">Temporary password</label>
                  <input id="employee-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="employee-department">Department</label>
                  <select id="employee-department" name="departmentCode" required defaultValue="">
                    <option value="" disabled>Select a department</option>
                    {departments.map((department) => <option key={department.id} value={department.code}>{department.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="employee-designation">Designation</label>
                  <input id="employee-designation" name="designation" required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="employee-type">User type</label>
                  <select id="employee-type" name="userType" defaultValue="EMPLOYEE">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="THIRD_PARTY">Third Party</option>
                    <option value="GUEST">Guest</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsAddEmployeeOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={addingEmployee}>{addingEmployee ? "Adding…" : "Add employee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
