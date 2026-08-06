// =============================================================================
// Policy Enforcer — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Convenience wrappers around the Policy Engine for each application module.
// Each function builds the correct PolicyContext and returns a structured result
// that the calling module can act on immediately.
// =============================================================================

import { auth } from "@/lib/auth";
import {
  enforcePolicies,
  scanForPII,
  scanForInjection,
  isDangerousFile,
  type PolicyContext,
  type PolicyDecision,
  type PolicyContextType,
} from "@/lib/policy-engine";

// ─── Generic Enforcer ───────────────────────────────────────────────────────

/**
 * Extract client IP from request headers (X-Forwarded-For, X-Real-IP, etc.).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export interface EnforceResult {
  allowed: boolean;
  decision: PolicyDecision;
}

/**
 * Run policy enforcement with auto-resolved user context from the session.
 */
export async function enforce(
  contextType: PolicyContextType,
  metadata?: Record<string, unknown>
): Promise<EnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false,
        blocked: true,
        blockReason: "Unauthorized",
        decisions: [],
        warnings: [],
      },
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType,
    metadata: {
      ...metadata,
      ip: metadata?.ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);
  return { allowed: decision.allowed, decision };
}

// ─── AI Chat Enforcement ────────────────────────────────────────────────────

export interface ChatEnforceResult extends EnforceResult {
  piiFindings: Array<{ type: string; match: string }>;
  injectionFindings: Array<{ type: string; match: string }>;
}

/**
 * Enforce policies before sending a message to the AI model.
 * Checks: prompt injection, PII leakage, content moderation, model access.
 */
export async function enforceChatMessage(
  message: string,
  model: string,
  attachmentCount: number = 0,
  ip?: string
): Promise<ChatEnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
      piiFindings: [],
      injectionFindings: [],
    };
  }

  // Content scanning (runs regardless of policy — always scan)
  const piiFindings = scanForPII(message);
  const injectionFindings = scanForInjection(message);

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "MESSAGE",
    metadata: {
      message: message.substring(0, 1000),
      model,
      attachmentCount,
      piiCount: piiFindings.length,
      injectionCount: injectionFindings.length,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);

  // PII/injection findings can trigger blocking even if no policy matches
  if (piiFindings.length > 0) {
    decision.warnings.push(`PII detected: ${piiFindings.map(f => f.type).join(", ")}`);
  }
  if (injectionFindings.length > 0) {
    decision.blocked = true;
    decision.allowed = false;
    decision.blockReason = `Prompt injection detected: ${injectionFindings.map(f => f.type).join(", ")}`;
  }

  return {
    allowed: decision.allowed,
    decision,
    piiFindings,
    injectionFindings,
  };
}

// ─── File Upload Enforcement ────────────────────────────────────────────────

export interface FileEnforceResult extends EnforceResult {
  isDangerous: boolean;
  classification: string;
}

/**
 * Enforce policies before uploading a file.
 * Checks: file type, file size, DLP, malware signatures, sensitivity.
 */
export async function enforceFileUpload(
  fileName: string,
  mimeType: string,
  fileSize: number,
  sessionId?: string,
  ip?: string
): Promise<FileEnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
      isDangerous: false,
      classification: "UNKNOWN",
    };
  }

  const isDangerous = isDangerousFile(fileName, mimeType);

  // Basic classification based on file type
  let classification = "GENERAL";
  if (mimeType.startsWith("image/")) classification = "MEDIA";
  else if (mimeType === "application/pdf") classification = "DOCUMENT";
  else if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) classification = "DATA";
  else if (mimeType.includes("wordprocessing")) classification = "DOCUMENT";
  else if (mimeType.includes("executable") || isDangerous) classification = "RESTRICTED";

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "FILE_UPLOAD",
    metadata: {
      fileName,
      fileType: mimeType,
      fileSize,
      sessionId,
      isDangerous,
      classification,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);

  // Dangerous files are always blocked regardless of policy
  if (isDangerous) {
    decision.blocked = true;
    decision.allowed = false;
    decision.blockReason = `Dangerous file type blocked: ${fileName}`;
  }

  return { allowed: decision.allowed, decision, isDangerous, classification };
}

// ─── Login Enforcement ──────────────────────────────────────────────────────

export interface LoginEnforceResult extends EnforceResult {
  requiresMfa: boolean;
}

/**
 * Enforce policies during authentication.
 * Checks: login restrictions, allowed hours, IP restrictions, MFA.
 */
export async function enforceLogin(
  employeeId: string,
  ip?: string
): Promise<LoginEnforceResult> {
  const context: PolicyContext = {
    userId: employeeId,
    userRole: "EMPLOYEE", // Role unknown until authenticated
    contextType: "LOGIN",
    metadata: {
      ip: ip || "unknown",
      timestamp: new Date().toISOString(),
    },
  };

  const decision = await enforcePolicies(context);

  // Check if any policy requires MFA
  const requiresMfa = decision.decisions.some(
    d => d.action === "REQUIRE_APPROVAL"
  );

  return { allowed: decision.allowed, decision, requiresMfa };
}

// ─── Model Access Enforcement ───────────────────────────────────────────────

/**
 * Enforce policies before allowing a user to use an AI model.
 * Checks: department restrictions, team restrictions, cost limits, model allow/deny lists.
 */
export async function enforceModelAccess(
  modelId: string,
  provider: string,
  estimatedCost?: number,
  ip?: string
): Promise<EnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    teamId: undefined,
    contextType: "MODEL_ACCESS",
    metadata: {
      model: modelId,
      provider,
      estimatedCost,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);
  return { allowed: decision.allowed, decision };
}

// ─── Agent Enforcement ──────────────────────────────────────────────────────

/**
 * Enforce policies for agent creation or usage.
 */
export async function enforceAgentAction(
  action: "CREATE" | "EDIT" | "DELETE" | "EXECUTE",
  agentName: string,
  model?: string,
  ip?: string
): Promise<EnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "AGENT_ACTION",
    metadata: {
      action,
      agentName,
      model,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);
  return { allowed: decision.allowed, decision };
}

// ─── Workflow Enforcement ───────────────────────────────────────────────────

/**
 * Enforce policies for workflow creation or execution.
 */
export async function enforceWorkflowAction(
  action: "CREATE" | "EDIT" | "DELETE" | "EXECUTE",
  workflowName: string,
  models?: string[],
  ip?: string
): Promise<EnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "WORKFLOW_ACTION",
    metadata: {
      action,
      workflowName,
      models,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);
  return { allowed: decision.allowed, decision };
}

// ─── Analytics Enforcement ──────────────────────────────────────────────────

export interface AnalyticsEnforceResult extends EnforceResult {
  visibleDepartments: string[];
  visibleTeams: string[];
  costVisible: boolean;
}

/**
 * Enforce policies for analytics visibility.
 * Returns which departments/teams the user can see analytics for.
 */
export async function enforceAnalyticsVisibility(ip?: string): Promise<AnalyticsEnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
      visibleDepartments: [],
      visibleTeams: [],
      costVisible: false,
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "ANALYTICS_VIEW",
    metadata: { ip: ip || "unknown" },
  };

  const decision = await enforcePolicies(context);

  // Default: user can see their own department
  let visibleDepartments: string[] = session.user.department ? [session.user.department] : [];
  let costVisible = true;

  // If a policy restricts visibility, narrow it down
  for (const d of decision.decisions) {
    if (d.action === "BLOCK_REQUEST" && d.category === "AUDIT_MONITORING") {
      visibleDepartments = [];
      costVisible = false;
    }
    if (d.action === "REDACT_CONTENT" && d.category === "DATA_PROTECTION") {
      costVisible = false;
    }
  }

  // SUPER_ADMIN sees everything
  if (session.user.role === "SUPER_ADMIN") {
    visibleDepartments = ["*"];
    costVisible = true;
  }

  return {
    allowed: decision.allowed,
    decision,
    visibleDepartments,
    visibleTeams: [],
    costVisible,
  };
}

// ─── User Management Enforcement ────────────────────────────────────────────

/**
 * Enforce policies for user management operations.
 */
export async function enforceUserManagement(
  action: "CREATE" | "EDIT" | "DELETE" | "ROLE_ASSIGN" | "PRIVILEGE_ESCALATION",
  targetUserId?: string,
  targetRole?: string,
  ip?: string
): Promise<EnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "USER_MANAGEMENT",
    metadata: {
      action,
      targetUserId,
      targetRole,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);
  return { allowed: decision.allowed, decision };
}

// ─── Knowledge Base Enforcement ─────────────────────────────────────────────

/**
 * Enforce policies for knowledge base operations.
 */
export async function enforceKnowledgeBase(
  action: "READ" | "UPLOAD" | "EDIT" | "DELETE" | "PUBLISH" | "ARCHIVE",
  documentId?: string,
  classification?: string,
  ip?: string
): Promise<EnforceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      allowed: false,
      decision: {
        allowed: false, blocked: true, blockReason: "Unauthorized",
        decisions: [], warnings: [],
      },
    };
  }

  const context: PolicyContext = {
    userId: session.user.id,
    userRole: session.user.role || "EMPLOYEE",
    departmentId: session.user.department || undefined,
    contextType: "KNOWLEDGE_BASE",
    metadata: {
      action,
      documentId,
      classification,
      ip: ip || "unknown",
    },
  };

  const decision = await enforcePolicies(context);
  return { allowed: decision.allowed, decision };
}
