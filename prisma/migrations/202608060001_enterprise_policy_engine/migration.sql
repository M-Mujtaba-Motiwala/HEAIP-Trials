-- Enterprise Policy Engine Migration
-- Adds: enhanced AiPolicy columns, PolicyScope, PolicyEvaluationLog tables

-- 1. Extend ai_policies table with enterprise fields
ALTER TABLE "ai_policies" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'CONTENT_MODERATION';
ALTER TABLE "ai_policies" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "ai_policies" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'ORGANIZATION';
ALTER TABLE "ai_policies" ADD COLUMN "scopeTargets" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ai_policies" ADD COLUMN "actions" TEXT NOT NULL DEFAULT '["BLOCK_REQUEST"]';
ALTER TABLE "ai_policies" ADD COLUMN "conditions" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ai_policies" ADD COLUMN "exceptions" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ai_policies" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "ai_policies" ADD COLUMN "effectiveAt" TIMESTAMP(3);
ALTER TABLE "ai_policies" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "ai_policies" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "ai_policies" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ai_policies" ADD COLUMN "updatedById" TEXT;
ALTER TABLE "ai_policies" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrate existing policyType to category for backward compatibility
UPDATE "ai_policies" SET "category" = CASE
  WHEN "policyType" = 'RATE_LIMIT' THEN 'QUOTA_USAGE'
  WHEN "policyType" = 'CONTENT_FILTER' THEN 'CONTENT_MODERATION'
  WHEN "policyType" = 'MODEL_ACCESS' THEN 'AI_MODEL_ACCESS'
  WHEN "policyType" = 'DATA_FILTER' THEN 'DATA_PROTECTION'
  ELSE 'CONTENT_MODERATION'
END WHERE "category" = 'CONTENT_MODERATION';

-- Add foreign key for updatedById
ALTER TABLE "ai_policies" ADD CONSTRAINT "ai_policies_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for new columns
CREATE INDEX "ai_policies_category_idx" ON "ai_policies"("category");
CREATE INDEX "ai_policies_status_idx" ON "ai_policies"("status");
CREATE INDEX "ai_policies_priority_idx" ON "ai_policies"("priority" DESC);
CREATE INDEX "ai_policies_scope_idx" ON "ai_policies"("scope");

-- 2. Create policy_scopes table
CREATE TABLE "policy_scopes" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "policy_scopes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "policy_scopes_policyId_scopeType_targetId_key" ON "policy_scopes"("policyId", "scopeType", "targetId");
CREATE INDEX "policy_scopes_policyId_idx" ON "policy_scopes"("policyId");
CREATE INDEX "policy_scopes_scopeType_targetId_idx" ON "policy_scopes"("scopeType", "targetId");
ALTER TABLE "policy_scopes" ADD CONSTRAINT "policy_scopes_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "ai_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Create policy_evaluation_logs table
CREATE TABLE "policy_evaluation_logs" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "contextType" TEXT NOT NULL,
  "contextJson" TEXT NOT NULL DEFAULT '{}',
  "decision" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "policy_evaluation_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "policy_evaluation_logs_policyId_idx" ON "policy_evaluation_logs"("policyId");
CREATE INDEX "policy_evaluation_logs_employeeId_idx" ON "policy_evaluation_logs"("employeeId");
CREATE INDEX "policy_evaluation_logs_decision_idx" ON "policy_evaluation_logs"("decision");
CREATE INDEX "policy_evaluation_logs_createdAt_idx" ON "policy_evaluation_logs"("createdAt");
ALTER TABLE "policy_evaluation_logs" ADD CONSTRAINT "policy_evaluation_logs_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "ai_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_evaluation_logs" ADD CONSTRAINT "policy_evaluation_logs_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Add new permissions for enterprise policy management
INSERT INTO "permissions" ("id", "module", "resource", "action", "permissionKey", "description", "createdAt") VALUES
  ('perm-policies-assign', 'policies', 'policy', 'assign', 'policies.assign', 'Assign policies to scopes', CURRENT_TIMESTAMP),
  ('perm-policies-evaluate', 'policies', 'policy', 'evaluate', 'policies.evaluate', 'View policy evaluation logs', CURRENT_TIMESTAMP),
  ('perm-policies-export', 'policies', 'policy', 'export', 'policies.export', 'Export policies', CURRENT_TIMESTAMP)
ON CONFLICT ("permissionKey") DO NOTHING;

-- Grant new permissions to SUPER_ADMIN and ADMIN
INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", 'perm-policies-assign', CURRENT_TIMESTAMP FROM "roles" r WHERE r."code" IN ('SUPER_ADMIN', 'ADMIN')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", 'perm-policies-evaluate', CURRENT_TIMESTAMP FROM "roles" r WHERE r."code" IN ('SUPER_ADMIN', 'ADMIN')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", 'perm-policies-export', CURRENT_TIMESTAMP FROM "roles" r WHERE r."code" IN ('SUPER_ADMIN', 'ADMIN')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 5. Seed enterprise default policies
INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-access-org-default',
  'Organization Access Control',
  'Default organization-wide access policy controlling who can access the platform and what actions they can perform.',
  'ACCESS_AUTHORIZATION',
  NULL,
  'HIGH',
  'ORGANIZATION',
  '[]',
  '["ALLOW","LOG_EVENT_ONLY"]',
  '{"requireAuthentication": true, "requireActiveStatus": true, "requireApprovedRegistration": true}',
  '[]',
  95,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-access-org-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-content-moderation-default',
  'Content Moderation - Standard',
  'Standard content moderation: blocks hate speech, harassment, violence, self-harm, and jailbreak attempts.',
  'CONTENT_MODERATION',
  'CONTENT_FILTER',
  'HIGH',
  'ORGANIZATION',
  '[]',
  '["BLOCK_REQUEST","LOG_EVENT_ONLY"]',
  '{"detectHateSpeech": true, "detectHarassment": true, "detectViolence": true, "detectSelfHarm": true, "detectJailbreak": true, "detectPromptAbuse": true}',
  '[]',
  90,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-content-moderation-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-data-protection-default',
  'Data Protection & DLP - Standard',
  'Standard data protection: detects and masks PII, financial data, API keys, passwords, and internal documents.',
  'DATA_PROTECTION',
  'DATA_FILTER',
  'CRITICAL',
  'ORGANIZATION',
  '[]',
  '["MASK_SENSITIVE_DATA","BLOCK_REQUEST","NOTIFY_SECURITY_TEAM"]',
  '{"detectPII": true, "detectFinancialInfo": true, "detectAPIKeys": true, "detectPasswords": true, "detectInternalDocs": true, "detectIntellectualProperty": true, "action": "MASK"}',
  '[]',
  98,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-data-protection-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-quota-standard',
  'Standard Usage Quota',
  'Standard quota limits: 100 requests/hour, 5000 tokens/request, monthly budget cap.',
  'QUOTA_USAGE',
  'RATE_LIMIT',
  'MEDIUM',
  'ORGANIZATION',
  '[]',
  '["BLOCK_REQUEST","NOTIFY_MANAGER"]',
  '{"maxRequestsPerHour": 100, "maxTokensPerRequest": 5000, "cooldownMinutes": 5, "monthlyBudgetPKR": 15000}',
  '[]',
  80,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-quota-standard');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-model-access-default',
  'AI Model Access - Standard',
  'Controls which AI models are available. Blocks unapproved models, allows free-tier Groq models.',
  'AI_MODEL_ACCESS',
  'MODEL_ACCESS',
  'MEDIUM',
  'ORGANIZATION',
  '[]',
  '["ALLOW","DISABLE_MODEL_ACCESS","LOG_EVENT_ONLY"]',
  '{"allowedProviders": ["groq"], "blockedModels": [], "requireApprovalForPremium": true}',
  '[]',
  75,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-model-access-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-prompt-injection-default',
  'Prompt Injection Protection',
  'Detects prompt injection attacks: system prompt extraction, instruction override, policy bypass attempts.',
  'PROMPT_INJECTION',
  NULL,
  'CRITICAL',
  'ORGANIZATION',
  '[]',
  '["BLOCK_REQUEST","LOG_EVENT_ONLY","NOTIFY_SECURITY_TEAM"]',
  '{"detectSystemPromptExtraction": true, "detectInstructionOverride": true, "detectPolicyBypass": true, "detectDataExtraction": true}',
  '[]',
  99,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-prompt-injection-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-attachment-security-default',
  'Attachment Security - Standard',
  'Scans uploaded files for malware, validates MIME types, blocks executables, extracts metadata.',
  'ATTACHMENT_SECURITY',
  NULL,
  'HIGH',
  'ORGANIZATION',
  '[]',
  '["QUARANTINE_FILE","BLOCK_REQUEST","LOG_EVENT_ONLY"]',
  '{"blockExecutables": true, "validateMIME": true, "scanMetadata": true, "maxFileSizeMB": 50, "blockedExtensions": [".exe", ".bat", ".sh", ".cmd", ".ps1"]}',
  '[]',
  85,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-attachment-security-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-legal-compliance-default',
  'Legal & Compliance - Standard',
  'Ensures AI requests comply with company policies, employment agreements, and privacy regulations.',
  'LEGAL_COMPLIANCE',
  NULL,
  'HIGH',
  'ORGANIZATION',
  '[]',
  '["BLOCK_REQUEST","NOTIFY_MANAGER","LOG_EVENT_ONLY"]',
  '{"enforceCompanyPolicies": true, "enforcePrivacyRegulations": true, "enforceIPRules": true}',
  '[]',
  92,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-legal-compliance-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-conversation-governance-default',
  'Conversation Governance',
  'Monitors conversations for policy violations, confidential leakage, fraud, social engineering, and insider threats.',
  'CONVERSATION_GOVERNANCE',
  NULL,
  'HIGH',
  'ORGANIZATION',
  '[]',
  '["LOG_EVENT_ONLY","NOTIFY_SECURITY_TEAM","STOP_AI_RESPONSE"]',
  '{"detectConfidentialLeakage": true, "detectFraud": true, "detectSocialEngineering": true, "detectInsiderThreats": true}',
  '[]',
  88,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-conversation-governance-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-response-validation-default',
  'AI Response Validation',
  'Validates AI responses before delivery: checks for sensitive info leakage, hallucination, toxicity, compliance.',
  'AI_RESPONSE_VALIDATION',
  NULL,
  'MEDIUM',
  'ORGANIZATION',
  '[]',
  '["STOP_AI_RESPONSE","LOG_EVENT_ONLY"]',
  '{"checkSensitiveInfoLeakage": true, "checkHallucination": true, "checkToxicity": true, "checkCompliance": true}',
  '[]',
  70,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-response-validation-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-audit-monitoring-default',
  'Audit & Monitoring - Standard',
  'Configures logging for chats, file uploads, logins, policy violations, admin actions, and model usage.',
  'AUDIT_MONITORING',
  NULL,
  'MEDIUM',
  'ORGANIZATION',
  '[]',
  '["LOG_EVENT_ONLY"]',
  '{"logChats": true, "logFileUploads": true, "logLogins": true, "logPolicyViolations": true, "logAdminActions": true, "logModelUsage": true, "logAPIRequests": true}',
  '[]',
  60,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-audit-monitoring-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-data-retention-default',
  'Data Retention - Standard',
  'Configures retention periods for chats, uploaded files, OCR data, AI responses, logs, and analytics.',
  'DATA_RETENTION',
  NULL,
  'LOW',
  'ORGANIZATION',
  '[]',
  '["LOG_EVENT_ONLY"]',
  '{"chatsRetentionDays": 365, "filesRetentionDays": 180, "ocrDataRetentionDays": 90, "aiResponsesRetentionDays": 365, "logsRetentionDays": 730, "analyticsRetentionDays": 365}',
  '[]',
  30,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-data-retention-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-confidentiality-default',
  'Confidentiality Classification',
  'Classifies uploaded data as Public, Internal, Confidential, Restricted, or Highly Restricted.',
  'CONFIDENTIALITY',
  NULL,
  'HIGH',
  'ORGANIZATION',
  '[]',
  '["ALLOW","WARN","BLOCK_REQUEST","NOTIFY_SECURITY_TEAM"]',
  '{"classificationLevels": ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "HIGHLY_RESTRICTED"], "defaultAction": "WARN", "blockRestricted": true}',
  '[]',
  87,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-confidentiality-default');

INSERT INTO "ai_policies" ("id", "name", "description", "category", "policyType", "severity", "scope", "scopeTargets", "actions", "conditions", "exceptions", "priority", "status", "version", "isActive", "createdById", "createdAt", "updatedAt")
SELECT
  'policy-knowledge-base-default',
  'Knowledge Base Access Control',
  'Controls knowledge base permissions: read, upload, edit, delete, publish, archive, restore.',
  'KNOWLEDGE_BASE',
  NULL,
  'MEDIUM',
  'ORGANIZATION',
  '[]',
  '["ALLOW","BLOCK_REQUEST","LOG_EVENT_ONLY"]',
  '{"defaultPermissions": ["READ"], "requireApprovalForPublish": true, "allowDepartmentIsolation": true}',
  '[]',
  55,
  'ACTIVE',
  1,
  true,
  (SELECT "id" FROM "employees" WHERE "employeeId" = 'HAM-001' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ai_policies" WHERE "id" = 'policy-knowledge-base-default');
