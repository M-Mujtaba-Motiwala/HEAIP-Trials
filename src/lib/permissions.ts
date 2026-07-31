// =============================================================================
// Permission Evaluation Service — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Core engine for Dynamic Role-Based Access Control (dRBAC).
// Resolves effective permissions across User Roles, Role Hierarchy, and
// Active Delegated Assignments.
// =============================================================================

import { db } from "@/lib/db";

/**
 * Interface representing a resolved user permission profile.
 */
export interface UserPermissionProfile {
  userId: string;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: Set<string>;
  delegatedRoles: Array<{ id: string; code: string; name: string }>;
}

/**
 * Recursively fetch all parent role IDs for a list of role IDs to support role inheritance.
 */
async function resolveRoleHierarchy(roleIds: string[]): Promise<Set<string>> {
  const allRoleIds = new Set<string>(roleIds);
  let currentIds = [...roleIds];

  while (currentIds.length > 0) {
    const roles = await db.role.findMany({
      where: {
        id: { in: currentIds },
        isActive: true,
        parentRoleId: { not: null },
      },
      select: { parentRoleId: true },
    });

    const parentIds = roles
      .map((r) => r.parentRoleId)
      .filter((id): id is string => id !== null && !allRoleIds.has(id));

    if (parentIds.length === 0) break;

    parentIds.forEach((id) => allRoleIds.add(id));
    currentIds = parentIds;
  }

  return allRoleIds;
}

/**
 * Get all effective permissions for a user, including direct roles, inherited parent roles,
 * and active delegated assignments.
 */
export async function getUserPermissionProfile(userId: string): Promise<UserPermissionProfile> {
  // 1. Fetch direct user roles
  const userRoleRecords = await db.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  const directRoles = userRoleRecords
    .map((ur) => ur.role)
    .filter((r) => r && r.isActive);

  // 2. Fetch active delegated assignments
  const now = new Date();
  const delegatedRecords = await db.delegatedAssignment.findMany({
    where: {
      targetUserId: userId,
      isActive: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: { assignedRole: true },
  });

  const delegatedRoles = delegatedRecords
    .map((d) => d.assignedRole)
    .filter((r) => r && r.isActive);

  // 3. Combine direct + delegated role IDs and resolve hierarchy
  const initialRoleIds = [...directRoles.map((r) => r.id), ...delegatedRoles.map((r) => r.id)];
  const allEffectiveRoleIds = await resolveRoleHierarchy(initialRoleIds);

  // 4. Fetch all permissions for the effective role set
  const rolePermissions = await db.rolePermission.findMany({
    where: {
      roleId: { in: Array.from(allEffectiveRoleIds) },
    },
    include: {
      permission: true,
    },
  });

  const permissionKeys = new Set<string>();
  rolePermissions.forEach((rp) => {
    if (rp.permission?.permissionKey) {
      permissionKeys.add(rp.permission.permissionKey);
    }
  });

  return {
    userId,
    roles: directRoles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    permissions: permissionKeys,
    delegatedRoles: delegatedRoles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
  };
}

/**
 * Fetch permission keys set for a user.
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const profile = await getUserPermissionProfile(userId);
  return profile.permissions;
}

/**
 * Check if a user has a specific permission key.
 * Super Admin override: SUPER_ADMIN role bypasses permission checks or matches '*'.
 */
export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const profile = await getUserPermissionProfile(userId);

  // Super Admin bypass
  const isSuperAdmin = profile.roles.some((r) => r.code === "SUPER_ADMIN");
  if (isSuperAdmin) return true;

  return profile.permissions.has(permissionKey) || profile.permissions.has("*");
}

/**
 * Check if a user has ANY of the specified permission keys.
 */
export async function hasAnyPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  const profile = await getUserPermissionProfile(userId);

  const isSuperAdmin = profile.roles.some((r) => r.code === "SUPER_ADMIN");
  if (isSuperAdmin) return true;

  if (profile.permissions.has("*")) return true;

  return permissionKeys.some((key) => profile.permissions.has(key));
}

/**
 * Get active user roles for a given employee.
 */
export async function getUserRoles(userId: string): Promise<Array<{ id: string; code: string; name: string }>> {
  const profile = await getUserPermissionProfile(userId);
  return profile.roles;
}
