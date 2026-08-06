// =============================================================================
// Enterprise Policy Engine — Hamdard AI Platform
// -----------------------------------------------------------------------------
// Centralized policy evaluation service. Every sensitive operation in HEAIP
// calls this engine. Policies are the single source of truth.
//
// Context types map to application modules:
//   MESSAGE          → AI Chat prompt/response
//   FILE_UPLOAD      → File attachment upload
//   LOGIN            → Authentication
//   MODEL_ACCESS     → AI model selection
//   ADMIN_ACTION     → Admin panel operations
//   AGENT_ACTION     → Agent creation/usage
//   WORKFLOW_ACTION  → Workflow creation/execution
//   ANALYTICS_VIEW   → Analytics visibility
//   USER_MANAGEMENT  → User CRUD / role assignment
//   KNOWLEDGE_BASE   → KB document access
// =============================================================================

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PolicyContextType =
  | "MESSAGE"
  | "FILE_UPLOAD"
  | "LOGIN"
  | "MODEL_ACCESS"
  | "ADMIN_ACTION"
  | "AGENT_ACTION"
  | "WORKFLOW_ACTION"
  | "ANALYTICS_VIEW"
  | "USER_MANAGEMENT"
  | "KNOWLEDGE_BASE";

export interface PolicyContext {
  userId: string;
  userRole: string;
  departmentId?: string;
  teamId?: string;
  contextType: PolicyContextType;
  metadata?: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  decisions: Array<{
    policyId: string;
    policyName: string;
    category: string;
    action: string;
    details?: string;
  }>;
  warnings: string[];
  maskedContent?: string;
  blocked: boolean;
  blockReason?: string;
}

export interface ResolvedPolicy {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  scope: string;
  priority: number;
  actions: string[];
  conditions: Record<string, unknown>;
  exceptions: Array<Record<string, unknown>>;
  status: string;
  version: number;
}

// ─── Evaluation Order (per spec — legal/security first) ─────────────────────

const EVALUATION_ORDER = [
  "LEGAL_COMPLIANCE",
  "PROMPT_INJECTION",
  "DATA_PROTECTION",
  "CONFIDENTIALITY",
  "ACCESS_AUTHORIZATION",
  "CONTENT_MODERATION",
  "CONVERSATION_GOVERNANCE",
  "ATTACHMENT_SECURITY",
  "AI_RESPONSE_VALIDATION",
  "QUOTA_USAGE",
  "AI_MODEL_ACCESS",
  "KNOWLEDGE_BASE",
  "AUDIT_MONITORING",
  "DATA_RETENTION",
];

// ─── Content Scanning Utilities ─────────────────────────────────────────────

const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "CREDIT_CARD", regex: /\b(?:\d[ -]*?){13,16}\b/ },
  { name: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: "EMAIL", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { name: "PHONE_PK", regex: /\b(\+92|0092|92|0)3[0-4]\d{8}\b/ },
  { name: "API_KEY", regex: /(?:key|password|secret|token|api[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i },
];

const INJECTION_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "SYSTEM_OVERRIDE", regex: /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|rules|prompts|guidelines)/i },
  { name: "ROLE_HIJACK", regex: /(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+(?:a\s+)?(?:different|new|another)/i },
  { name: "PROMPT_LEAK", regex: /(?:show|reveal|print|output|display)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules|configuration)/i },
  { name: "JAILBREAK", regex: /\b(?:DAN|jailbreak|bypass|override)\b/i },
  { name: "ENCODING_BYPASS", regex: /(?:base64|rot13|hex|binary)\s*(?:decode|encode)/i },
];

const DANGEROUS_FILE_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs", ".js", ".msi",
  ".com", ".scr", ".pif", ".dll", ".sys", ".cpl", ".hta", ".wsf",
]);

const SENSITIVE_MIME_TYPES = new Set([
  "application/x-executable", "application/x-msdownload",
  "application/x-bat", "application/x-sh",
]);

// ─── Core Engine ────────────────────────────────────────────────────────────

/**
 * Resolve all applicable policies for a given context.
 * Applies scoping: Organization → Department → Team → Role → User.
 * Returns policies sorted by evaluation order, then priority (desc).
 */
export async function resolvePolicies(context: PolicyContext): Promise<ResolvedPolicy[]> {
  const now = new Date();

  const allPolicies = await db.aiPolicy.findMany({
    where: {
      isActive: true,
      status: "ACTIVE",
      OR: [
        { effectiveAt: null },
        { effectiveAt: { lte: now } },
      ],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
  });

  const applicable: ResolvedPolicy[] = [];

  for (const policy of allPolicies) {
    if (await isScopeApplicable(policy, context)) {
      applicable.push({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        category: policy.category,
        severity: policy.severity,
        scope: policy.scope,
        priority: policy.priority,
        actions: jsonArray(policy.actions),
        conditions: jsonObject(policy.conditions),
        exceptions: jsonArray(policy.exceptions) as unknown as Array<Record<string, unknown>>,
        status: policy.status,
        version: policy.version,
      });
    }
  }

  applicable.sort((a, b) => {
    const oa = EVALUATION_ORDER.indexOf(a.category);
    const ob = EVALUATION_ORDER.indexOf(b.category);
    const od = (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
    if (od !== 0) return od;
    return b.priority - a.priority;
  });

  return applicable;
}

/**
 * Evaluate resolved policies and return a decision.
 */
export async function evaluatePolicies(
  policies: ResolvedPolicy[],
  context: PolicyContext
): Promise<PolicyDecision> {
  const result: PolicyDecision = {
    allowed: true,
    decisions: [],
    warnings: [],
    blocked: false,
  };

  for (const policy of policies) {
    if (policyExceptions(policy, context)) continue;
    if (!(await conditionsMet(policy.conditions, context))) continue;

    const action = primaryAction(policy.actions);

    result.decisions.push({
      policyId: policy.id,
      policyName: policy.name,
      category: policy.category,
      action,
      details: `Policy "${policy.name}" (${policy.category}) → ${action}`,
    });

    switch (action) {
      case "BLOCK_REQUEST":
        result.blocked = true;
        result.blockReason = `Blocked by policy: ${policy.name}`;
        result.allowed = false;
        break;
      case "STOP_AI_RESPONSE":
        result.blocked = true;
        result.blockReason = `AI response stopped by policy: ${policy.name}`;
        result.allowed = false;
        break;
      case "DISABLE_MODEL_ACCESS":
        result.blocked = true;
        result.blockReason = `Model access disabled by policy: ${policy.name}`;
        result.allowed = false;
        break;
      case "REQUIRE_APPROVAL":
        result.blocked = true;
        result.blockReason = `Requires approval per policy: ${policy.name}`;
        result.allowed = false;
        break;
      case "QUARANTINE_FILE":
        result.blocked = true;
        result.blockReason = `File quarantined per policy: ${policy.name}`;
        result.allowed = false;
        break;
      case "MASK_SENSITIVE_DATA":
        result.warnings.push(`Sensitive data masked per policy: ${policy.name}`);
        break;
      case "REDACT_CONTENT":
        result.warnings.push(`Content redacted per policy: ${policy.name}`);
        break;
      case "ALLOW_WITH_WARNING":
        result.warnings.push(`Allowed with warning: ${policy.name}`);
        break;
      case "WARN":
        result.warnings.push(`Warning: ${policy.name} — ${policy.description}`);
        break;
      case "NOTIFY_MANAGER":
      case "NOTIFY_SECURITY_TEAM":
        result.warnings.push(`Notification triggered: ${policy.name}`);
        break;
      case "LOG_EVENT_ONLY":
        break;
      case "ALLOW":
      default:
        break;
    }

    if (result.blocked && (policy.severity === "CRITICAL" || policy.severity === "HIGH")) {
      break;
    }
  }

  return result;
}

/**
 * Full pipeline: resolve → evaluate → log.
 */
export async function enforcePolicies(context: PolicyContext): Promise<PolicyDecision> {
  const policies = await resolvePolicies(context);
  const decision = await evaluatePolicies(policies, context);
  await logEvaluation(context, decision);
  return decision;
}

// ─── Scope Resolution ───────────────────────────────────────────────────────

async function isScopeApplicable(
  policy: { scope: string; scopeTargets: string },
  context: PolicyContext
): Promise<boolean> {
  switch (policy.scope) {
    case "ORGANIZATION":
      return true;
    case "DEPARTMENT": {
      if (!context.departmentId) return false;
      const targets = jsonArray(policy.scopeTargets);
      return targets.length === 0 || targets.includes(context.departmentId);
    }
    case "TEAM": {
      if (!context.teamId) return false;
      const targets = jsonArray(policy.scopeTargets);
      return targets.length === 0 || targets.includes(context.teamId);
    }
    case "ROLE": {
      const targets = jsonArray(policy.scopeTargets);
      return targets.length === 0 || targets.includes(context.userRole);
    }
    case "USER": {
      const targets = jsonArray(policy.scopeTargets);
      return targets.includes(context.userId);
    }
    default:
      return false;
  }
}

// ─── Condition Evaluation ───────────────────────────────────────────────────

async function conditionsMet(
  conditions: Record<string, unknown>,
  context: PolicyContext
): Promise<boolean> {
  if (Object.keys(conditions).length === 0) return true;

  // contextType filter
  if (conditions.contextType && conditions.contextType !== context.contextType) {
    return false;
  }

  // roles filter
  if (Array.isArray(conditions.roles) && !conditions.roles.includes(context.userRole)) {
    return false;
  }

  // departments filter
  if (Array.isArray(conditions.departments)) {
    if (!context.departmentId || !conditions.departments.includes(context.departmentId)) {
      return false;
    }
  }

  // teams filter
  if (Array.isArray(conditions.teams)) {
    if (!context.teamId || !conditions.teams.includes(context.teamId)) {
      return false;
    }
  }

  // time window filter (hours 0-23)
  if (conditions.allowedHours && typeof conditions.allowedHours === "object") {
    const { start, end } = conditions.allowedHours as { start: number; end: number };
    const hour = new Date().getHours();
    if (start <= end) {
      if (hour < start || hour > end) return false;
    } else {
      // Overnight window (e.g., 22-6)
      if (hour < start && hour > end) return false;
    }
  }

  // maxTokens filter (for MESSAGE context)
  if (conditions.maxTokens && typeof conditions.maxTokens === "number") {
    const msgLen = typeof context.metadata?.message === "string"
      ? context.metadata.message.length
      : 0;
    if (msgLen > conditions.maxTokens * 4) return false; // ~4 chars per token
  }

  // allowedModels filter (for MODEL_ACCESS context)
  if (Array.isArray(conditions.allowedModels)) {
    const requestedModel = typeof context.metadata?.model === "string"
      ? context.metadata.model
      : "";
    if (requestedModel && !conditions.allowedModels.includes(requestedModel)) {
      return false;
    }
  }

  // blockedModels filter
  if (Array.isArray(conditions.blockedModels)) {
    const requestedModel = typeof context.metadata?.model === "string"
      ? context.metadata.model
      : "";
    if (requestedModel && conditions.blockedModels.includes(requestedModel)) {
      return false;
    }
  }

  // allowedFileTypes filter (for FILE_UPLOAD context)
  if (Array.isArray(conditions.allowedFileTypes)) {
    const fileType = typeof context.metadata?.fileType === "string"
      ? context.metadata.fileType
      : "";
    if (fileType && !conditions.allowedFileTypes.includes(fileType)) {
      return false;
    }
  }

  // blockedFileTypes filter
  if (Array.isArray(conditions.blockedFileTypes)) {
    const fileType = typeof context.metadata?.fileType === "string"
      ? context.metadata.fileType
      : "";
    if (fileType && conditions.blockedFileTypes.includes(fileType)) {
      return false;
    }
  }

  // maxFileSize filter (bytes)
  if (conditions.maxFileSize && typeof conditions.maxFileSize === "number") {
    const fileSize = typeof context.metadata?.fileSize === "number"
      ? context.metadata.fileSize
      : 0;
    if (fileSize > conditions.maxFileSize) return false;
  }

  // ipWhitelist filter
  if (Array.isArray(conditions.ipWhitelist)) {
    const ip = typeof context.metadata?.ip === "string" ? context.metadata.ip : "";
    if (ip && !conditions.ipWhitelist.includes(ip)) return false;
  }

  // ipBlacklist filter
  if (Array.isArray(conditions.ipBlacklist)) {
    const ip = typeof context.metadata?.ip === "string" ? context.metadata.ip : "";
    if (ip && conditions.ipBlacklist.includes(ip)) return false;
  }

  // Rate limiting (QUOTA_USAGE policies). These conditions only make the
  // policy apply when measured usage actually violates the limit; otherwise
  // the policy is skipped. This prevents rate-limit policies from blocking
  // requests when there is no usage history (e.g. a first login).
  //
  //   maxRequestsPerHour  – max AI calls per rolling window
  //   cooldownMinutes     – length of the rolling window (default 60)
  //   maxTokensPerRequest – max prompt length in tokens (~4 chars/token)
  let hasRateConditions = false;

  if (context.userId && conditions.maxRequestsPerHour != null) {
    hasRateConditions = true;
    const cooldown =
      typeof conditions.cooldownMinutes === "number" && conditions.cooldownMinutes > 0
        ? conditions.cooldownMinutes
        : 60;
    const since = new Date(Date.now() - cooldown * 60_000);
    const requestCount = await db.usageLog.count({
      where: { employeeId: context.userId, createdAt: { gte: since } },
    });
    if (requestCount >= Number(conditions.maxRequestsPerHour)) {
      return true;
    }
  }

  if (conditions.maxTokensPerRequest != null && typeof conditions.maxTokensPerRequest === "number") {
    hasRateConditions = true;
    const msgLen = typeof context.metadata?.message === "string"
      ? context.metadata.message.length
      : 0;
    if (msgLen > conditions.maxTokensPerRequest * 4) {
      return true;
    }
  }

  // A policy with only rate-limit conditions applies only when a limit is
  // exceeded; otherwise it must not trigger.
  if (hasRateConditions) {
    return false;
  }

  return true;
}

// ─── Exception Checking ─────────────────────────────────────────────────────

function policyExceptions(
  policy: ResolvedPolicy,
  context: PolicyContext
): boolean {
  for (const ex of policy.exceptions) {
    if (Array.isArray(ex.roles) && ex.roles.includes(context.userRole)) return true;
    if (Array.isArray(ex.userIds) && ex.userIds.includes(context.userId)) return true;
    if (Array.isArray(ex.departmentIds) && context.departmentId && ex.departmentIds.includes(context.departmentId)) return true;
    if (Array.isArray(ex.teamIds) && context.teamId && ex.teamIds.includes(context.teamId)) return true;
  }
  return false;
}

// ─── Action Resolution ──────────────────────────────────────────────────────

function primaryAction(actions: string[]): string {
  const priority = [
    "BLOCK_REQUEST", "STOP_AI_RESPONSE", "DISABLE_MODEL_ACCESS",
    "REQUIRE_APPROVAL", "QUARANTINE_FILE", "MASK_SENSITIVE_DATA",
    "REDACT_CONTENT", "NOTIFY_SECURITY_TEAM", "NOTIFY_MANAGER",
    "ALLOW_WITH_WARNING", "WARN", "LOG_EVENT_ONLY", "ALLOW",
  ];
  for (const p of priority) {
    if (actions.includes(p)) return p;
  }
  return actions[0] || "ALLOW";
}

// ─── Audit Logging ──────────────────────────────────────────────────────────

async function logEvaluation(context: PolicyContext, decision: PolicyDecision): Promise<void> {
  try {
    for (const d of decision.decisions) {
      await db.policyEvaluationLog.create({
        data: {
          policyId: d.policyId,
          employeeId: context.userId,
          contextType: context.contextType,
          contextJson: JSON.stringify(context.metadata || {}),
          decision: d.action,
          details: JSON.stringify({
            policyName: d.policyName,
            category: d.category,
            details: d.details,
            blocked: decision.blocked,
            warnings: decision.warnings,
          }),
        },
      });
    }

    if (decision.blocked) {
      await db.auditLog.create({
        data: {
          actorId: context.userId,
          action: "POLICY_VIOLATION",
          resource: `Policy:${decision.decisions.map(d => d.policyId).join(",")}`,
          details: JSON.stringify({
            contextType: context.contextType,
            blockReason: decision.blockReason,
            decisions: decision.decisions.map(d => ({
              policy: d.policyName,
              category: d.category,
              action: d.action,
            })),
          }),
        },
      });
    }
  } catch (error) {
    console.error("[POLICY_EVAL_LOG]", error);
  }
}

// ─── Content Scanning (used by enforcer helpers) ────────────────────────────

export function scanForPII(text: string): Array<{ type: string; match: string }> {
  const findings: Array<{ type: string; match: string }> = [];
  for (const { name, regex } of PII_PATTERNS) {
    const matches = text.match(new RegExp(regex, "g"));
    if (matches) {
      for (const m of matches) {
        findings.push({ type: name, match: m });
      }
    }
  }
  return findings;
}

export function scanForInjection(text: string): Array<{ type: string; match: string }> {
  const findings: Array<{ type: string; match: string }> = [];
  for (const { name, regex } of INJECTION_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      findings.push({ type: name, match: match[0] });
    }
  }
  return findings;
}

export function isDangerousFile(fileName: string, mimeType: string): boolean {
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  return DANGEROUS_FILE_EXTENSIONS.has(ext) || SENSITIVE_MIME_TYPES.has(mimeType);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function jsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
