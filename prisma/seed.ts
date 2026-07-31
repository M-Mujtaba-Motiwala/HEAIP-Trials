// =============================================================================
// Hamdard AI Platform — Enterprise Database Seed Script
// -----------------------------------------------------------------------------
// Populates PostgreSQL / SQLite database with comprehensive enterprise data:
//   • 10 Departments & Teams
//   • 6 Core Roles (Super Admin, Admin, Dept Manager, Employee, Contractor, Guest)
//   • Permission Catalogue (~30 granular permission keys)
//   • Role-Permission & Role-Module mappings
//   • UI Modules & Navigation Config
//   • System Settings & Feature Flags
//   • 50 Employees mapped to Department, Team, Role, UserType, RegistrationStatus
//   • Delegation Policies
//   • 2 AI Policies, Chat Sessions, Messages, 30 days of Usage Logs & Audit Logs
//
// Run:  npx tsx prisma/seed.ts
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import bcrypt from "bcryptjs";

function getPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(8, 18), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

// ---------------------------------------------------------------------------
// Organization Definitions
// ---------------------------------------------------------------------------

const DEPARTMENTS_DATA = [
  { code: "EXEC", name: "Executive Office", description: "Executive leadership and strategic decision making" },
  { code: "IT", name: "IT Department", description: "Information Technology infrastructure, systems, and security" },
  { code: "MKT", name: "Marketing", description: "Brand management, digital marketing, and public relations" },
  { code: "FIN", name: "Finance & Accounts", description: "Financial reporting, budgeting, and accounting" },
  { code: "HR", name: "Human Resources", description: "Talent acquisition, employee relations, and HR operations" },
  { code: "SCM", name: "Supply Chain", description: "Procurement, logistics, and inventory management" },
  { code: "PROD", name: "Production", description: "Manufacturing, plant management, and packaging" },
  { code: "QA", name: "Quality Assurance", description: "Quality control, standards compliance, and testing" },
  { code: "RND", name: "Research & Development", description: "Product formulation and herbal medicine research" },
  { code: "SALES", name: "Sales", description: "National sales, distribution network, and key accounts" },
];

// ---------------------------------------------------------------------------
// Role Definitions
// ---------------------------------------------------------------------------

const ROLES_DATA = [
  { code: "SUPER_ADMIN", name: "Super Admin", description: "Full system control and unrestricted platform authority", delegationLevel: 100 },
  { code: "ADMIN", name: "Admin", description: "Departmental and platform administration capability", delegationLevel: 80 },
  { code: "DEPT_MANAGER", name: "Department Manager", description: "Managerial authority over department staff and resources", delegationLevel: 50 },
  { code: "EMPLOYEE", name: "Employee", description: "Standard enterprise staff member with AI chat access", delegationLevel: 10 },
  { code: "CONTRACTOR", name: "Contractor", description: "Third-party contractor with restricted access", delegationLevel: 5 },
  { code: "GUEST", name: "Guest", description: "External guest with read-only sandbox access", delegationLevel: 0 },
];

// ---------------------------------------------------------------------------
// Permission Catalog Definitions
// ---------------------------------------------------------------------------

const PERMISSIONS_DATA = [
  // Dashboard & Navigation
  { module: "dashboard", resource: "view", action: "read", permissionKey: "admin.dashboard.view", description: "Access Admin Dashboard Overview" },
  
  // User & Employee Management
  { module: "users", resource: "employee", action: "create", permissionKey: "users.employee.create", description: "Create new employee records" },
  { module: "users", resource: "employee", action: "read", permissionKey: "users.employee.read", description: "View employee directory" },
  { module: "users", resource: "employee", action: "update", permissionKey: "users.employee.update", description: "Update employee details" },
  { module: "users", resource: "employee", action: "delete", permissionKey: "users.employee.delete", description: "Deactivate or delete employees" },
  
  // Registration Workflow
  { module: "registration", resource: "approval", action: "approve", permissionKey: "registration.approve", description: "Approve pending employee registrations" },
  { module: "registration", resource: "approval", action: "reject", permissionKey: "registration.reject", description: "Reject pending employee registrations" },

  // Role & dRBAC Management
  { module: "drbac", resource: "role", action: "manage", permissionKey: "drbac.role.manage", description: "Create and modify dynamic roles" },
  { module: "drbac", resource: "permission", action: "assign", permissionKey: "drbac.permission.assign", description: "Assign permissions to roles" },

  // Delegation
  { module: "delegation", resource: "role", action: "delegate", permissionKey: "delegation.role.delegate", description: "Delegate temporary roles to employees" },
  { module: "delegation", resource: "role", action: "revoke", permissionKey: "delegation.role.revoke", description: "Revoke active delegated assignments" },

  // Analytics & Cost Control
  { module: "analytics", resource: "usage", action: "read", permissionKey: "analytics.view", description: "View AI usage analytics" },
  { module: "costs", resource: "budget", action: "read", permissionKey: "costs.view", description: "View cost and budget metrics" },

  // Governance & Policies
  { module: "policies", resource: "ai_policy", action: "create", permissionKey: "policies.create", description: "Create AI governance policies" },
  { module: "policies", resource: "ai_policy", action: "read", permissionKey: "policies.read", description: "View AI governance policies" },
  { module: "policies", resource: "ai_policy", action: "update", permissionKey: "policies.update", description: "Update AI governance policies" },

  // Audit Logs
  { module: "audit", resource: "log", action: "read", permissionKey: "audit.view", description: "View system audit trail" },

  // System Settings & Configuration Engine
  { module: "settings", resource: "system", action: "update", permissionKey: "settings.update", description: "Modify system settings and feature flags" },

  // AI Chat
  { module: "chat", resource: "session", action: "create", permissionKey: "chat.session.create", description: "Start AI chat sessions" },
  { module: "chat", resource: "session", action: "read", permissionKey: "chat.session.read", description: "Read personal chat history" },

  // Department & Team Management
  { module: "departments", resource: "department", action: "create", permissionKey: "departments.create", description: "Create new departments" },
  { module: "departments", resource: "department", action: "read", permissionKey: "departments.view", description: "View department directory" },
  { module: "departments", resource: "department", action: "update", permissionKey: "departments.update", description: "Update department details" },
  { module: "departments", resource: "department", action: "delete", permissionKey: "departments.delete", description: "Deactivate departments" },
  { module: "teams", resource: "team", action: "create", permissionKey: "teams.create", description: "Create teams within departments" },
  { module: "teams", resource: "team", action: "read", permissionKey: "teams.view", description: "View team listings" },
  { module: "teams", resource: "team", action: "update", permissionKey: "teams.update", description: "Update team details" },
  { module: "teams", resource: "team", action: "delete", permissionKey: "teams.delete", description: "Deactivate or remove teams" },
];

// ---------------------------------------------------------------------------
// UI Module Definitions
// ---------------------------------------------------------------------------

const UI_MODULES_DATA = [
  { moduleName: "Overview", route: "/admin", icon: "LayoutDashboard", orderIndex: 1 },
  { moduleName: "User Management", route: "/admin/users", icon: "Users", orderIndex: 2 },
  { moduleName: "Departments", route: "/admin/departments", icon: "Building2", orderIndex: 3 },
  { moduleName: "Roles & Permissions", route: "/admin/roles", icon: "Key", orderIndex: 4 },
  { moduleName: "Analytics", route: "/admin/analytics", icon: "BarChart3", orderIndex: 5 },
  { moduleName: "Cost Control", route: "/admin/costs", icon: "DollarSign", orderIndex: 6 },
  { moduleName: "AI Policies", route: "/admin/policies", icon: "Shield", orderIndex: 7 },
  { moduleName: "Audit Trail", route: "/admin/audit", icon: "ScrollText", orderIndex: 8 },
];

// ---------------------------------------------------------------------------
// Employee Definitions (50 Realistic Accounts)
// ---------------------------------------------------------------------------

interface EmployeeDef {
  employeeId: string;
  name: string;
  email: string;
  deptCode: string;
  designation: string;
  roleCode: "SUPER_ADMIN" | "ADMIN" | "DEPT_MANAGER" | "EMPLOYEE";
  userType?: "EMPLOYEE" | "THIRD_PARTY" | "GUEST";
  regStatus?: "APPROVED" | "PENDING" | "REJECTED";
}

const EMPLOYEES_DATA: EmployeeDef[] = [
  // Super Admin
  { employeeId: "HAM-001", name: "Shaheryar Hamdard", email: "shaheryar.hamdard@hamdard.com.pk", deptCode: "EXEC", designation: "Chief Executive Officer", roleCode: "SUPER_ADMIN" },

  // IT Department
  { employeeId: "HAM-002", name: "Ahmed Raza Khan", email: "ahmed.raza@hamdard.com.pk", deptCode: "IT", designation: "Head of IT", roleCode: "ADMIN" },
  { employeeId: "HAM-003", name: "Fatima Zahra Syed", email: "fatima.zahra@hamdard.com.pk", deptCode: "IT", designation: "IT Manager", roleCode: "ADMIN" },
  { employeeId: "HAM-004", name: "Usman Ali Qureshi", email: "usman.ali@hamdard.com.pk", deptCode: "IT", designation: "Senior Software Engineer", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-005", name: "Hira Batool", email: "hira.batool@hamdard.com.pk", deptCode: "IT", designation: "Software Engineer", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-006", name: "Bilal Ahmed", email: "bilal.ahmed@hamdard.com.pk", deptCode: "IT", designation: "DevOps Engineer", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-007", name: "Ayesha Siddiqui", email: "ayesha.siddiqui@hamdard.com.pk", deptCode: "IT", designation: "Database Administrator", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-008", name: "Hamza Tariq", email: "hamza.tariq@hamdard.com.pk", deptCode: "IT", designation: "Network Administrator", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-009", name: "Zainab Malik", email: "zainab.malik@hamdard.com.pk", deptCode: "IT", designation: "IT Support Specialist", roleCode: "EMPLOYEE" },

  // Marketing
  { employeeId: "HAM-010", name: "Saad Mehmood", email: "saad.mehmood@hamdard.com.pk", deptCode: "MKT", designation: "Director Marketing", roleCode: "DEPT_MANAGER" },
  { employeeId: "HAM-011", name: "Nadia Hussain", email: "nadia.hussain@hamdard.com.pk", deptCode: "MKT", designation: "Brand Manager", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-012", name: "Kamran Akbar", email: "kamran.akbar@hamdard.com.pk", deptCode: "MKT", designation: "Digital Marketing Lead", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-013", name: "Sana Javed", email: "sana.javed@hamdard.com.pk", deptCode: "MKT", designation: "Content Strategist", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-014", name: "Faisal Rehman", email: "faisal.rehman@hamdard.com.pk", deptCode: "MKT", designation: "Graphic Designer", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-015", name: "Rabia Aslam", email: "rabia.aslam@hamdard.com.pk", deptCode: "MKT", designation: "Social Media Executive", roleCode: "EMPLOYEE" },

  // Finance & Accounts
  { employeeId: "HAM-016", name: "Tariq Mahmood", email: "tariq.mahmood@hamdard.com.pk", deptCode: "FIN", designation: "Chief Financial Officer", roleCode: "DEPT_MANAGER" },
  { employeeId: "HAM-017", name: "Amina Yousuf", email: "amina.yousuf@hamdard.com.pk", deptCode: "FIN", designation: "Finance Manager", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-018", name: "Hassan Mirza", email: "hassan.mirza@hamdard.com.pk", deptCode: "FIN", designation: "Senior Accountant", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-019", name: "Saba Noor", email: "saba.noor@hamdard.com.pk", deptCode: "FIN", designation: "Accounts Payable Officer", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-020", name: "Waqar Ahmed", email: "waqar.ahmed@hamdard.com.pk", deptCode: "FIN", designation: "Tax Analyst", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-021", name: "Mehwish Iqbal", email: "mehwish.iqbal@hamdard.com.pk", deptCode: "FIN", designation: "Budget Analyst", roleCode: "EMPLOYEE" },

  // Human Resources
  { employeeId: "HAM-022", name: "Asma Khalid", email: "asma.khalid@hamdard.com.pk", deptCode: "HR", designation: "Head of HR", roleCode: "ADMIN" },
  { employeeId: "HAM-023", name: "Naveed Akhtar", email: "naveed.akhtar@hamdard.com.pk", deptCode: "HR", designation: "HR Business Partner", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-024", name: "Saima Riaz", email: "saima.riaz@hamdard.com.pk", deptCode: "HR", designation: "Recruitment Specialist", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-025", name: "Kashif Hussain", email: "kashif.hussain@hamdard.com.pk", deptCode: "HR", designation: "Training Coordinator", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-026", name: "Rubina Shah", email: "rubina.shah@hamdard.com.pk", deptCode: "HR", designation: "Payroll Officer", roleCode: "EMPLOYEE" },

  // Pending Registration Examples
  { employeeId: "HAM-051", name: "Tariq Jamil", email: "tariq.jamil@hamdard.com.pk", deptCode: "IT", designation: "Junior Developer", roleCode: "EMPLOYEE", regStatus: "PENDING" },
  { employeeId: "HAM-052", name: "Mariam Khan", email: "mariam.khan@hamdard.com.pk", deptCode: "MKT", designation: "PR Specialist", roleCode: "EMPLOYEE", regStatus: "PENDING" },

  // Additional Departments
  { employeeId: "HAM-027", name: "Imran Haider", email: "imran.haider@hamdard.com.pk", deptCode: "SCM", designation: "Supply Chain Director", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-028", name: "Tahira Begum", email: "tahira.begum@hamdard.com.pk", deptCode: "SCM", designation: "Procurement Manager", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-029", name: "Farhan Saeed", email: "farhan.saeed@hamdard.com.pk", deptCode: "SCM", designation: "Logistics Coordinator", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-030", name: "Bushra Nadeem", email: "bushra.nadeem@hamdard.com.pk", deptCode: "SCM", designation: "Warehouse Supervisor", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-031", name: "Rizwan Qadri", email: "rizwan.qadri@hamdard.com.pk", deptCode: "SCM", designation: "Inventory Analyst", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-032", name: "Arif Hussain", email: "arif.hussain@hamdard.com.pk", deptCode: "PROD", designation: "Production Director", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-033", name: "Noman Sheikh", email: "noman.sheikh@hamdard.com.pk", deptCode: "PROD", designation: "Plant Manager", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-034", name: "Shabana Parveen", email: "shabana.parveen@hamdard.com.pk", deptCode: "PROD", designation: "Production Supervisor", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-035", name: "Zahid Mehmood", email: "zahid.mehmood@hamdard.com.pk", deptCode: "PROD", designation: "Shift Incharge", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-036", name: "Kiran Fatima", email: "kiran.fatima@hamdard.com.pk", deptCode: "PROD", designation: "Machine Operator Lead", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-037", name: "Amir Shahzad", email: "amir.shahzad@hamdard.com.pk", deptCode: "PROD", designation: "Packaging Supervisor", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-038", name: "Dr. Nazia Parveen", email: "nazia.parveen@hamdard.com.pk", deptCode: "QA", designation: "Head of QA", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-039", name: "Umer Farooq", email: "umer.farooq@hamdard.com.pk", deptCode: "QA", designation: "QA Analyst", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-040", name: "Samina Bibi", email: "samina.bibi@hamdard.com.pk", deptCode: "QA", designation: "Quality Inspector", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-041", name: "Junaid Akram", email: "junaid.akram@hamdard.com.pk", deptCode: "QA", designation: "Compliance Officer", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-042", name: "Dr. Asad Ullah", email: "asad.ullah@hamdard.com.pk", deptCode: "RND", designation: "R&D Director", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-043", name: "Dr. Rahat Bano", email: "rahat.bano@hamdard.com.pk", deptCode: "RND", designation: "Senior Research Scientist", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-044", name: "Shoaib Anwar", email: "shoaib.anwar@hamdard.com.pk", deptCode: "RND", designation: "Research Analyst", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-045", name: "Madiha Rafiq", email: "madiha.rafiq@hamdard.com.pk", deptCode: "RND", designation: "Formulation Chemist", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-046", name: "Danish Rauf", email: "danish.rauf@hamdard.com.pk", deptCode: "RND", designation: "Lab Technician", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-047", name: "Shahbaz Sharif", email: "shahbaz.sharif@hamdard.com.pk", deptCode: "SALES", designation: "National Sales Manager", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-048", name: "Aliya Butt", email: "aliya.butt@hamdard.com.pk", deptCode: "SALES", designation: "Regional Sales Lead — South", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-049", name: "Mohsin Raza", email: "mohsin.raza@hamdard.com.pk", deptCode: "SALES", designation: "Key Accounts Manager", roleCode: "EMPLOYEE" },
  { employeeId: "HAM-050", name: "Farah Deeba", email: "farah.deeba@hamdard.com.pk", deptCode: "SALES", designation: "Sales Executive", roleCode: "EMPLOYEE" },
];

const AI_PROVIDERS = [
  { provider: "gemini", models: ["gemini-2.0-flash", "gemini-2.5-pro"] },
  { provider: "openai", models: ["gpt-4o", "gpt-4o-mini"] },
  { provider: "anthropic", models: ["claude-sonnet-4-20250514"] },
];

const COST_MAP: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
};

// ---------------------------------------------------------------------------
// Main Seed Function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("🌱 Seeding Hamdard AI Platform Enterprise Database …\n");

  const hashedPassword = await hashPassword("hamdard123");

  // 1. Departments & Teams
  console.log("🏢 Creating Departments & Teams …");
  const deptMap = new Map<string, string>(); // code -> id

  for (const deptData of DEPARTMENTS_DATA) {
    const dept = await prisma.department.upsert({
      where: { code: deptData.code },
      update: { name: deptData.name, description: deptData.description },
      create: deptData,
    });
    deptMap.set(deptData.code, dept.id);

    // Create default team under department
    await prisma.team.upsert({
      where: { id: `team-${deptData.code.toLowerCase()}` },
      update: {},
      create: {
        id: `team-${deptData.code.toLowerCase()}`,
        name: `${deptData.name} Core Team`,
        departmentId: dept.id,
      },
    });
  }

  // 2. Roles
  console.log("🔑 Creating dRBAC Roles …");
  const roleMap = new Map<string, string>(); // code -> id

  for (const roleData of ROLES_DATA) {
    const role = await prisma.role.upsert({
      where: { code: roleData.code },
      update: { name: roleData.name, description: roleData.description, delegationLevel: roleData.delegationLevel },
      create: roleData,
    });
    roleMap.set(roleData.code, role.id);
  }

  // 3. Permissions Catalog
  console.log("📜 Cataloging System Permissions …");
  const permMap = new Map<string, string>(); // key -> id

  for (const permData of PERMISSIONS_DATA) {
    const perm = await prisma.permission.upsert({
      where: { permissionKey: permData.permissionKey },
      update: { description: permData.description },
      create: permData,
    });
    permMap.set(permData.permissionKey, perm.id);
  }

  // 4. RolePermission Mappings
  console.log("🔗 Mapping Permissions to Roles …");
  const allPermIds = Array.from(permMap.values());

  // Super Admin gets all permissions
  const superAdminRoleId = roleMap.get("SUPER_ADMIN")!;
  for (const permId of allPermIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRoleId, permissionId: permId } },
      update: {},
      create: { roleId: superAdminRoleId, permissionId: permId },
    });
  }

  // Admin gets management & analytics permissions
  const adminRoleId = roleMap.get("ADMIN")!;
  const adminKeys = [
    "admin.dashboard.view", "users.employee.create", "users.employee.read", "users.employee.update",
    "registration.approve", "registration.reject", "analytics.view", "costs.view",
    "policies.create", "policies.read", "policies.update", "audit.view",
    "delegation.role.delegate", "delegation.role.revoke", "chat.session.create", "chat.session.read",
    "departments.create", "departments.view", "departments.update", "departments.delete",
    "teams.create", "teams.view", "teams.update", "teams.delete",
    "drbac.role.manage", "drbac.permission.assign"
  ];
  for (const key of adminKeys) {
    const permId = permMap.get(key);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRoleId, permissionId: permId } },
        update: {},
        create: { roleId: adminRoleId, permissionId: permId },
      });
    }
  }

  // Employee gets chat & basic read permissions
  const empRoleId = roleMap.get("EMPLOYEE")!;
  const empKeys = ["chat.session.create", "chat.session.read", "users.employee.read"];
  for (const key of empKeys) {
    const permId = permMap.get(key);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: empRoleId, permissionId: permId } },
        update: {},
        create: { roleId: empRoleId, permissionId: permId },
      });
    }
  }

  // 5. UI Modules & Role Modules
  console.log("🎨 Configuring UI Modules & Role Navigation …");
  for (const modData of UI_MODULES_DATA) {
    const uiMod = await prisma.uiModule.upsert({
      where: { route: modData.route },
      update: { moduleName: modData.moduleName, icon: modData.icon, orderIndex: modData.orderIndex },
      create: modData,
    });

    // Map UI module to ADMIN and SUPER_ADMIN roles
    await prisma.roleModule.upsert({
      where: { roleId_moduleId: { roleId: superAdminRoleId, moduleId: uiMod.id } },
      update: {},
      create: { roleId: superAdminRoleId, moduleId: uiMod.id },
    });
    await prisma.roleModule.upsert({
      where: { roleId_moduleId: { roleId: adminRoleId, moduleId: uiMod.id } },
      update: {},
      create: { roleId: adminRoleId, moduleId: uiMod.id },
    });
  }

  // 6. System Settings & Feature Flags
  console.log("⚙️ Initializing System Settings & Feature Flags …");
  await prisma.systemSetting.upsert({
    where: { key: "auth.registration_approval_required" },
    update: {},
    create: { category: "AUTH", key: "auth.registration_approval_required", value: "true" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "security.jwt_ttl_seconds" },
    update: {},
    create: { category: "SECURITY", key: "security.jwt_ttl_seconds", value: "28800" },
  });
  await prisma.featureFlag.upsert({
    where: { featureName: "drbac_delegation_engine" },
    update: {},
    create: { featureName: "drbac_delegation_engine", enabled: true },
  });

  for (const model of [
    { provider: "gemini", modelId: "gemini-2.0-flash", displayName: "Gemini Flash", isDefault: true },
    { provider: "openai", modelId: "gpt-4o-mini", displayName: "GPT-4o Mini", isDefault: false },
    { provider: "anthropic", modelId: "claude-3-5-haiku-latest", displayName: "Claude Haiku", isDefault: false },
  ]) {
    await prisma.aiModel.upsert({ where: { provider_modelId: { provider: model.provider, modelId: model.modelId } }, update: { displayName: model.displayName, isDefault: model.isDefault }, create: model });
  }
  await prisma.featureFlag.upsert({
    where: { featureName: "admin_approval_workflow" },
    update: {},
    create: { featureName: "admin_approval_workflow", enabled: true },
  });

  // 7. Create Employees & UserRoles
  console.log("👥 Populating Employees & Assigning User Roles …");
  const createdEmployees = [];

  for (const empData of EMPLOYEES_DATA) {
    const deptId = deptMap.get(empData.deptCode);
    const roleId = roleMap.get(empData.roleCode);

    const emp = await prisma.employee.upsert({
      where: { employeeId: empData.employeeId },
      update: {
        departmentId: deptId,
        registrationStatus: empData.regStatus || "APPROVED",
        role: empData.roleCode,
      },
      create: {
        employeeId: empData.employeeId,
        name: empData.name,
        email: empData.email,
        password: hashedPassword,
        department: DEPARTMENTS_DATA.find((d) => d.code === empData.deptCode)?.name || "General",
        departmentId: deptId,
        designation: empData.designation,
        role: empData.roleCode,
        userType: empData.userType || "EMPLOYEE",
        registrationStatus: empData.regStatus || "APPROVED",
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

    await prisma.employeeMaster.upsert({
      where: { employeeId: empData.employeeId },
      update: {
        companyEmail: empData.email.toLowerCase(),
        name: empData.name,
        department: DEPARTMENTS_DATA.find((d) => d.code === empData.deptCode)?.name || "General",
        designation: empData.designation,
        isActive: true,
      },
      create: {
        employeeId: empData.employeeId,
        companyEmail: empData.email.toLowerCase(),
        name: empData.name,
        department: DEPARTMENTS_DATA.find((d) => d.code === empData.deptCode)?.name || "General",
        designation: empData.designation,
      },
    });
  }

  const ceo = createdEmployees.find((e) => e.employeeId === "HAM-001")!;
  const itAdmin = createdEmployees.find((e) => e.employeeId === "HAM-002")!;

  // 8. Delegation Policies
  console.log("🛡️ Configuring Delegation Policies …");
  await prisma.delegationPolicy.upsert({
    where: { id: "del-policy-admin" },
    update: {},
    create: {
      id: "del-policy-admin",
      roleId: adminRoleId,
      maxAssignableRoleId: empRoleId,
      scope: "DEPARTMENT",
      canDelegate: true,
      maxDepth: 1,
    },
  });

  // 9. AI Governance Policies
  console.log("📜 Creating AI Policies …");
  await prisma.aiPolicy.upsert({
    where: { id: "policy-rate-limit-default" },
    update: {},
    create: {
      id: "policy-rate-limit-default",
      name: "Standard Rate Limit",
      description: "Default rate limit policy for all Hamdard employees — 100 requests per hour, 5 000 tokens per request.",
      policyType: "RATE_LIMIT",
      configJson: JSON.stringify({ maxRequestsPerHour: 100, maxTokensPerRequest: 5000, cooldownMinutes: 5 }),
      isActive: true,
      createdById: ceo.id,
    },
  });

  // 10. Sample Usage Logs & Audit Logs
  console.log("📊 Generating 30 days of Usage Logs & Audit Logs …");
  const usageLogData = [];
  for (let day = 0; day < 30; day++) {
    const entriesPerDay = randInt(6, 12);
    for (let i = 0; i < entriesPerDay; i++) {
      const emp = pick(createdEmployees);
      const providerDef = pick(AI_PROVIDERS);
      const model = pick(providerDef.models);
      const tokensIn = randInt(50, 2500);
      const tokensOut = randInt(100, 3500);
      const cost = (tokensIn / 1000) * (COST_MAP[model]?.input ?? 0.001) + (tokensOut / 1000) * (COST_MAP[model]?.output ?? 0.002);

      usageLogData.push({
        employeeId: emp.id,
        aiProvider: providerDef.provider,
        aiModel: model,
        tokensInput: tokensIn,
        tokensOutput: tokensOut,
        costUsd: parseFloat(cost.toFixed(6)),
        department: emp.department,
        createdAt: daysAgo(day),
      });
    }
  }
  await prisma.usageLog.createMany({ data: usageLogData });

  await prisma.auditLog.createMany({
    data: [
      { actorId: ceo.id, action: "SYSTEM_INITIALIZED", resource: "SystemSetting", details: JSON.stringify({ version: "1.0.0", mode: "Enterprise dRBAC" }), ipAddress: "192.168.1.10", createdAt: daysAgo(29) },
      { actorId: ceo.id, action: "POLICY_CREATED", resource: "AiPolicy", details: JSON.stringify({ policyName: "Standard Rate Limit" }), ipAddress: "192.168.1.10", createdAt: daysAgo(28) },
      { actorId: itAdmin.id, action: "ROLE_DELEGATED", resource: "DelegatedAssignment", details: JSON.stringify({ targetUser: "HAM-004", role: "EMPLOYEE" }), ipAddress: "192.168.1.22", createdAt: daysAgo(3) },
    ],
  });

  // ── AI Model Registry ──────────────────────────────────────────────────────
  const AI_MODELS = [
    { provider: "google",    modelId: "gemini-2.0-flash",          displayName: "Gemini 2.0 Flash",          enabled: true,  isDefault: true  },
    { provider: "google",    modelId: "gemini-2.0-flash-thinking",  displayName: "Gemini 2.0 Flash Thinking", enabled: true,  isDefault: false },
    { provider: "google",    modelId: "gemini-1.5-pro",             displayName: "Gemini 1.5 Pro",            enabled: true,  isDefault: false },
    { provider: "openai",    modelId: "gpt-4o-mini",                displayName: "GPT-4o Mini",               enabled: true,  isDefault: true  },
    { provider: "openai",    modelId: "gpt-4o",                     displayName: "GPT-4o",                    enabled: true,  isDefault: false },
    { provider: "anthropic", modelId: "claude-3-5-haiku-latest",    displayName: "Claude 3.5 Haiku",          enabled: true,  isDefault: true  },
    { provider: "anthropic", modelId: "claude-3-7-sonnet-latest",   displayName: "Claude 3.7 Sonnet",         enabled: false, isDefault: false },
  ];

  for (const model of AI_MODELS) {
    await prisma.aiModel.upsert({
      where: { provider_modelId: { provider: model.provider, modelId: model.modelId } },
      update: { displayName: model.displayName, enabled: model.enabled, isDefault: model.isDefault },
      create: { ...model, metadataJson: "{}" },
    });
  }

  console.log("\n✅ Enterprise Seed completed successfully!");
  console.log(`   • ${DEPARTMENTS_DATA.length} departments & teams`);
  console.log(`   • ${ROLES_DATA.length} dRBAC roles`);
  console.log(`   • ${PERMISSIONS_DATA.length} granular permissions`);
  console.log(`   • ${createdEmployees.length} employees populated`);
  console.log(`   • ${usageLogData.length} usage log entries`);
  console.log(`   • ${AI_MODELS.length} AI models registered`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
