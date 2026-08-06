import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-guard";

const DEFAULT_POLICIES = [
  {
    name: "Unauthorized Access Prevention",
    description: "Blocks access to restricted resources. All users must authenticate and have appropriate role assignments before accessing any protected endpoint.",
    category: "ACCESS_AUTHORIZATION",
    severity: "CRITICAL",
    scope: "ORGANIZATION",
    priority: 95,
    actions: JSON.stringify(["BLOCK_REQUEST", "NOTIFY_SECURITY_TEAM", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "LOGIN" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "AI Model Access Control",
    description: "Controls which AI models can be accessed based on department, role, and quota. Prevents unauthorized model usage and cost overruns.",
    category: "AI_MODEL_ACCESS",
    severity: "HIGH",
    scope: "ORGANIZATION",
    priority: 90,
    actions: JSON.stringify(["BLOCK_REQUEST", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "MODEL_ACCESS" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN", "ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Monthly Budget Quota Enforcement",
    description: "Enforces monthly AI spending limits per user and organization. Prevents budget overruns by blocking requests when quota is exceeded.",
    category: "QUOTA_USAGE",
    severity: "HIGH",
    scope: "ORGANIZATION",
    priority: 85,
    actions: JSON.stringify(["BLOCK_REQUEST", "NOTIFY_MANAGER"]),
    conditions: JSON.stringify({ contextType: "MESSAGE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Content Moderation - Standard",
    description: "Screens AI chat messages for inappropriate, harmful, or policy-violating content. Blocks toxic, hateful, or sexually explicit content.",
    category: "CONTENT_MODERATION",
    severity: "MEDIUM",
    scope: "ORGANIZATION",
    priority: 70,
    actions: JSON.stringify(["BLOCK_REQUEST", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "MESSAGE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "DLP - Credit Card & PII Protection",
    description: "Detects and blocks transmission of credit card numbers, SSNs, and other PII through AI chat. Prevents data leakage.",
    category: "DATA_PROTECTION",
    severity: "CRITICAL",
    scope: "ORGANIZATION",
    priority: 99,
    actions: JSON.stringify(["BLOCK_REQUEST", "NOTIFY_SECURITY_TEAM", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "MESSAGE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Executable File Upload Block",
    description: "Blocks upload of executable files (.exe, .bat, .sh, .ps1, etc.) to prevent malware distribution and security breaches.",
    category: "ATTACHMENT_SECURITY",
    severity: "CRITICAL",
    scope: "ORGANIZATION",
    priority: 98,
    actions: JSON.stringify(["QUARANTINE_FILE", "NOTIFY_SECURITY_TEAM", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "FILE_UPLOAD" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Confidential Data Classification",
    description: "Classifies and protects confidential data. Restricts sharing of classified documents through AI channels without proper clearance.",
    category: "CONFIDENTIALITY",
    severity: "HIGH",
    scope: "ORGANIZATION",
    priority: 88,
    actions: JSON.stringify(["REDACT_CONTENT", "NOTIFY_MANAGER", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "FILE_UPLOAD" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN", "ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Regulatory Compliance - Data Retention",
    description: "Ensures compliance with data retention regulations. Logs all AI interactions for audit purposes and enforces retention policies.",
    category: "LEGAL_COMPLIANCE",
    severity: "HIGH",
    scope: "ORGANIZATION",
    priority: 92,
    actions: JSON.stringify(["LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({}),
    exceptions: JSON.stringify([]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Conversation Monitoring & Governance",
    description: "Monitors AI conversations for policy compliance. Tracks conversation patterns and flags suspicious activities.",
    category: "CONVERSATION_GOVERNANCE",
    severity: "MEDIUM",
    scope: "ORGANIZATION",
    priority: 60,
    actions: JSON.stringify(["LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "MESSAGE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Prompt Injection Protection",
    description: "Detects and blocks prompt injection attempts including system override, role hijacking, and jailbreak patterns.",
    category: "PROMPT_INJECTION",
    severity: "CRITICAL",
    scope: "ORGANIZATION",
    priority: 100,
    actions: JSON.stringify(["BLOCK_REQUEST", "NOTIFY_SECURITY_TEAM", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "MESSAGE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Knowledge Base Access Control",
    description: "Controls access to organizational knowledge base. Restricts document upload, edit, and delete based on role and department.",
    category: "KNOWLEDGE_BASE",
    severity: "MEDIUM",
    scope: "ORGANIZATION",
    priority: 55,
    actions: JSON.stringify(["BLOCK_REQUEST", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "KNOWLEDGE_BASE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN", "ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "AI Response Validation",
    description: "Validates AI responses for accuracy, compliance, and policy adherence. Blocks responses containing sensitive information leaks.",
    category: "AI_RESPONSE_VALIDATION",
    severity: "MEDIUM",
    scope: "ORGANIZATION",
    priority: 50,
    actions: JSON.stringify(["WARN", "LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({ contextType: "MESSAGE" }),
    exceptions: JSON.stringify([{ roles: ["SUPER_ADMIN"] }]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Audit Trail & Monitoring",
    description: "Maintains comprehensive audit trail of all AI interactions. Monitors for anomalous patterns and security threats.",
    category: "AUDIT_MONITORING",
    severity: "MEDIUM",
    scope: "ORGANIZATION",
    priority: 45,
    actions: JSON.stringify(["LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({}),
    exceptions: JSON.stringify([]),
    status: "ACTIVE",
    isActive: true,
  },
  {
    name: "Data Retention & Purge Policy",
    description: "Automatically manages data lifecycle. Archives old conversations and purges data beyond retention period.",
    category: "DATA_RETENTION",
    severity: "LOW",
    scope: "ORGANIZATION",
    priority: 30,
    actions: JSON.stringify(["LOG_EVENT_ONLY"]),
    conditions: JSON.stringify({}),
    exceptions: JSON.stringify([]),
    status: "ACTIVE",
    isActive: true,
  },
];

export async function POST() {
  const guard = await requirePermission("policies.create");
  if ("error" in guard) return guard.error;

  try {
    // Check if default policies already exist
    const existingCount = await db.aiPolicy.count();
    if (existingCount > 0) {
      return NextResponse.json({
        message: "Default policies already exist. Skipping seed.",
        count: existingCount,
      });
    }

    // Seed all default policies
    const created = await db.aiPolicy.createMany({
      data: DEFAULT_POLICIES.map((p) => ({
        ...p,
        createdById: guard.session.user.id,
      })),
    });

    // Log the seed action
    await db.auditLog.create({
      data: {
        actorId: guard.session.user.id,
        action: "SEED_DEFAULT_POLICIES",
        resource: "aiPolicy:defaults",
        details: JSON.stringify({ count: created.count }),
      },
    });

    return NextResponse.json({
      message: `Successfully seeded ${created.count} default policies`,
      count: created.count,
    });
  } catch (error) {
    console.error("[POLICIES_SEED]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
