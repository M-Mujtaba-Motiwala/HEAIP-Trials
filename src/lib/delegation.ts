// =============================================================================
// Delegation Engine Service — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Manages role delegation between employees in compliance with Delegation Policies,
// max depth restrictions, delegation levels, and department/global scopes.
// =============================================================================

import { db } from "@/lib/db";
import { getUserPermissionProfile } from "@/lib/permissions";

export interface DelegationResult {
  success: boolean;
  message: string;
  assignmentId?: string;
}

/**
 * Verify if a delegator is allowed to delegate a target role to another employee.
 */
export async function canDelegate(
  delegatorId: string,
  targetRoleId: string,
  targetUserId: string
): Promise<{ allowed: boolean; reason: string }> {
  // 1. Fetch delegator's active roles
  const delegatorProfile = await getUserPermissionProfile(delegatorId);
  const delegatorRoleIds = delegatorProfile.roles.map((r) => r.id);

  if (delegatorRoleIds.length === 0) {
    return { allowed: false, reason: "Delegator has no active roles." };
  }

  // 2. Fetch target role details
  const targetRole = await db.role.findUnique({
    where: { id: targetRoleId },
  });

  if (!targetRole || !targetRole.isActive) {
    return { allowed: false, reason: "Target role does not exist or is inactive." };
  }

  // Super Admin can delegate any role
  const isSuperAdmin = delegatorProfile.roles.some((r) => r.code === "SUPER_ADMIN");
  if (isSuperAdmin) {
    return { allowed: true, reason: "Super Admin authorization." };
  }

  // 3. Find matching Delegation Policies for delegator's roles
  const policies = await db.delegationPolicy.findMany({
    where: {
      roleId: { in: delegatorRoleIds },
      canDelegate: true,
    },
    include: {
      maxAssignableRole: true,
    },
  });

  if (policies.length === 0) {
    return { allowed: false, reason: "No active delegation policy found for delegator's role." };
  }

  // 4. Check if target role delegation level is <= maxAssignableRole delegation level
  const validPolicy = policies.find(
    (p) => p.maxAssignableRole.delegationLevel >= targetRole.delegationLevel
  );

  if (!validPolicy) {
    return {
      allowed: false,
      reason: `Delegator policy level insufficient for role delegation level (${targetRole.delegationLevel}).`,
    };
  }

  // 5. Scope check (DEPARTMENT vs GLOBAL)
  if (validPolicy.scope === "DEPARTMENT") {
    const delegatorEmp = await db.employee.findUnique({ where: { id: delegatorId }, select: { department: true } });
    const targetEmp = await db.employee.findUnique({ where: { id: targetUserId }, select: { department: true } });

    if (delegatorEmp?.department !== targetEmp?.department) {
      return { allowed: false, reason: "Delegation policy restricts delegation to the same department." };
    }
  }

  return { allowed: true, reason: "Delegation authorized." };
}

/**
 * Delegate a role to a target user.
 */
export async function delegateRole(
  delegatorId: string,
  targetUserId: string,
  roleId: string,
  endDate?: Date
): Promise<DelegationResult> {
  const check = await canDelegate(delegatorId, roleId, targetUserId);
  if (!check.allowed) {
    return { success: false, message: check.reason };
  }

  // Create delegated assignment
  const assignment = await db.delegatedAssignment.create({
    data: {
      delegatorId,
      targetUserId,
      assignedRoleId: roleId,
      startDate: new Date(),
      endDate: endDate || null,
      isActive: true,
    },
  });

  // Log in AuditLog
  await db.auditLog.create({
    data: {
      actorId: delegatorId,
      action: "ROLE_DELEGATED",
      resource: "DelegatedAssignment",
      details: JSON.stringify({
        assignmentId: assignment.id,
        targetUserId,
        roleId,
        endDate: endDate ? endDate.toISOString() : null,
      }),
    },
  });

  return {
    success: true,
    message: "Role successfully delegated.",
    assignmentId: assignment.id,
  };
}

/**
 * Revoke an active delegation assignment.
 */
export async function revokeDelegation(assignmentId: string, actorId: string): Promise<DelegationResult> {
  const assignment = await db.delegatedAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || !assignment.isActive) {
    return { success: false, message: "Delegation assignment not found or already inactive." };
  }

  // Update assignment status
  await db.delegatedAssignment.update({
    where: { id: assignmentId },
    data: { isActive: false },
  });

  // Log in AuditLog
  await db.auditLog.create({
    data: {
      actorId,
      action: "DELEGATION_REVOKED",
      resource: "DelegatedAssignment",
      details: JSON.stringify({
        assignmentId,
        delegatorId: assignment.delegatorId,
        targetUserId: assignment.targetUserId,
        roleId: assignment.assignedRoleId,
      }),
    },
  });

  return { success: true, message: "Delegation successfully revoked." };
}

/**
 * Get all active delegated assignments involving a user (either as delegator or target).
 */
export async function getActiveDelegations(userId: string) {
  const now = new Date();
  return db.delegatedAssignment.findMany({
    where: {
      OR: [{ delegatorId: userId }, { targetUserId: userId }],
      isActive: true,
      startDate: { lte: now },
    },
    include: {
      delegator: { select: { id: true, name: true, email: true } },
      targetUser: { select: { id: true, name: true, email: true } },
      assignedRole: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
