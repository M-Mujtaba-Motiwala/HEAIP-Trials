CREATE TABLE "employee_master" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyEmail" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_master_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_master_employeeId_key" ON "employee_master"("employeeId");
CREATE UNIQUE INDEX "employee_master_companyEmail_key" ON "employee_master"("companyEmail");
CREATE UNIQUE INDEX "employee_master_employeeId_companyEmail_key" ON "employee_master"("employeeId", "companyEmail");

CREATE TABLE "ai_models" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_models_provider_modelId_key" ON "ai_models"("provider", "modelId");
CREATE INDEX "ai_models_enabled_isDefault_idx" ON "ai_models"("enabled", "isDefault");

CREATE TABLE "chat_attachments" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "messageId" TEXT,
  "uploadedById" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chat_attachments_storageKey_key" ON "chat_attachments"("storageKey");
CREATE INDEX "chat_attachments_sessionId_idx" ON "chat_attachments"("sessionId");
CREATE INDEX "chat_attachments_messageId_idx" ON "chat_attachments"("messageId");
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
