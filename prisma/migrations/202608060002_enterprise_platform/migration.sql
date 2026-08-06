-- Enterprise Platform Migration
-- Adds: CostCenter, ApiCredential, enhanced AiModel, TeamMember, QuotaConfig, ModelHealthCheck
-- Enhances: Department (budget/quota/costCenter), Team (budget/quota/lead/costCenter)

-- ─── Cost Centers ──────────────────────────────────────────────────────────
CREATE TABLE "cost_centers" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cost_centers_code_key" ON "cost_centers"("code");
CREATE UNIQUE INDEX "cost_centers_name_key" ON "cost_centers"("name");

-- ─── API Credentials ───────────────────────────────────────────────────────
CREATE TABLE "api_credentials" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "apiKeyEncrypted" TEXT NOT NULL,
  "apiKeyAlias" TEXT NOT NULL,
  "baseUrl" TEXT,
  "authType" TEXT NOT NULL DEFAULT 'api_key',
  "organizationId" TEXT,
  "projectId" TEXT,
  "region" TEXT,
  "apiVersion" TEXT,
  "customHeaders" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastTestedAt" TIMESTAMP(3),
  "lastTestResult" TEXT,
  "lastRotatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_credentials_provider_apiKeyAlias_key" ON "api_credentials"("provider", "apiKeyAlias");
CREATE INDEX "api_credentials_provider_idx" ON "api_credentials"("provider");
CREATE INDEX "api_credentials_status_idx" ON "api_credentials"("status");

-- ─── Model Health Checks ───────────────────────────────────────────────────
CREATE TABLE "model_health_checks" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "credentialId" TEXT,
  "status" TEXT NOT NULL,
  "latencyMs" INTEGER,
  "error" TEXT,
  "details" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "model_health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "model_health_checks_modelId_idx" ON "model_health_checks"("modelId");
CREATE INDEX "model_health_checks_status_idx" ON "model_health_checks"("status");
CREATE INDEX "model_health_checks_createdAt_idx" ON "model_health_checks"("createdAt");

-- ─── Team Members (many-to-many) ───────────────────────────────────────────
CREATE TABLE "team_members" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_members_teamId_employeeId_key" ON "team_members"("teamId", "employeeId");
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");
CREATE INDEX "team_members_employeeId_idx" ON "team_members"("employeeId");

-- ─── Quota Configurations ──────────────────────────────────────────────────
CREATE TABLE "quota_configs" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "scopeTargetId" TEXT,
  "monthlyBudgetPkr" DOUBLE PRECISION,
  "dailyBudgetPkr" DOUBLE PRECISION,
  "yearlyBudgetPkr" DOUBLE PRECISION,
  "monthlyTokenLimit" INTEGER,
  "dailyTokenLimit" INTEGER,
  "monthlyRequestLimit" INTEGER,
  "dailyRequestLimit" INTEGER,
  "maxConcurrentSessions" INTEGER,
  "monthlyUploadLimit" INTEGER,
  "maxFileSizeBytes" INTEGER,
  "modelLimitsJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "effectiveAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quota_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quota_configs_scope_scopeTargetId_key" ON "quota_configs"("scope", "scopeTargetId");
CREATE INDEX "quota_configs_scope_idx" ON "quota_configs"("scope");

-- ─── Enhance Departments ───────────────────────────────────────────────────
ALTER TABLE "departments" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "departments" ADD COLUMN "monthlyBudgetPkr" DOUBLE PRECISION;
ALTER TABLE "departments" ADD COLUMN "dailyBudgetPkr" DOUBLE PRECISION;
ALTER TABLE "departments" ADD COLUMN "yearlyBudgetPkr" DOUBLE PRECISION;
ALTER TABLE "departments" ADD COLUMN "monthlyTokenLimit" INTEGER;
ALTER TABLE "departments" ADD COLUMN "monthlyRequestLimit" INTEGER;
ALTER TABLE "departments" ADD CONSTRAINT "departments_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Enhance Teams ─────────────────────────────────────────────────────────
ALTER TABLE "teams" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "teams" ADD COLUMN "leadId" TEXT;
ALTER TABLE "teams" ADD COLUMN "monthlyBudgetPkr" DOUBLE PRECISION;
ALTER TABLE "teams" ADD COLUMN "monthlyTokenLimit" INTEGER;
ALTER TABLE "teams" ADD COLUMN "monthlyRequestLimit" INTEGER;
ALTER TABLE "teams" ADD COLUMN "maxConcurrentSessions" INTEGER;
ALTER TABLE "teams" ADD COLUMN "assignedModels" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "teams" ADD CONSTRAINT "teams_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Enhance Employees (team memberships) ─────────────────────────────────
-- Add relation for team lead (handled by Prisma, no SQL needed)
-- Add relation for team memberships (handled by Prisma, no SQL needed)

-- ─── Enhance AI Models ─────────────────────────────────────────────────────
ALTER TABLE "ai_models" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Chat';
ALTER TABLE "ai_models" ADD COLUMN "version" TEXT;
ALTER TABLE "ai_models" ADD COLUMN "description" TEXT;
ALTER TABLE "ai_models" ADD COLUMN "capabilitiesJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ai_models" ADD COLUMN "limitsJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ai_models" ADD COLUMN "pricingJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ai_models" ADD COLUMN "policyJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ai_models" ADD COLUMN "credentialId" TEXT;
ALTER TABLE "ai_models" ADD COLUMN "healthStatus" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "ai_models" ADD COLUMN "lastHealthCheck" TIMESTAMP(3);
ALTER TABLE "ai_models" ADD COLUMN "totalRequests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_models" ADD COLUMN "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ai_models" ADD INDEX "ai_models_category_idx"("category");
ALTER TABLE "ai_models" ADD INDEX "ai_models_credentialId_idx"("credentialId");
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "api_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Seed default cost center ──────────────────────────────────────────────
INSERT INTO "cost_centers" ("id", "code", "name", "description", "status", "createdAt", "updatedAt")
VALUES ('cc-default', 'DEFAULT', 'Default Cost Center', 'Organization-wide cost center', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- ─── Seed default org quota ────────────────────────────────────────────────
INSERT INTO "quota_configs" ("id", "scope", "scopeTargetId", "monthlyBudgetPkr", "status", "createdAt", "updatedAt")
VALUES ('quota-org-default', 'ORGANIZATION', NULL, 15000, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("scope", "scopeTargetId") DO NOTHING;
