// =============================================================================
// Admin Users Page — Enhanced employee directory with search, filters & approvals
// =============================================================================

import { db } from "@/lib/db";
import styles from "../admin.module.css";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  const [employees, pending, departments, roles] = await Promise.all([
    db.employee.findMany({
      where: { registrationStatus: "APPROVED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        departmentId: true,
        designation: true,
        role: true,
        userType: true,
        registrationStatus: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          select: {
            id: true,
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
    }),
    db.employee.findMany({
      where: { registrationStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        departmentId: true,
        designation: true,
        role: true,
        userType: true,
        registrationStatus: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          select: {
            id: true,
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
    }),
    db.department.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.role.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <div className={styles.adminPageHeader}>
        <h1 className={styles.adminPageTitle}>User Management</h1>
        <p className={styles.adminPageSubtitle}>
          {employees.length} active users · {pending.length} pending approval
        </p>
      </div>

      <UsersClient
        initialEmployees={employees.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        }))}
        initialPending={pending.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        }))}
        departments={departments}
        roles={roles}
      />
    </>
  );
}
