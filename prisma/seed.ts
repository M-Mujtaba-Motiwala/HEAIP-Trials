// =============================================================================
// Hamdard AI Platform — Database Seed Script
// -----------------------------------------------------------------------------
// Seeds: 10 departments, 6 roles, ~30 permissions, 6 employees (1 per role),
//        system settings, AI model registry, delegation policy, 1 AI policy.
//
// Run:  npx tsx prisma/seed.ts
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  { code: "EXEC", name: "Executive Office", description: "Executive leadership" },
  { code: "IT", name: "IT Department", description: "Information Technology" },
  { code: "MKT", name: "Marketing", description: "Brand and digital marketing" },
  { code: "FIN", name: "Finance & Accounts", description: "Financial reporting and accounting" },
  { code: "HR", name: "Human Resources", description: "Talent and employee relations" },
  { code: "SCM", name: "Supply Chain", description: "Procurement and logistics" },
  { code: "PROD", name: "Production", description: "Manufacturing and packaging" },
  { code: "QA", name: "Quality Assurance", description: "Quality control and compliance" },
  { code: "RND", name: "Research & Development", description: "Product formulation research" },
  { code: "SALES", name: "Sales", description: "National sales and distribution" },
];

const ROLES = [
  { code: "SUPER_ADMIN", name: "Super Admin", description: "Full system control", delegationLevel: 100 },
  { code: "ADMIN", name: "Admin", description: "Platform administration", delegationLevel: 80 },
  { code: "DEPT_MANAGER", name: "Department Manager", description: "Departmental authority", delegationLevel: 50 },
  { code: "EMPLOYEE", name: "Employee", description: "Standard staff with AI chat", delegationLevel: 10 },
  { code: "CONTRACTOR", name: "Contractor", description: "Third-party restricted access", delegationLevel: 5 },
  { code: "GUEST", name: "Guest", description: "Read-only sandbox access", delegationLevel: 0 },
];

const PERMISSIONS = [
  { module: "dashboard", resource: "view", action: "read", permissionKey: "admin.dashboard.view", description: "Access Admin Dashboard" },
  { module: "users", resource: "employee", action: "create", permissionKey: "users.employee.create", description: "Create employees" },
  { module: "users", resource: "employee", action: "read", permissionKey: "users.employee.read", description: "View employees" },
  { module: "users", resource: "employee", action: "update", permissionKey: "users.employee.update", description: "Update employees" },
  { module: "users", resource: "employee", action: "delete", permissionKey: "users.employee.delete", description: "Delete employees" },
  { module: "registration", resource: "approval", action: "approve", permissionKey: "registration.approve", description: "Approve registrations" },
  { module: "registration", resource: "approval", action: "reject", permissionKey: "registration.reject", description: "Reject registrations" },
  { module: "drbac", resource: "role", action: "manage", permissionKey: "drbac.role.manage", description: "Manage roles" },
  { module: "drbac", resource: "permission", action: "assign", permissionKey: "drbac.permission.assign", description: "Assign permissions" },
  { module: "delegation", resource: "role", action: "delegate", permissionKey: "delegation.role.delegate", description: "Delegate roles" },
  { module: "delegation", resource: "role", action: "revoke", permissionKey: "delegation.role.revoke", description: "Revoke delegations" },
  { module: "analytics", resource: "usage", action: "read", permissionKey: "analytics.view", description: "View analytics" },
  { module: "costs", resource: "budget", action: "read", permissionKey: "costs.view", description: "View costs" },
  { module: "policies", resource: "ai_policy", action: "create", permissionKey: "policies.create", description: "Create policies" },
  { module: "policies", resource: "ai_policy", action: "read", permissionKey: "policies.read", description: "View policies" },
  { module: "policies", resource: "ai_policy", action: "update", permissionKey: "policies.update", description: "Update policies" },
  { module: "audit", resource: "log", action: "read", permissionKey: "audit.view", description: "View audit logs" },
  { module: "settings", resource: "system", action: "update", permissionKey: "settings.update", description: "Update settings" },
  { module: "chat", resource: "session", action: "create", permissionKey: "chat.session.create", description: "Create chat sessions" },
  { module: "chat", resource: "session", action: "read", permissionKey: "chat.session.read", description: "Read chat history" },
  { module: "departments", resource: "department", action: "create", permissionKey: "departments.create", description: "Create departments" },
  { module: "departments", resource: "department", action: "read", permissionKey: "departments.view", description: "View departments" },
  { module: "departments", resource: "department", action: "update", permissionKey: "departments.update", description: "Update departments" },
  { module: "departments", resource: "department", action: "delete", permissionKey: "departments.delete", description: "Delete departments" },
  { module: "teams", resource: "team", action: "create", permissionKey: "teams.create", description: "Create teams" },
  { module: "teams", resource: "team", action: "read", permissionKey: "teams.view", description: "View teams" },
  { module: "teams", resource: "team", action: "update", permissionKey: "teams.update", description: "Update teams" },
  { module: "teams", resource: "team", action: "delete", permissionKey: "teams.delete", description: "Delete teams" },
  { module: "agents", resource: "agent", action: "manage", permissionKey: "agents.manage", description: "Manage AI agents" },
  { module: "workflows", resource: "workflow", action: "manage", permissionKey: "workflows.manage", description: "Manage workflows" },
  { module: "models", resource: "model", action: "manage", permissionKey: "models.manage", description: "Manage AI models" },
  { module: "chat", resource: "image", action: "generate", permissionKey: "chat.image.generate", description: "Generate images" },
  { module: "chat", resource: "video", action: "edit", permissionKey: "chat.video.edit", description: "Edit videos" },
  { module: "chat", resource: "document", action: "upload", permissionKey: "chat.upload.document", description: "Upload documents" },
];

const UI_MODULES = [
  { moduleName: "Overview", route: "/admin", icon: "LayoutDashboard", orderIndex: 1 },
  { moduleName: "User Management", route: "/admin/users", icon: "Users", orderIndex: 2 },
  { moduleName: "Departments", route: "/admin/departments", icon: "Building2", orderIndex: 3 },
  { moduleName: "Roles & Permissions", route: "/admin/roles", icon: "Key", orderIndex: 4 },
  { moduleName: "Analytics", route: "/admin/analytics", icon: "BarChart3", orderIndex: 5 },
  { moduleName: "Cost Control", route: "/admin/costs", icon: "DollarSign", orderIndex: 6 },
  { moduleName: "AI Policies", route: "/admin/policies", icon: "Shield", orderIndex: 7 },
  { moduleName: "Audit Trail", route: "/admin/audit", icon: "ScrollText", orderIndex: 8 },
];

// One employee per role — 6 total, no mock data
const EMPLOYEES = [
  { employeeId: "HAM-001", name: "Super Admin", email: "superadmin@hamdard.com.pk", deptCode: "EXEC", designation: "System Administrator", roleCode: "SUPER_ADMIN" as const, password: "admin123" },
  { employeeId: "HAM-002", name: "Admin User", email: "admin@hamdard.com.pk", deptCode: "IT", designation: "IT Administrator", roleCode: "ADMIN" as const, password: "admin123" },
  { employeeId: "HAM-003", name: "Dept Manager", email: "manager@hamdard.com.pk", deptCode: "MKT", designation: "Marketing Manager", roleCode: "DEPT_MANAGER" as const, password: "manager123" },
  { employeeId: "HAM-004", name: "Employee User", email: "employee@hamdard.com.pk", deptCode: "IT", designation: "Software Engineer", roleCode: "EMPLOYEE" as const, password: "employee123" },
  { employeeId: "HAM-005", name: "Contractor User", email: "contractor@hamdard.com.pk", deptCode: "IT", designation: "External Consultant", roleCode: "CONTRACTOR" as const, password: "contractor123" },
  { employeeId: "HAM-006", name: "Guest User", email: "guest@hamdard.com.pk", deptCode: "IT", designation: "Guest Viewer", roleCode: "GUEST" as const, password: "guest123" },
];

// Role-permission mappings
const ROLE_PERMS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.permissionKey),
  ADMIN: [
    "admin.dashboard.view", "users.employee.create", "users.employee.read", "users.employee.update",
    "registration.approve", "registration.reject", "analytics.view", "costs.view",
    "policies.create", "policies.read", "policies.update", "audit.view",
    "delegation.role.delegate", "delegation.role.revoke", "chat.session.create", "chat.session.read",
    "departments.create", "departments.view", "departments.update", "departments.delete",
    "teams.create", "teams.view", "teams.update", "teams.delete",
    "drbac.role.manage", "drbac.permission.assign", "settings.update",
    "agents.manage", "workflows.manage", "models.manage",
  ],
  DEPT_MANAGER: [
    "admin.dashboard.view", "users.employee.read", "analytics.view", "costs.view",
    "chat.session.create", "chat.session.read", "departments.view", "teams.view",
  ],
  EMPLOYEE: [
    "chat.session.create", "chat.session.read", "users.employee.read",
    "chat.image.generate", "chat.video.edit", "chat.upload.document",
  ],
  CONTRACTOR: ["chat.session.create", "chat.session.read", "users.employee.read"],
  GUEST: ["chat.session.read", "users.employee.read"],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding Hamdard AI Platform...\n");

  // 1. Departments
  console.log("Departments...");
  const deptMap = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: d,
    });
    deptMap.set(d.code, dept.id);
  }

  // 2. Roles
  console.log("Roles...");
  const roleMap = new Map<string, string>();
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description, delegationLevel: r.delegationLevel },
      create: r,
    });
    roleMap.set(r.code, role.id);
  }

  // 3. Permissions
  console.log("Permissions...");
  const permMap = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { permissionKey: p.permissionKey },
      update: { description: p.description },
      create: p,
    });
    permMap.set(p.permissionKey, perm.id);
  }

  // 4. Role-Permission mappings
  console.log("Role-Permission mappings...");
  for (const [roleCode, permKeys] of Object.entries(ROLE_PERMS)) {
    const roleId = roleMap.get(roleCode)!;
    for (const key of permKeys) {
      const permId = permMap.get(key);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permId } },
          update: {},
          create: { roleId, permissionId: permId },
        });
      }
    }
  }

  // 5. UI Modules
  console.log("UI Modules...");
  const superAdminId = roleMap.get("SUPER_ADMIN")!;
  const adminId = roleMap.get("ADMIN")!;
  for (const m of UI_MODULES) {
    const uiMod = await prisma.uiModule.upsert({
      where: { route: m.route },
      update: { moduleName: m.moduleName, icon: m.icon, orderIndex: m.orderIndex },
      create: m,
    });
    for (const rid of [superAdminId, adminId]) {
      await prisma.roleModule.upsert({
        where: { roleId_moduleId: { roleId: rid, moduleId: uiMod.id } },
        update: {},
        create: { roleId: rid, moduleId: uiMod.id },
      });
    }
  }

  // 6. System Settings & Feature Flags
  console.log("System Settings...");
  const settings = [
    { category: "AUTH", key: "auth.registration_approval_required", value: "true" },
    { category: "SECURITY", key: "security.jwt_ttl_seconds", value: "28800" },
    { category: "AI", key: "ai.monthly_quota_pkr", value: "15000" },
    { category: "COSTS", key: "costs.pkr_per_usd", value: "280" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  await prisma.featureFlag.upsert({
    where: { featureName: "drbac_delegation_engine" },
    update: {},
    create: { featureName: "drbac_delegation_engine", enabled: true },
  });
  await prisma.featureFlag.upsert({
    where: { featureName: "admin_approval_workflow" },
    update: {},
    create: { featureName: "admin_approval_workflow", enabled: true },
  });

  // 7. Employees (1 per role)
  console.log("Employees...");
  const hashedPwds = new Map<string, string>();
  for (const e of EMPLOYEES) {
    hashedPwds.set(e.employeeId, await hash(e.password));
  }

  const createdEmployees = [];
  for (const e of EMPLOYEES) {
    const deptId = deptMap.get(e.deptCode);
    const roleId = roleMap.get(e.roleCode);
    const emp = await prisma.employee.upsert({
      where: { employeeId: e.employeeId },
      update: { departmentId: deptId, role: e.roleCode },
      create: {
        employeeId: e.employeeId,
        name: e.name,
        email: e.email,
        password: hashedPwds.get(e.employeeId)!,
        department: DEPARTMENTS.find((d) => d.code === e.deptCode)?.name || "General",
        departmentId: deptId,
        designation: e.designation,
        role: e.roleCode,
        userType: "EMPLOYEE",
        registrationStatus: "APPROVED",
      },
    });
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: emp.id, roleId } },
        update: {},
        create: { userId: emp.id, roleId },
      });
    }
    createdEmployees.push(emp);
  }

  // 8. Delegation Policy
  console.log("Delegation Policies...");
  await prisma.delegationPolicy.upsert({
    where: { id: "del-policy-admin" },
    update: {},
    create: {
      id: "del-policy-admin",
      roleId: adminId,
      maxAssignableRoleId: roleMap.get("EMPLOYEE")!,
      scope: "DEPARTMENT",
      canDelegate: true,
      maxDepth: 1,
    },
  });

  // 9. AI Policy
  console.log("AI Policies...");
  const superAdminEmp = createdEmployees.find((e) => e.employeeId === "HAM-001")!;
  await prisma.aiPolicy.upsert({
    where: { id: "policy-rate-limit-default" },
    update: {},
    create: {
      id: "policy-rate-limit-default",
      name: "Standard Rate Limit",
      description: "100 requests/hour, 5000 tokens/request.",
      policyType: "RATE_LIMIT",
      configJson: JSON.stringify({ maxRequestsPerHour: 100, maxTokensPerRequest: 5000, cooldownMinutes: 5 }),
      isActive: true,
      createdById: superAdminEmp.id,
    },
  });

  // 10. Audit Log (system init)
  console.log("Audit Log...");
  await prisma.auditLog.create({
    data: {
      actorId: superAdminEmp.id,
      action: "SYSTEM_INITIALIZED",
      resource: "SystemSetting",
      details: JSON.stringify({ version: "1.0.0", mode: "Enterprise dRBAC" }),
      ipAddress: "127.0.0.1",
    },
  });

  console.log("\nSeed completed successfully!");
  console.log(`  ${DEPARTMENTS.length} departments`);
  console.log(`  ${ROLES.length} roles`);
  console.log(`  ${PERMISSIONS.length} permissions`);
  console.log(`  ${EMPLOYEES.length} employees (1 per role)`);
  console.log(`  ${UI_MODULES.length} UI modules`);
  console.log(`  1 AI policy, 1 delegation policy`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
