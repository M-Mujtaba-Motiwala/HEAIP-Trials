# Hamdard Enterprise AI Platform (HEAIP)
### Internship Project Report
**Prepared by:** Intern (M. Mujtaba Motiwala)
**Date:** August 11, 2026
**Repository:** `M-Mujtaba-Motiwala/HEAIP-Trials`
**Stack Version:** `0.1.0`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview & Goals](#2-project-overview--goals)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Database Schema & Data Models](#5-database-schema--data-models)
6. [Core Subsystems Deep Dive](#6-core-subsystems-deep-dive)
   - 6.1 [Authentication (NextAuth v5)](#61-authentication-nextauth-v5)
   - 6.2 [dRBAC — Delegation-Based Role-Based Access Control](#62-drbac--delegation-based-role-based-access-control)
   - 6.3 [Policy Engine](#63-policy-engine)
   - 6.4 [Quota & Budget Management](#64-quota--budget-management)
   - 6.5 [AI Model Registry & Credential Vault](#65-ai-model-registry--credential-vault)
   - 6.6 [Chat & Multi-Modal AI](#66-chat--multi-modal-ai)
   - 6.7 [Video Processing Module](#67-video-processing-module)
   - 6.8 [Admin Dashboard & Analytics](#68-admin-dashboard--analytics)
   - 6.9 [Enterprise AI Modules (Agents, Workflows, KB)](#69-enterprise-ai-modules-agents-workflows-kb)
7. [API Route Inventory](#7-api-route-inventory)
8. [Environment Variables & Configuration](#8-environment-variables--configuration)
9. [Local Development Setup](#9-local-development-setup)
10. [Docker / Production Deployment](#10-docker--production-deployment)
11. [Database Seeding & Initial Data](#11-database-seeding--initial-data)
12. [Testing](#12-testing)
13. [Known Gaps & Future Work](#13-known-gaps--future-work)
14. [File Structure Reference](#14-file-structure-reference)

---

## 1. Executive Summary

The **Hamdard Enterprise AI Platform (HEAIP)** is an internal, enterprise-grade web application built for Hamdard Laboratories to give their employees governed access to state-of-the-art Large Language Models (LLMs) and AI tools. The platform enforces strict security, financial, and compliance controls to ensure AI is used responsibly within the organisation.

At the time of handover this platform delivers:

- A fully functional **multi-tenant AI chat interface** supporting OpenAI, Google Gemini, and Anthropic Claude.
- A **multi-modal feature set** including document upload (PDF/Word), image generation, and AI-powered video editing via FFmpeg.
- A comprehensive **enterprise governance layer** composed of dRBAC, a configurable policy engine, hierarchical quota/budget tracking in PKR, and a full audit trail.
- A full-featured **admin panel** with analytics dashboards, user management, department/team hierarchy management, AI model registry, credential vault, and policy management.
- A **Docker Compose** stack ready for staging or self-hosted production deployment.

The project was developed as a greenfield Next.js 16 (App Router) application using TypeScript, Prisma ORM, PostgreSQL with `pgvector`, and Tailwind CSS v4.

---

## 2. Project Overview & Goals

### Problem Statement
Hamdard Laboratories employees were using individual, uncontrolled AI accounts, leading to:
- Unbudgeted API spend with no visibility.
- Risk of confidential data (PII, financials) leaking into AI models.
- No compliance controls or audit trails.

### Platform Goals
| Goal | Status |
|---|---|
| Central, single-sign-on AI access for all employees | ✅ Implemented |
| Budget controls per department/team/user in PKR | ✅ Implemented |
| AI content policy enforcement (PII, injection, legal) | ✅ Implemented |
| Support for multiple AI providers (OpenAI, Gemini, Anthropic) | ✅ Implemented |
| Multi-modal AI: chat, document, image, video | ✅ Implemented |
| Role-based access control with delegation | ✅ Implemented |
| Comprehensive admin panel with analytics | ✅ Implemented |
| Full audit trail of all sensitive actions | ✅ Implemented |
| Docker-based deployment | ✅ Implemented |
| RAG / Knowledge Base with vector search | ⏳ Schema ready; embedding pipeline not wired |
| Email notifications | ❌ Not implemented |
| Redis-based rate limiting (runtime) | ⏳ Configured in Docker; not wired in middleware |

---

## 3. Technology Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.2.10` | Uses React Server Components + Route Handlers |
| **Language** | TypeScript | `^5` | Strict mode |
| **UI** | React | `19.2.4` | — |
| **Styling** | Tailwind CSS | `^4.3.3` | Via PostCSS; no config file (v4 style) |
| **Icons** | Lucide React | `^1.24.0` | — |
| **Charts** | Recharts | `^3.9.2` | Used in analytics dashboards |
| **ORM** | Prisma | `^7.8.0` | Uses `@prisma/adapter-pg` for connection pooling |
| **Database** | PostgreSQL 16 | via Docker | `pgvector/pgvector:pg16` image for vector support |
| **Vector ext.** | `pgvector` | — | Schema enabled; not yet used at query layer |
| **Auth** | NextAuth v5 | `^5.0.0-beta.31` | Credentials provider + `@auth/prisma-adapter` |
| **AI SDK** | Vercel AI SDK | `^7.0.22` | `ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/anthropic` |
| **OpenAI SDK** | `openai` | `^7.4.0` | Direct SDK used alongside Vercel AI SDK |
| **Password Hashing** | `bcryptjs` | `^3.0.3` | — |
| **Video Processing** | `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` | `^2.1.3` / `^1.1.0` | Bundled FFmpeg binary |
| **Markdown** | `react-markdown` + `remark-gfm` + `rehype-highlight` | `^10.1.0` | Rendered in chat |
| **Validation** | Zod | `^4.4.3` | Used in API routes |
| **Caching** | Redis 7 | via Docker | Configured; not yet consumed by middleware |
| **Containerisation** | Docker + Docker Compose | — | Multi-service: app, postgres, redis |
| **Testing** | Node.js built-in `--test` runner + `tsx` | — | Integration-style tests |
| **Linting** | ESLint | `^9` | `eslint-config-next` |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Browser / Client                           │
│   React Server Components + Client Components (Next.js)    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│              Next.js 16 App Server (Node.js)                │
│                                                             │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  App Router│  │ Route Handler│  │   Middleware       │  │
│  │  Pages &   │  │  /api/**     │  │  (auth session     │  │
│  │  Layouts   │  │  REST + SSE  │  │   + RBAC guard)    │  │
│  └────────────┘  └──────┬───────┘  └────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │              Service Layer (src/lib/)               │   │
│  │  auth.ts │ permissions.ts │ policy-engine.ts        │   │
│  │  quota.ts │ delegation.ts │ crypto.ts               │   │
│  │  policy-enforcer.ts │ video-editor.ts               │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ Prisma ORM (pg adapter)
         ┌────────────────▼────────────────┐
         │  PostgreSQL 16 + pgvector        │
         │  (Neon DB in dev / Docker in prod)│
         └─────────────────────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │  Redis 7 (Docker)               │
         │  (Caching & Rate Limiting)       │
         └─────────────────────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │  External AI Providers (HTTPS)  │
         │  OpenAI │ Google │ Anthropic    │
         └─────────────────────────────────┘
```

### Key Architectural Decisions

1. **Next.js App Router** — All pages use Server Components for data fetching by default. Client-only interactivity is isolated to `"use client"` components.
2. **Route Handlers as the API layer** — All `/api/**` routes are Next.js Route Handlers, not Express. They are called by Client Components and external consumers.
3. **Service Layer in `src/lib/`** — Business logic (auth, permissions, policies, quota) lives in plain TypeScript modules, not inside route files. This keeps routes thin and logic testable.
4. **Database via Prisma + pg adapter** — Uses the `PrismaPg` adapter for connection pooling compatibility with serverless/edge environments (e.g., Neon DB).
5. **Streaming AI responses** — Chat responses use Server-Sent Events (SSE) via `ReadableStream` returned from the `/api/chat/stream` route handler.

---

## 5. Database Schema & Data Models

The Prisma schema (`prisma/schema.prisma`) defines **28 models** across 6 logical groups.

### 5.1 Organisation Structure

| Model | Purpose | Key Fields |
|---|---|---|
| `CostCenter` | Financial cost centre | `code`, `name`, `status` |
| `Department` | Org department | `code`, `name`, `headOfDepartmentId`, budget fields (PKR) |
| `Team` | Sub-group within department | `departmentId`, `leadId`, `assignedModels` (JSON), budget fields |
| `TeamMember` | Many-to-many junction (Employee ↔ Team) | `role` (LEAD/MEMBER/OBSERVER) |
| `Employee` | Platform user / employee | `employeeId`, `email`, `password` (bcrypt), `role`, `registrationStatus` |
| `EmployeeMaster` | Reference whitelist for self-registration | `employeeId`, `companyEmail` |

### 5.2 Access Control

| Model | Purpose |
|---|---|
| `Role` | Named role with hierarchy (`parentRoleId`, `delegationLevel`) |
| `Permission` | Fine-grained permission key (`module.resource.action`) |
| `RolePermission` | Many-to-many: roles ↔ permissions |
| `UserRole` | Many-to-many: employees ↔ roles (with assigner audit) |
| `DelegationPolicy` | Defines which roles can delegate to which other roles |
| `DelegatedAssignment` | A time-bound role delegation record |

### 5.3 Quotas & Settings

| Model | Purpose |
|---|---|
| `QuotaConfig` | Hierarchical quota config (scope: ORG/DEPT/TEAM/USER) with PKR budget + token/request limits |
| `SystemSetting` | Key-value store for platform-wide settings (AI defaults, feature toggles) |
| `FeatureFlag` | Per-department/role feature toggles |
| `UiModule` | Defines sidebar navigation modules |
| `RoleModule` | Maps roles to accessible UI modules |

### 5.4 AI Models & Credentials

| Model | Purpose |
|---|---|
| `ApiCredential` | Encrypted API keys (AES-256-GCM) per provider |
| `AiModel` | AI model registry (provider, modelId, pricing, capabilities all as JSON) |
| `ModelHealthCheck` | Health check history with latency and error tracking |

### 5.5 Chat & Usage

| Model | Purpose |
|---|---|
| `ChatSession` | A conversation thread per user |
| `ActiveSession` | Tracks currently active web sessions (for concurrent session limits) |
| `Message` | Individual chat messages with token and cost tracking |
| `ChatAttachment` | File uploads linked to messages |
| `UsageLog` | Append-only cost and token usage record (source of truth for analytics) |

### 5.6 Policies & Audit

| Model | Purpose |
|---|---|
| `AiPolicy` | Policy definition with 14 categories, scope, conditions, and actions |
| `PolicyScope` | Explicit scope binding for a policy (dept, team, role, user) |
| `PolicyEvaluationLog` | Records every policy evaluation outcome |
| `AuditLog` | Immutable log of all admin/sensitive actions |

### 5.7 Enterprise AI Modules

| Model | Purpose |
|---|---|
| `Agent` | AI agent definition (model, system prompt, temperature) |
| `Workflow` | Multi-agent workflow |
| `WorkflowStep` | Ordered steps within a workflow |
| `KnowledgeBase` | RAG knowledge base container |
| `Document` | Documents within a knowledge base |
| `PromptTemplate` | Reusable prompt templates with variable support |

### Entity Relationship Summary

```
CostCenter ──< Department ──< Team ──< Employee
                                          │
                          UserRole >──────┤
                          DelegatedAssignment >──< Role >──< Permission
                                          │
                          ChatSession ──< Message ──< ChatAttachment
                                          │
                          UsageLog >──────┘
                          AuditLog >──────┘
                          PolicyEvaluationLog >────< AiPolicy
```

---

## 6. Core Subsystems Deep Dive

### 6.1 Authentication (NextAuth v5)

**File:** [`src/lib/auth.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/auth.ts)

- Uses **NextAuth v5** with the **Credentials provider** (email/password or employeeId/password).
- Password comparison uses `bcryptjs` with cost factor 10.
- On successful credential validation, the following checks run **before** issuing a session:
  1. `isActive` flag check — deactivated accounts are rejected.
  2. `registrationStatus` check — `PENDING` and `REJECTED` accounts are blocked.
  3. **Policy enforcement** — `enforceLogin()` is called to run all `LOGIN` context policies.
  4. **dRBAC permission profile** — resolved and embedded into the JWT session token.
- The JWT session payload contains: `id`, `email`, `employeeId`, `role`, `department`, `designation`, `permissions[]`, `roles[]`.

**Auth Config:** [`src/lib/auth.config.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/auth.config.ts) — defines protected route patterns and session callbacks that enrich the JWT with role/permission data.

---

### 6.2 dRBAC — Delegation-Based Role-Based Access Control

**Files:** [`src/lib/permissions.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/permissions.ts), [`src/lib/delegation.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/delegation.ts)

#### Permission Resolution (`permissions.ts`)

The function `getUserPermissionProfile(userId)` resolves a user's effective permissions by:
1. Fetching their **direct `UserRole` assignments**.
2. Fetching all **active `DelegatedAssignment`** records where they are the target.
3. **Recursively traversing the role hierarchy** (via `parentRoleId`) to inherit parent role permissions.
4. Collecting all `Permission.permissionKey` values from all resolved roles into a `Set<string>`.

The returned `UserPermissionProfile` contains `roles[]`, `delegatedRoles[]`, and `permissions: Set<string>`.

#### Role Hierarchy

Roles have a `delegationLevel` integer that determines authority. The pre-seeded hierarchy is:

```
SUPER_ADMIN (100)
    └── ADMIN (80)
            └── DEPT_MANAGER (50)
                    └── EMPLOYEE (10)
                            └── CONTRACTOR (5)
                                    └── GUEST (0)
```

#### Delegation Engine (`delegation.ts`)

Managers can temporarily assign a role to another employee using `delegateRole()`. Before creating the assignment, `canDelegate()` validates:
1. Delegator has at least one active role.
2. A `DelegationPolicy` record exists for one of the delegator's roles.
3. The policy's `maxAssignableRole.delegationLevel >= targetRole.delegationLevel`.
4. **Scope check**: If policy scope is `DEPARTMENT`, both delegator and target must be in the same department.
5. `SUPER_ADMIN` bypass: Super Admins can always delegate any role.

All delegation events are written to `AuditLog`.

---

### 6.3 Policy Engine

**Files:** [`src/lib/policy-engine.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/policy-engine.ts), [`src/lib/policy-enforcer.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/policy-enforcer.ts)

The policy system is the **single source of truth** for what any user can do on the platform. Every sensitive operation is gated through it.

#### Policy Categories (evaluation order, legal/security first)

```
1. LEGAL_COMPLIANCE
2. PROMPT_INJECTION
3. DATA_PROTECTION
4. CONTENT_MODERATION
5. CONFIDENTIALITY
6. ATTACHMENT_SECURITY
7. ACCESS_AUTHORIZATION
8. AI_MODEL_ACCESS
9. QUOTA_USAGE
10. CONVERSATION_GOVERNANCE
11. AI_RESPONSE_VALIDATION
12. KNOWLEDGE_BASE
13. AUDIT_MONITORING
14. DATA_RETENTION
```

#### Policy Context Types

A `PolicyContext` object is passed to the engine for each evaluation:

```typescript
interface PolicyContext {
  userId: string;
  userRole: string;
  departmentId?: string;
  teamId?: string;
  contextType: "MESSAGE" | "FILE_UPLOAD" | "LOGIN" | "MODEL_ACCESS"
             | "ADMIN_ACTION" | "AGENT_ACTION" | "WORKFLOW_ACTION"
             | "ANALYTICS_VIEW" | "USER_MANAGEMENT" | "KNOWLEDGE_BASE";
  metadata?: Record<string, unknown>;
}
```

#### Policy Decision Actions

A policy can produce the following actions: `BLOCK_REQUEST`, `WARN_USER`, `MASK_CONTENT`, `REDACT_PII`, `LOG_ONLY`, `ESCALATE`, `REQUIRE_APPROVAL`.

#### Policy Enforcer (`policy-enforcer.ts`)

This is a higher-level façade that calls the engine for common scenarios:
- `enforceLogin(userId)` — LOGIN context check
- `enforceChatMessage(message, userId, fileCount)` — MESSAGE + FILE_UPLOAD checks, includes PII scanning and injection detection
- `enforceModelAccess(userId, modelId)` — MODEL_ACCESS check
- `enforceAdminAction(userId, action)` — ADMIN_ACTION check

The enforcer is called within API routes and the authentication flow, never directly from the client.

---

### 6.4 Quota & Budget Management

**File:** [`src/lib/quota.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/quota.ts)

All costs are tracked and enforced in **PKR** using a conversion rate of `280 PKR/USD` (configurable via `SystemSetting`).

#### Hierarchy Resolution (`resolveQuota`)

Quotas are resolved in priority order: **User → Team → Department → Organization → Default**. The first non-null value for each field wins. Fields covered:

- `monthlyBudgetPkr`, `dailyBudgetPkr`, `yearlyBudgetPkr`
- `monthlyTokenLimit`, `dailyTokenLimit`
- `monthlyRequestLimit`, `dailyRequestLimit`
- `maxConcurrentSessions`, `monthlyUploadLimit`, `maxFileSizeBytes`
- `modelLimits` (per-model daily request and cost ceiling overrides)

#### Spend Tracking

- `getMonthlySpendPKR(employeeId)` — aggregates `UsageLog.costUsd` for current month and converts to PKR.
- `getDailySpendPKR(employeeId)` — same, but scoped to the current day.
- `getDailyRequestCount`, `getMonthlyRequestCount` — count-based quota checks.

The **Compliance API** (`/api/compliance`) performs a combined policy + quota check before each chat message is processed.

---

### 6.5 AI Model Registry & Credential Vault

**File:** [`src/lib/crypto.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/crypto.ts)

#### Credential Vault

API keys are **never stored in plaintext**. The `ApiCredential` model stores keys encrypted using:
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key derivation:** `crypto.scryptSync(CREDENTIAL_ENCRYPTION_KEY, 'hamdard-salt', 32)` — 32-byte key from environment variable.
- **Format stored:** `${iv_hex}:${auth_tag_hex}:${ciphertext_hex}`

The `CREDENTIAL_ENCRYPTION_KEY` env variable must be set to a 32+ character secret. A display alias (last 4 chars visible) is stored separately for the admin UI.

#### AI Model Registry

The `AiModel` model stores all AI models as configurable records:
- `capabilitiesJson` — object: `{ supportsStreaming, supportsVision, supportsFiles, maxContextTokens, ... }`
- `pricingJson` — object: `{ inputCostPer1K, outputCostPer1K, imageCost, audioCost }`
- `policyJson` — object: `{ allowedDepartments[], allowedTeams[], allowedRoles[], costLimits, dailyLimits }`
- `healthStatus` — HEALTHY / DEGRADED / DOWN / UNKNOWN, updated by health check polls.

Supported providers: `openai`, `anthropic`, `google`, `azure`, `ollama`, `huggingface`, `together`, `custom`.

---

### 6.6 Chat & Multi-Modal AI

**Main Chat Page:** `src/app/chat/page.tsx` (~62KB — monolithic Client Component)

#### Chat Features
- **Session management** — conversations are stored in `ChatSession` + `Message` models. Sessions can be archived.
- **Model selection** — user can switch between any model enabled for their role/department.
- **Streaming responses** — the `/api/chat/stream` route handler returns an SSE stream. The `use-admin-stats-stream.ts` utility provides a React hook for consuming SSE.
- **Markdown rendering** — assistant messages are rendered with `react-markdown`, `remark-gfm`, and `rehype-highlight` for syntax highlighting.
- **Document upload** — PDFs and Word documents can be uploaded via `/api/chat/upload`. Files are stored as `ChatAttachment` records and their text content is extracted and injected into the AI context.
- **Image generation** — `/api/chat/image` handles DALL-E / Imagen generation requests.
- **Video editing** — natural language video edit requests are routed to the video editing pipeline.
- **Compliance pre-check** — the frontend calls `/api/compliance` before sending each message to do a policy + quota gate.

#### Chat API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/chat/stream` | POST | Stream AI response (SSE) |
| `/api/chat/sessions` | GET/POST | List or create chat sessions |
| `/api/chat/sessions/[id]` | GET/PATCH/DELETE | Manage a single session |
| `/api/chat/upload` | POST | Upload file attachment |
| `/api/chat/attachments` | GET | List attachments |
| `/api/chat/models` | GET | Get available AI models |
| `/api/chat/image` | POST | Image generation |
| `/api/chat/video` | POST | AI video editing |
| `/api/compliance` | POST | Pre-message policy + quota check |

---

### 6.7 Video Processing Module

**Files:** [`src/lib/video-editor.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/video-editor.ts), [`src/lib/video-parser.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/src/lib/video-parser.ts)

The video module allows users to describe edits in natural language and have FFmpeg execute them.

#### Pipeline
1. **Parse** — `video-parser.ts` uses an LLM call to convert the user's natural language instruction into a structured `VideoEditPlan` JSON object containing an array of operations.
2. **Validate** — `validateClipPath()` in `video-editor.ts` applies a strict allow-list regex (`/^[a-zA-Z0-9_\-]+\.(mp4|webm|mov|avi|mpeg)$/`) and resolves paths only to `public/clips/` to prevent path traversal attacks.
3. **Process** — `processVideo()` builds an FFmpeg `filtergraph` dynamically for the requested operations and executes it.

#### Supported Operations
- `trim` — keep a time range
- `cut_out` — remove a time range (and concatenate the surrounding parts)
- `speed_change` — adjust playback rate
- `add_text` — overlay text at a position
- `merge` — concatenate multiple clips (security-validated paths only)
- `resize` — scale output resolution

---

### 6.8 Admin Dashboard & Analytics

**Admin Page:** `src/app/admin/page.tsx` (~223KB — large monolithic Client Component)

The admin panel is a single-page application rendered inside the admin layout. It uses a **sidebar navigation** with role-gated sections.

#### Admin Sections

| Section | Key Functionality |
|---|---|
| **Dashboard** | Real-time org stats (users, departments, models, policies, spending summary) via streaming SSE (`/api/admin/analytics`) |
| **Users** | CRUD employees, approve/reject registrations, reset passwords, assign roles |
| **Departments** | Create/edit departments, assign HOD, set budgets |
| **Teams** | Create/edit teams, assign leads and members |
| **Cost Centers** | Manage financial cost centre mapping |
| **Roles** | View roles and their permission sets |
| **Permissions** | View fine-grained permission catalogue |
| **Delegation** | Create/revoke delegation assignments |
| **Policies** | Full CRUD for AI policies; configure scope, conditions, severity, actions |
| **Models** | AI model registry management (enable/disable, edit pricing) |
| **Credentials** | Encrypted API credential vault (add, test, rotate keys) |
| **Quotas** | Configure hierarchical quota configs |
| **Analytics** | Token usage, cost trends by department/model (Recharts bar/line charts) |
| **Audit Log** | Searchable, paginated audit trail |
| **Workflows** | AI workflow builder (agents, steps) |
| **Agents** | AI agent definition management |
| **Knowledge Bases** | KB management with document listing |
| **Prompt Templates** | Reusable prompt template library |
| **Feature Flags** | Toggle features per department or role |
| **Settings** | System-wide settings (PKR rate, quota defaults, auth settings) |
| **Onboarding** | Setup wizard for first-time configuration |

#### Analytics Streaming

The admin dashboard uses a real-time SSE connection to `/api/admin/analytics` implemented via the `use-admin-stats-stream.ts` hook. This pushes live usage stats without page refresh.

---

### 6.9 Enterprise AI Modules (Agents, Workflows, KB)

These modules have **full database schema** and **admin UI** implemented, but the **runtime execution engines** are stubs or unconnected.

| Module | Schema | Admin UI | Runtime Engine |
|---|---|---|---|
| AI Agents | ✅ `Agent` model | ✅ Full CRUD | ⏳ Stub (not connected to AI calls) |
| Workflows | ✅ `Workflow` + `WorkflowStep` | ✅ Full CRUD | ❌ Not implemented |
| Knowledge Bases | ✅ `KnowledgeBase` + `Document` | ✅ Full CRUD | ❌ Embeddings not generated; vector search not wired |
| Prompt Templates | ✅ `PromptTemplate` | ✅ Full CRUD | ❌ Not injected into chat flow |

> **These are the primary areas for future development.**

---

## 7. API Route Inventory

All routes live under `src/app/api/`. All are authenticated (require valid NextAuth session) unless noted.

### Chat APIs (`/api/chat/`)

| Route | Method | Auth Required | Description |
|---|---|---|---|
| `/api/chat/stream` | POST | ✅ | Stream AI response via SSE |
| `/api/chat/sessions` | GET | ✅ | List user's chat sessions |
| `/api/chat/sessions` | POST | ✅ | Create new chat session |
| `/api/chat/sessions/[id]` | GET | ✅ | Get session messages |
| `/api/chat/sessions/[id]` | PATCH | ✅ | Update session (title, archive) |
| `/api/chat/sessions/[id]` | DELETE | ✅ | Delete session |
| `/api/chat/archive` | GET | ✅ | List archived sessions |
| `/api/chat/models` | GET | ✅ | List available AI models |
| `/api/chat/upload` | POST | ✅ | Upload file attachment |
| `/api/chat/attachments` | GET | ✅ | List session attachments |
| `/api/chat/image` | POST | ✅ | Generate image via DALL-E |
| `/api/chat/video` | POST | ✅ | AI video editing request |
| `/api/compliance` | POST | ✅ | Policy + quota pre-check |

### Auth APIs (`/api/auth/`)

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth v5 handlers (sign-in, sign-out, session) |
| `/api/auth/session-ping` | GET | Heartbeat to keep session alive |

### Admin APIs (`/api/admin/`) — require `ADMIN` or `SUPER_ADMIN` role

| Route | Description |
|---|---|
| `/api/admin/analytics` | SSE stream of org-wide AI usage stats |
| `/api/admin/agents` | Agent CRUD |
| `/api/admin/audit` | Audit log query |
| `/api/admin/cost-centers` | Cost centre CRUD |
| `/api/admin/credentials` | API credential vault CRUD |
| `/api/admin/delegation` | Delegation CRUD |
| `/api/admin/departments` | Department CRUD |
| `/api/admin/feature-flags` | Feature flag management |
| `/api/admin/models` | AI model registry CRUD |
| `/api/admin/onboarding` | First-run setup wizard |
| `/api/admin/permissions` | Permission query |
| `/api/admin/policies` | AI policy CRUD |
| `/api/admin/quotas` | Quota config CRUD |
| `/api/admin/roles` | Role management |
| `/api/admin/settings` | System settings update |
| `/api/admin/teams` | Team CRUD |
| `/api/admin/users` | User management |
| `/api/admin/workflows` | Workflow CRUD |

### Quota API (`/api/quota/`)

| Route | Description |
|---|---|
| `/api/quota` | Get current user's quota and spend |

---

## 8. Environment Variables & Configuration

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `AUTH_SECRET` | NextAuth JWT signing secret (32+ hex chars) | `openssl rand -hex 32` |
| `NEXTAUTH_URL` | Public URL of the app | `http://localhost:3000` |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256 key for API key encryption (32+ chars) | `openssl rand -hex 32` |

### Optional Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key (used for test scripts) | — |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `POSTGRES_USER` | Docker Compose PostgreSQL user | `postgres` |
| `POSTGRES_PASSWORD` | Docker Compose PostgreSQL password | `changeme` |
| `POSTGRES_DB` | Docker Compose database name | `hamdard_ai` |

> [!CAUTION]
> The `.env.local` file checked into the repository contains a real OpenAI API key and a Neon DB connection string. **These credentials must be rotated immediately before the repository is shared or made public.**

### Environment Files

| File | Purpose |
|---|---|
| `.env.local` | Local development secrets (not committed in production) |
| `.env.compose.example` | Template for Docker Compose deployment |
| `.env` | Minimal fallback (currently contains placeholder values) |

---

## 9. Local Development Setup

### Prerequisites
- Node.js 20+
- A PostgreSQL 16 database (local, Docker, or managed — e.g., [Neon](https://neon.tech))
- npm

### Step-by-Step

```bash
# 1. Clone the repository
git clone <repo-url>
cd hamdard-ai-platform

# 2. Install dependencies
npm install

# 3. Configure environment
#    Copy .env.compose.example to .env.local and fill in:
#    - DATABASE_URL (your PostgreSQL connection string)
#    - AUTH_SECRET (run: openssl rand -hex 32)
#    - CREDENTIAL_ENCRYPTION_KEY (run: openssl rand -hex 32)

# 4. Generate the Prisma client
npx prisma generate

# 5. Apply database migrations
npx prisma migrate dev

# 6. Seed the database (departments, roles, permissions, seed users)
npx prisma db seed

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Seeded Accounts

After `prisma db seed`, the following accounts are created with password `Password123!`:

| Email | Role | Department |
|---|---|---|
| `superadmin@hamdard.com` | SUPER_ADMIN | Executive Office |
| `admin@hamdard.com` | ADMIN | IT Department |
| `manager@hamdard.com` | DEPT_MANAGER | Finance & Accounts |
| `employee@hamdard.com` | EMPLOYEE | HR |
| `contractor@hamdard.com` | CONTRACTOR | IT Department |
| `guest@hamdard.com` | GUEST | Marketing |

---

## 10. Docker / Production Deployment

The full stack (app + PostgreSQL + Redis) can be run with Docker Compose.

### Services

| Service | Image | Port | Purpose |
|---|---|---|---|
| `app` | Built from `Dockerfile` | 3000 | Next.js application |
| `postgres` | `pgvector/pgvector:pg16` | 5432 | Database (with pgvector) |
| `redis` | `redis:7-alpine` | 6379 | Cache & rate limiting |

### Deployment Steps

```bash
# 1. Copy and fill the compose environment file
cp .env.compose.example .env.compose
# Edit .env.compose with production secrets

# 2. Build and start all services
docker compose --env-file .env.compose up -d --build

# 3. Run migrations inside the running container
docker compose exec app npx prisma migrate deploy

# 4. Seed the database (first-time only)
docker compose exec app npx prisma db seed
```

### Dockerfile Summary

The `Dockerfile` uses a **multi-stage build**:
1. **deps** stage — installs `node_modules` with `npm ci`.
2. **builder** stage — runs `next build`.
3. **runner** stage — minimal Node 20 Alpine image, copies only the built output. Runs as non-root user `nextjs`.

### Production Checklist

- [ ] Set strong `POSTGRES_PASSWORD` (not `changeme`)
- [ ] Generate new `AUTH_SECRET` with `openssl rand -hex 32`
- [ ] Generate new `CREDENTIAL_ENCRYPTION_KEY` with `openssl rand -hex 32`
- [ ] Set `NEXTAUTH_URL` to the public domain
- [ ] Place the app behind a reverse proxy (Nginx/Caddy) with TLS
- [ ] Enable PostgreSQL backup schedule
- [ ] Rotate the Neon DB credentials currently in `.env.local`
- [ ] Rotate the OpenAI API key currently in `.env.local`

---

## 11. Database Seeding & Initial Data

**File:** [`prisma/seed.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/prisma/seed.ts)

The seed script is idempotent (uses `upsert` for most records). It creates:

- **10 Departments:** Executive Office, IT, Marketing, Finance & Accounts, HR, Supply Chain, Production, QA, R&D, Sales.
- **6 Roles** with delegation levels: SUPER_ADMIN (100), ADMIN (80), DEPT_MANAGER (50), EMPLOYEE (10), CONTRACTOR (5), GUEST (0).
- **~45 Permissions** across modules: dashboard, users, registration, drbac, delegation, analytics, costs, policies, audit, settings, chat, departments, teams, agents, workflows, prompts, knowledge, models.
- **1 Delegation Policy** — DEPT_MANAGER can delegate up to EMPLOYEE level within same department.
- **6 Employee accounts** (one per role), all with password `Password123!`.
- **System Settings** — default monthly quota PKR, AI settings.
- **AI Model Registry** — seeded via [`prisma/seed-models.ts`](file:///c:/Users/Intern/.gemini/antigravity/scratch/hamdard-ai-platform/prisma/seed-models.ts).
- **1 Sample AI Policy** — a demo prompt injection detection policy.

---

## 12. Testing

### Test Files (`tests/`)

| File | Description |
|---|---|
| `new-chat.test.ts` | Integration test for creating a new chat session (Node.js `--test`) |
| `video-editor.test.ts` | Unit tests for the video editor path validator |
| `test-db.ts` | Manual DB connectivity and query test script |
| `get-session.ts` | Manual script to fetch and print a session |
| `list-models.ts` | Manual script to list available AI models from DB |
| `run-post.ts` | Manual HTTP POST test runner |
| `test-openrouter.ts` | Manual OpenRouter API connectivity test |
| `check-client.mjs` | Prisma client check utility |

### Running Tests

```bash
# Run the automated test suite
npm test
# (runs: tsx --test tests/new-chat.test.ts)
```

> [!NOTE]
> The current test suite is minimal. Most test files are manual developer scripts rather than automated assertions. Expanding the test coverage (unit tests for policy-engine.ts, permissions.ts, quota.ts, and E2E tests for auth flows) is a high-priority item for future work.

---

## 13. Known Gaps & Future Work

### High Priority

| Item | Description |
|---|---|
| **RAG / Vector Search** | `pgvector` is enabled and the `KnowledgeBase`/`Document` schema is ready. The missing piece is: (1) a document embedding pipeline that calls an embedding model and stores vectors, (2) a vector similarity search query at chat time to retrieve relevant context. |
| **Workflow Execution Engine** | The `Workflow` + `WorkflowStep` schema and admin UI are complete. The runtime engine that chains agents and executes steps sequentially (or in parallel) needs to be built. |
| **Redis Rate Limiting Middleware** | Redis is deployed in Docker. The missing piece is a Next.js middleware (or route-level guard) that actually calls Redis to enforce per-user/per-IP rate limits. |
| **Email Notifications** | No email system exists. Registration approvals, quota warnings, and delegation notifications are silent. An SMTP integration (e.g., Nodemailer + SendGrid) is needed. |
| **Agent Runtime** | Agents are defined in the DB but the `/api/admin/agents` route doesn't yet connect them to actual AI calls with their system prompts. |
| **Prompt Template Injection** | Templates are stored but not surfaced in the chat UI or injected into system prompts. |

### Medium Priority

| Item | Description |
|---|---|
| **Page-level Code Splitting** | `admin/page.tsx` (~223KB) and `chat/page.tsx` (~62KB) are monolithic Client Components. They should be broken into smaller components to reduce bundle size and improve maintainability. |
| **Comprehensive Test Suite** | Unit tests for all service layer functions and E2E tests (e.g., using Playwright) for critical flows. |
| **Token-based Quota Pre-estimation** | The chat stream starts before quota is definitively checked. A pre-estimation should block the request before streaming if quota is nearly exceeded. |
| **Model Health Check Polling** | The `ModelHealthCheck` model and `AiModel.healthStatus` field exist. A background cron job or scheduled route to periodically ping models and update their status is missing. |
| **Concurrent Session Enforcement** | `ActiveSession` model and `maxConcurrentSessions` quota field exist. The middleware to enforce the concurrent limit is not implemented. |
| **File Storage** | Uploaded files are stored as metadata records in `ChatAttachment` but the actual file bytes are currently handled in-memory. For production, integrate an S3-compatible store (e.g., MinIO, AWS S3, Cloudflare R2). |

### Low Priority / Polish

| Item | Description |
|---|---|
| Pagination for all admin list views | Currently some lists load all records. |
| SSO / SAML integration | For enterprise SSO via Active Directory or Google Workspace. |
| Mobile responsive design | Current UI is designed for desktop. |
| Dark mode | `ThemeToggle.tsx` component exists but dark mode CSS may be incomplete. |
| Internationalisation (i18n) | Currently English only. |

---

## 14. File Structure Reference

```
hamdard-ai-platform/
├── prisma/
│   ├── schema.prisma           # Database schema (28 models)
│   ├── seed.ts                 # Database seed script
│   ├── seed-models.ts          # AI model registry seed
│   └── migrations/             # Migration history
├── public/
│   └── clips/                  # Safe directory for video clips (server-side)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (fonts, providers)
│   │   ├── page.tsx            # Root redirect (→ /chat or /login)
│   │   ├── globals.css         # Global Tailwind + custom CSS
│   │   ├── login/              # Login page
│   │   ├── chat/
│   │   │   ├── page.tsx        # Main chat UI (monolithic Client Component)
│   │   │   └── layout.tsx      # Chat layout (auth guard)
│   │   ├── admin/
│   │   │   ├── page.tsx        # Admin panel (monolithic Client Component)
│   │   │   └── layout.tsx      # Admin layout (role guard)
│   │   └── api/
│   │       ├── auth/           # NextAuth route handlers
│   │       ├── chat/           # Chat, upload, image, video APIs
│   │       ├── compliance/     # Policy + quota pre-check
│   │       ├── quota/          # User quota status
│   │       └── admin/          # All admin management APIs
│   ├── components/
│   │   ├── HamdardLogo.tsx     # SVG logo component
│   │   ├── ThemeToggle.tsx     # Dark/light mode toggle
│   │   └── providers/          # React context providers (NextAuth SessionProvider, etc.)
│   ├── lib/
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── auth.config.ts      # Auth callbacks and route protection
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── permissions.ts      # dRBAC permission resolution
│   │   ├── delegation.ts       # Role delegation engine
│   │   ├── policy-engine.ts    # Core policy evaluation engine
│   │   ├── policy-enforcer.ts  # High-level policy enforcement façade
│   │   ├── quota.ts            # Hierarchical quota resolution
│   │   ├── crypto.ts           # AES-256-GCM encryption utilities
│   │   ├── api-guard.ts        # Route-level auth/role guard helper
│   │   ├── video-editor.ts     # FFmpeg video processing
│   │   ├── video-parser.ts     # LLM-based video instruction parser
│   │   └── use-admin-stats-stream.ts  # SSE React hook for analytics
│   ├── types/                  # Shared TypeScript type definitions
│   └── proxy.ts                # OpenAI proxy configuration
├── tests/                      # Test and manual script files
├── docs/                       # Architecture, ER diagram, RBAC matrix docs
├── Dockerfile                  # Multi-stage production Docker image
├── docker-compose.yml          # Full stack: app + PostgreSQL + Redis
├── next.config.ts              # Next.js configuration
├── prisma.config.ts            # Prisma config (adapter)
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and npm scripts
├── .env.local                  # Local dev secrets (DO NOT COMMIT to prod)
└── .env.compose.example        # Template for Docker secrets
```

---

*Report generated: August 11, 2026 | Platform version: 0.1.0 | Repository: M-Mujtaba-Motiwala/HEAIP-Trials*
