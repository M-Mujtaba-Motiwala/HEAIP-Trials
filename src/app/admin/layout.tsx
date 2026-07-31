// =============================================================================
// Admin Layout — Server component with dynamic dRBAC sidebar navigation
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminSidebar from "./AdminSidebar";
import styles from "./admin.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRoles = session.user.roles || [session.user.role];
  const permissions = session.user.permissions || [];

  const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
  const isAuthorized =
    isSuperAdmin ||
    userRoles.includes("ADMIN") ||
    userRoles.includes("DEPT_MANAGER") ||
    permissions.includes("admin.dashboard.view") ||
    permissions.includes("*");

  if (!isAuthorized) {
    redirect("/chat?error=unauthorized");
  }

  // Fetch UI Modules dynamically from dRBAC tables
  let visibleModules: Array<{ route: string; moduleName: string; icon: string }> = [];

  if (isSuperAdmin) {
    visibleModules = await db.uiModule.findMany({
      where: { enabled: true },
      orderBy: { orderIndex: "asc" },
      select: { route: true, moduleName: true, icon: true },
    });
  } else {
    const roleRecords = await db.role.findMany({
      where: { code: { in: userRoles }, isActive: true },
      select: { id: true },
    });
    const roleIds = roleRecords.map((r) => r.id);

    const roleModules = await db.roleModule.findMany({
      where: { roleId: { in: roleIds } },
      include: { module: true },
    });

    const moduleMap = new Map<string, { route: string; moduleName: string; icon: string; orderIndex: number }>();
    roleModules.forEach((rm) => {
      if (rm.module && rm.module.enabled) {
        moduleMap.set(rm.module.id, {
          route: rm.module.route,
          moduleName: rm.module.moduleName,
          icon: rm.module.icon,
          orderIndex: rm.module.orderIndex,
        });
      }
    });

    visibleModules = Array.from(moduleMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar
        user={{
          name: session.user.name,
          role: session.user.role,
        }}
        modules={visibleModules}
      />
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}

