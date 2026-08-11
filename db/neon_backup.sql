--
-- PostgreSQL database dump
--

\restrict uhaSF6ck2dlohz7vmgmHNGVuGRzL0ZxADfOnSui27G6mlBPGqN9MLrrGGfWerZm

-- Dumped from database version 18.4 (be2730e)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: active_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.active_sessions (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "sessionToken" text NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.active_sessions OWNER TO neondb_owner;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agents (
    id text NOT NULL,
    name text NOT NULL,
    model text NOT NULL,
    temp double precision DEFAULT 0.7 NOT NULL,
    "systemPrompt" text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.agents OWNER TO neondb_owner;

--
-- Name: ai_models; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_models (
    id text NOT NULL,
    provider text NOT NULL,
    "modelId" text NOT NULL,
    "displayName" text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    category text DEFAULT 'Chat'::text NOT NULL,
    version text,
    description text,
    "capabilitiesJson" text DEFAULT '{}'::text NOT NULL,
    "limitsJson" text DEFAULT '{}'::text NOT NULL,
    "pricingJson" text DEFAULT '{}'::text NOT NULL,
    "policyJson" text DEFAULT '{}'::text NOT NULL,
    "metadataJson" text DEFAULT '{}'::text NOT NULL,
    "credentialId" text,
    "healthStatus" text DEFAULT 'UNKNOWN'::text NOT NULL,
    "lastHealthCheck" timestamp(3) without time zone,
    "totalRequests" integer DEFAULT 0 NOT NULL,
    "totalCostUsd" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ai_models OWNER TO neondb_owner;

--
-- Name: ai_policies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_policies (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'ACCESS_AUTHORIZATION'::text NOT NULL,
    "policyType" text,
    severity text DEFAULT 'MEDIUM'::text NOT NULL,
    scope text DEFAULT 'ORGANIZATION'::text NOT NULL,
    "scopeTargets" text DEFAULT '[]'::text NOT NULL,
    actions text DEFAULT '["BLOCK_REQUEST"]'::text NOT NULL,
    conditions text DEFAULT '{}'::text NOT NULL,
    exceptions text DEFAULT '[]'::text NOT NULL,
    priority integer DEFAULT 50 NOT NULL,
    "effectiveAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ai_policies OWNER TO neondb_owner;

--
-- Name: api_credentials; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.api_credentials (
    id text NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    "apiKeyEncrypted" text NOT NULL,
    "apiKeyAlias" text NOT NULL,
    "baseUrl" text,
    "authType" text DEFAULT 'api_key'::text NOT NULL,
    "organizationId" text,
    "projectId" text,
    region text,
    "apiVersion" text,
    "customHeaders" text DEFAULT '{}'::text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "lastTestedAt" timestamp(3) without time zone,
    "lastTestResult" text,
    "lastRotatedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.api_credentials OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "actorId" text NOT NULL,
    action text NOT NULL,
    resource text NOT NULL,
    details text NOT NULL,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: chat_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chat_attachments (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "messageId" text,
    "uploadedById" text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "storageKey" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_attachments OWNER TO neondb_owner;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chat_sessions (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    title text DEFAULT 'New Chat'::text NOT NULL,
    "aiProvider" text DEFAULT 'gemini'::text NOT NULL,
    "aiModel" text DEFAULT 'gemini-2.0-flash'::text NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.chat_sessions OWNER TO neondb_owner;

--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cost_centers (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.cost_centers OWNER TO neondb_owner;

--
-- Name: delegated_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.delegated_assignments (
    id text NOT NULL,
    "delegatorId" text NOT NULL,
    "targetUserId" text NOT NULL,
    "assignedRoleId" text NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.delegated_assignments OWNER TO neondb_owner;

--
-- Name: delegation_policies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.delegation_policies (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "maxAssignableRoleId" text NOT NULL,
    scope text DEFAULT 'DEPARTMENT'::text NOT NULL,
    "canDelegate" boolean DEFAULT true NOT NULL,
    "maxDepth" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.delegation_policies OWNER TO neondb_owner;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.departments (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "headOfDepartmentId" text,
    "costCenterId" text,
    "monthlyBudgetPkr" double precision,
    "dailyBudgetPkr" double precision,
    "yearlyBudgetPkr" double precision,
    "monthlyTokenLimit" integer,
    "monthlyRequestLimit" integer
);


ALTER TABLE public.departments OWNER TO neondb_owner;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id text NOT NULL,
    "knowledgeBaseId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "metadataJson" text DEFAULT '{}'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: employee_master; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.employee_master (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "companyEmail" text NOT NULL,
    name text NOT NULL,
    department text NOT NULL,
    designation text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.employee_master OWNER TO neondb_owner;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.employees (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    department text NOT NULL,
    "departmentId" text,
    "teamId" text,
    designation text NOT NULL,
    role text DEFAULT 'EMPLOYEE'::text NOT NULL,
    "userType" text DEFAULT 'EMPLOYEE'::text NOT NULL,
    "registrationStatus" text DEFAULT 'APPROVED'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "avatarUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.employees OWNER TO neondb_owner;

--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.feature_flags (
    id text NOT NULL,
    "featureName" text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "departmentId" text,
    "roleId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.feature_flags OWNER TO neondb_owner;

--
-- Name: knowledge_bases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.knowledge_bases (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'Active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.knowledge_bases OWNER TO neondb_owner;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "tokensUsed" integer DEFAULT 0 NOT NULL,
    "costUsd" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: model_health_checks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.model_health_checks (
    id text NOT NULL,
    "modelId" text NOT NULL,
    "credentialId" text,
    status text NOT NULL,
    "latencyMs" integer,
    error text,
    details text DEFAULT '{}'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.model_health_checks OWNER TO neondb_owner;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    module text NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    "permissionKey" text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permissions OWNER TO neondb_owner;

--
-- Name: policy_evaluation_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.policy_evaluation_logs (
    id text NOT NULL,
    "policyId" text NOT NULL,
    "employeeId" text NOT NULL,
    "contextType" text NOT NULL,
    "contextJson" text DEFAULT '{}'::text NOT NULL,
    decision text NOT NULL,
    details text DEFAULT '{}'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.policy_evaluation_logs OWNER TO neondb_owner;

--
-- Name: policy_scopes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.policy_scopes (
    id text NOT NULL,
    "policyId" text NOT NULL,
    "scopeType" text NOT NULL,
    "targetId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.policy_scopes OWNER TO neondb_owner;

--
-- Name: prompt_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prompt_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    content text NOT NULL,
    variables text DEFAULT '[]'::text NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.prompt_templates OWNER TO neondb_owner;

--
-- Name: quota_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quota_configs (
    id text NOT NULL,
    scope text NOT NULL,
    "scopeTargetId" text,
    "monthlyBudgetPkr" double precision,
    "dailyBudgetPkr" double precision,
    "yearlyBudgetPkr" double precision,
    "monthlyTokenLimit" integer,
    "dailyTokenLimit" integer,
    "monthlyRequestLimit" integer,
    "dailyRequestLimit" integer,
    "maxConcurrentSessions" integer,
    "monthlyUploadLimit" integer,
    "maxFileSizeBytes" integer,
    "modelLimitsJson" text DEFAULT '{}'::text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "effectiveAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.quota_configs OWNER TO neondb_owner;

--
-- Name: role_modules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.role_modules (
    "roleId" text NOT NULL,
    "moduleId" text NOT NULL
);


ALTER TABLE public.role_modules OWNER TO neondb_owner;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.role_permissions (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO neondb_owner;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "parentRoleId" text,
    "delegationLevel" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.system_settings (
    id text NOT NULL,
    category text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO neondb_owner;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.team_members (
    id text NOT NULL,
    "teamId" text NOT NULL,
    "employeeId" text NOT NULL,
    role text DEFAULT 'MEMBER'::text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.team_members OWNER TO neondb_owner;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.teams (
    id text NOT NULL,
    name text NOT NULL,
    "departmentId" text NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "costCenterId" text,
    "leadId" text,
    "monthlyBudgetPkr" double precision,
    "monthlyTokenLimit" integer,
    "monthlyRequestLimit" integer,
    "maxConcurrentSessions" integer,
    "assignedModels" text DEFAULT '[]'::text NOT NULL
);


ALTER TABLE public.teams OWNER TO neondb_owner;

--
-- Name: ui_modules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ui_modules (
    id text NOT NULL,
    "moduleName" text NOT NULL,
    route text NOT NULL,
    icon text NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.ui_modules OWNER TO neondb_owner;

--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.usage_logs (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "aiProvider" text NOT NULL,
    "aiModel" text NOT NULL,
    "tokensInput" integer NOT NULL,
    "tokensOutput" integer NOT NULL,
    "costUsd" double precision NOT NULL,
    department text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usage_logs OWNER TO neondb_owner;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_roles (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "assignedById" text,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_roles OWNER TO neondb_owner;

--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workflow_steps (
    id text NOT NULL,
    "workflowId" text NOT NULL,
    name text NOT NULL,
    "orderIndex" integer NOT NULL,
    "agentId" text,
    "configJson" text DEFAULT '{}'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.workflow_steps OWNER TO neondb_owner;

--
-- Name: workflows; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workflows (
    id text NOT NULL,
    name text NOT NULL,
    agents integer DEFAULT 1 NOT NULL,
    description text,
    status text DEFAULT 'Draft'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.workflows OWNER TO neondb_owner;

--
-- Data for Name: active_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.active_sessions (id, "employeeId", "sessionToken", "lastActiveAt", "createdAt") FROM stdin;
53dcc1ef-cd79-4ad3-ad5b-5b3dadeaf2e9	678dfb75-5040-4ad2-8348-b690cf718faa	3f86bd94-f20e-4979-b347-653cbfd9fba6	2026-08-10 12:28:33.03	2026-08-10 07:37:26.466
\.


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agents (id, name, model, temp, "systemPrompt", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ai_models; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_models (id, provider, "modelId", "displayName", enabled, "isDefault", category, version, description, "capabilitiesJson", "limitsJson", "pricingJson", "policyJson", "metadataJson", "credentialId", "healthStatus", "lastHealthCheck", "totalRequests", "totalCostUsd", "createdAt", "updatedAt") FROM stdin;
648c6e6b-6ba8-49c8-8244-f4885931e329	openai	gpt-4o-mini	GPT-4o Mini	t	f	Chat	2024	Fast and affordable GPT-4o model	{"streaming":true,"vision":true,"functionCalling":true,"jsonMode":true}	{"contextWindow":128000,"maxTokensPerRequest":16384}	{"inputCostPer1K":0.15,"outputCostPer1K":0.6}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:14.739	2026-08-06 11:44:14.739
f4155988-ca7a-4e04-934e-df0378ba6ddd	openai	gpt-4-turbo	GPT-4 Turbo	t	f	Chat	2024	Previous generation GPT-4 model	{"streaming":true,"vision":false,"functionCalling":true,"jsonMode":true}	{"contextWindow":128000,"maxTokensPerRequest":4096}	{"inputCostPer1K":10,"outputCostPer1K":30}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:15.181	2026-08-06 11:44:15.181
db91922b-e50a-4fc9-803c-e62d9e6d1929	openai	o1	o1	t	f	Reasoning	2024	Advanced reasoning model for complex problems	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":200000,"maxTokensPerRequest":100000}	{"inputCostPer1K":15,"outputCostPer1K":60}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:16.065	2026-08-06 11:44:16.065
db226693-950a-4a33-8617-3862d86ff919	openai	o1-mini	o1 Mini	t	f	Reasoning	2024	Faster reasoning model for coding and math	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":128000,"maxTokensPerRequest":65536}	{"inputCostPer1K":3,"outputCostPer1K":12}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:16.506	2026-08-06 11:44:16.506
c1d1fc08-6f15-4c63-8f84-1b44a9b26b35	openai	o3-mini	o3 Mini	t	f	Reasoning	2024	Cost-effective reasoning model	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":200000,"maxTokensPerRequest":100000}	{"inputCostPer1K":1.1,"outputCostPer1K":4.4}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:16.946	2026-08-06 11:44:16.946
ff74d2ec-fe0c-4602-917b-582568866c18	openai	dall-e-3	DALL-E 3	t	f	Image	2024	AI image generation	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":0,"maxTokensPerRequest":0}	{"inputCostPer1K":0,"outputCostPer1K":0}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:17.388	2026-08-06 11:44:17.388
38ee6f49-9fa8-4408-aeb9-fffa895cbd06	openai	whisper-1	Whisper	t	f	Audio	2024	Speech-to-text transcription	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":0,"maxTokensPerRequest":0}	{"inputCostPer1K":0.006,"outputCostPer1K":0}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:17.828	2026-08-06 11:44:17.828
9d876b63-37b3-453c-9281-c6abce4b8900	openai	text-embedding-3-large	Embedding Large	t	f	Embedding	2024	High-quality text embeddings	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":8191,"maxTokensPerRequest":0}	{"inputCostPer1K":0.00013,"outputCostPer1K":0}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:18.271	2026-08-06 11:44:18.271
5e71c802-a851-48c8-93f1-7f88caa69fa2	openai	text-embedding-3-small	Embedding Small	t	f	Embedding	2024	Fast text embeddings	{"streaming":true,"vision":false,"functionCalling":false,"jsonMode":false}	{"contextWindow":8191,"maxTokensPerRequest":0}	{"inputCostPer1K":0.00002,"outputCostPer1K":0}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	0	0	2026-08-06 11:44:18.712	2026-08-06 11:44:18.712
a6ded68c-841f-4a51-8611-a83fda0511f7	openai	gpt-3.5-turbo	GPT-3.5 Turbo	t	f	Chat	2024	Fast and cost-effective for simple tasks	{"streaming":true,"vision":false,"functionCalling":true,"jsonMode":true}	{"contextWindow":16385,"maxTokensPerRequest":4096}	{"inputCostPer1K":0.5,"outputCostPer1K":1.5}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	2	0.3005	2026-08-06 11:44:15.625	2026-08-06 12:19:16.305
802635b9-c448-4864-8af9-ac4ad03c82db	openai	gpt-4o	GPT-4o	t	t	Chat	2024	Most capable GPT-4o model for complex tasks	{"streaming":true,"vision":true,"functionCalling":true,"jsonMode":true}	{"contextWindow":128000,"maxTokensPerRequest":16384}	{"inputCostPer1K":2.5,"outputCostPer1K":10}	{}	{}	8250c0d2-0941-4d94-94d0-dbf10796b880	UNKNOWN	\N	5	2.66	2026-08-06 11:44:14.291	2026-08-10 06:29:02.608
\.


--
-- Data for Name: ai_policies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_policies (id, name, description, category, "policyType", severity, scope, "scopeTargets", actions, conditions, exceptions, priority, "effectiveAt", "expiresAt", status, version, "isActive", "createdById", "updatedById", "createdAt", "updatedAt") FROM stdin;
policy-rate-limit-default	Standard Rate Limit	100 requests/hour, 5000 tokens/request.	QUOTA_USAGE	RATE_LIMIT	MEDIUM	ORGANIZATION	[]	["BLOCK_REQUEST"]	{"maxRequestsPerHour":100,"maxTokensPerRequest":5000,"cooldownMinutes":5}	[]	50	\N	\N	INACTIVE	1	f	678dfb75-5040-4ad2-8348-b690cf718faa	\N	2026-08-06 07:51:57.555	2026-08-06 11:33:39.456
\.


--
-- Data for Name: api_credentials; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.api_credentials (id, name, provider, "apiKeyEncrypted", "apiKeyAlias", "baseUrl", "authType", "organizationId", "projectId", region, "apiVersion", "customHeaders", status, "lastTestedAt", "lastTestResult", "lastRotatedAt", "expiresAt", notes, "createdAt", "updatedAt") FROM stdin;
8250c0d2-0941-4d94-94d0-dbf10796b880	OpenAI Production	openai	4a4fb8c8340f1055cfffa7d8a5154f75:87ab8e2f93756ab18301d92302eb3162:1bee474d2937088948cd604f1e5aa756e618e57b3f4c65786f97cf4b1d2a7464f6b0cc9d0da19e552d24b6e987da818c01cac5030805394d95a5423863dff63c3489a732607d8421b7cd9d667619e24213550ac7347c14a3ab0e0ee577a9a1319e89a36ff8a408edb40d76939abea817bb7bdfaf14716d27e7e3f1aae2ab3f3a1bfac8c96cbf7524458cbda0254facd280b8e9ee906f87274fe6a933518f5db5dce6d79565931c	sk-s...jIAA	\N	api_key	\N	\N	\N	\N	{}	ACTIVE	2026-08-07 10:16:46.361	HEALTHY	\N	\N	Production OpenAI API key	2026-08-06 11:44:13.827	2026-08-07 10:16:46.369
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, "actorId", action, resource, details, "ipAddress", "createdAt") FROM stdin;
a1b22107-e424-4a80-b046-ed80b4adea7f	6d21781a-a218-4548-8b2a-ff16f3eecb33	POLICY_VIOLATION	Policy:policy-rate-limit-default	{"contextType":"LOGIN","blockReason":"Blocked by policy: Standard Rate Limit","decisions":[{"policy":"Standard Rate Limit","category":"QUOTA_USAGE","action":"BLOCK_REQUEST"}]}	\N	2026-08-06 11:13:56.207
2ee68d9f-f07f-48af-bc65-468732e6515f	7de5e7de-713a-4376-8c56-428cfefd6e71	POLICY_VIOLATION	Policy:policy-rate-limit-default	{"contextType":"LOGIN","blockReason":"Blocked by policy: Standard Rate Limit","decisions":[{"policy":"Standard Rate Limit","category":"QUOTA_USAGE","action":"BLOCK_REQUEST"}]}	\N	2026-08-06 11:16:45.846
58d69643-7a44-4483-92fa-5dc88e8f5cd6	678dfb75-5040-4ad2-8348-b690cf718faa	SYSTEM_INITIALIZED	SystemSetting	{"version":"1.0.0","mode":"Enterprise dRBAC"}	127.0.0.1	2026-08-07 06:26:47.578
cf272b52-38e0-422a-bcef-cc7224594389	678dfb75-5040-4ad2-8348-b690cf718faa	CHAT_SESSION_ARCHIVE	ChatSession:bdeaa67d-8f69-4b99-bc51-2b662d309408	{"isArchived":true}	\N	2026-08-07 10:07:39.276
a46b8de5-b687-4c07-941a-f153b45e26b2	678dfb75-5040-4ad2-8348-b690cf718faa	CHAT_SESSION_ARCHIVE	ChatSession:bdeaa67d-8f69-4b99-bc51-2b662d309408	{"isArchived":true}	\N	2026-08-07 10:07:39.274
89162038-3524-4b7d-bd35-25b7fb4dfb7e	678dfb75-5040-4ad2-8348-b690cf718faa	CHAT_SESSION_ARCHIVE	ChatSession:bdeaa67d-8f69-4b99-bc51-2b662d309408	{"isArchived":true}	\N	2026-08-07 10:07:39.279
99940974-9a0c-4dda-b44f-a1cf782199cb	678dfb75-5040-4ad2-8348-b690cf718faa	CHAT_SESSION_ARCHIVE	ChatSession:bdeaa67d-8f69-4b99-bc51-2b662d309408	{"isArchived":true}	\N	2026-08-07 10:07:39.282
631eabbf-0e55-4e68-9fbb-6ca75eb733b2	678dfb75-5040-4ad2-8348-b690cf718faa	CHAT_SESSION_UNARCHIVE	ChatSession:bdeaa67d-8f69-4b99-bc51-2b662d309408	{"isArchived":false}	\N	2026-08-07 10:07:49.921
6d0bf9f5-e531-47d3-a070-17e81c23f458	678dfb75-5040-4ad2-8348-b690cf718faa	CREATE_ROLE	ROLE	{"id":"f5a07340-caec-4834-b696-18dcf96cf6fc","code":"TEST ROLE","name":"Test role","description":"kldn","parentRoleId":null,"delegationLevel":40,"isActive":true,"createdAt":"2026-08-07T10:12:45.914Z","updatedAt":"2026-08-07T10:12:45.914Z"}	\N	2026-08-07 10:12:46.167
2bdaf636-4a1c-4078-ab31-a45d62a78b14	678dfb75-5040-4ad2-8348-b690cf718faa	TEST_API_CREDENTIAL	apiCredential:8250c0d2-0941-4d94-94d0-dbf10796b880	{"status":"HEALTHY","latencyMs":1278,"error":""}	\N	2026-08-07 10:16:48.543
a27a12ed-a5d5-41cc-bbaa-f49d21f6fc97	678dfb75-5040-4ad2-8348-b690cf718faa	CREATE_COST_CENTER	costCenter:06711c9b-b987-4390-9cf6-a50c769292f7	{"code":"9016","name":"It department"}	\N	2026-08-10 11:07:44.468
af4532bf-a84a-4c1f-bb5b-dcd909b98079	678dfb75-5040-4ad2-8348-b690cf718faa	DELETE_COST_CENTER	costCenter:06711c9b-b987-4390-9cf6-a50c769292f7	{"code":"9016","name":"It department"}	\N	2026-08-10 11:08:08.189
\.


--
-- Data for Name: chat_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chat_attachments (id, "sessionId", "messageId", "uploadedById", "fileName", "mimeType", "sizeBytes", "storageKey", "createdAt") FROM stdin;
fec9b28f-b1be-4eb9-a8f1-30a1e0d91373	4048b86b-4477-4c5a-b690-318183dfe0ae	ff4676ee-a52d-49c7-a299-90b2b4fb5a93	6d21781a-a218-4548-8b2a-ff16f3eecb33	genrate an image with a man standing at .svg	image/svg+xml	1477	gen-b162e006-8649-4196-9014-e48e235728ad.svg	2026-08-06 12:24:35.896
2c4fa2ea-df7f-46b6-a0f5-8325a5145133	2d7c9255-97e5-40ad-96bf-29b3707eab48	0fbd9945-b2c8-4fae-a086-ac2afd41df7c	678dfb75-5040-4ad2-8348-b690cf718faa	A sunrise over the sea.svg	image/svg+xml	1146	gen-0c6305d1-1f61-4d0e-931e-fbfa9d999ab7.svg	2026-08-06 12:27:46.15
efd1cd6a-eab6-40d4-b8ad-022c7da2a959	2d7c9255-97e5-40ad-96bf-29b3707eab48	5a02207f-d781-4833-8159-66f5d8bfb239	678dfb75-5040-4ad2-8348-b690cf718faa	clip.mp4	video/mp4	1024	bb7b871a-c0ac-439e-bab2-7f3233cece7f.mp4	2026-08-06 12:27:48.832
727dba8f-74c1-4a43-9dda-bc3e1a558fc1	bdeaa67d-8f69-4b99-bc51-2b662d309408	16c58a06-da00-46fe-8435-7cc4c14563d5	678dfb75-5040-4ad2-8348-b690cf718faa	professional work environment breakdown.png	image/png	1521143	gen-a01f5d69-b5f9-4c58-8c2d-a0754e966566.png	2026-08-07 06:38:21.131
3281bc5b-53a5-4a77-8b1f-4b6fbfa341e2	bdeaa67d-8f69-4b99-bc51-2b662d309408	31a51ae0-81c9-473e-adc4-9876150c14de	678dfb75-5040-4ad2-8348-b690cf718faa	7448490-uhd_2160_3840_25fps.mp4	video/mp4	9770577	e1ce173b-1438-4f17-bbdd-0c7ee2aca910.mp4	2026-08-07 06:44:26.548
1bd74e8c-271d-42a9-8904-05cdaa02548b	e4585d5d-8c04-47c0-bb42-62ef4d29bf79	7f3c76d3-3038-439e-a886-1f24c8675635	678dfb75-5040-4ad2-8348-b690cf718faa	edited-7448490-uhd_2160_3840_25fps.mp4	video/mp4	9770577	temp-59135a9f-a498-4cf6-a2e9-e39d4af66b2a.mp4	2026-08-07 07:04:24.399
93ee652e-99cb-4d1a-9b60-d83b564f599c	6a677f3d-b350-4d1c-93f8-cd215f76a9bb	eb4e811b-cd22-4419-8e55-357f01fb037a	678dfb75-5040-4ad2-8348-b690cf718faa	edited-7448490-uhd_2160_3840_25fps.mp4	video/mp4	9770577	temp-9dd77ca9-602e-4ff6-9b58-e64201eab7d6.mp4	2026-08-10 05:37:38.433
431837f3-f9bb-40c4-aa19-f4bd67512901	a5263acc-435c-4418-9556-15b86888b1c7	a67b10a0-d4af-432a-8f2f-df81e4486a7a	678dfb75-5040-4ad2-8348-b690cf718faa	01-agreement-Bahria-Obaid Anwar.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	47765	0361e077-f55b-4de1-9483-04111b57731b.docx	2026-08-10 06:28:48.325
b877805e-d840-44ca-9808-f68fdc7f23c9	b6ed4faf-45f7-4129-8a84-fb39fa05e3c2	3aad3235-bd9a-4bc2-9f84-fd871a48a0f1	678dfb75-5040-4ad2-8348-b690cf718faa	professional office desk.png	image/png	1828269	gen-45657448-053f-4f5d-b18e-7d35f5e29cff.png	2026-08-10 11:01:37.477
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chat_sessions (id, "employeeId", title, "aiProvider", "aiModel", "isArchived", "createdAt", "updatedAt") FROM stdin;
11a8c395-6554-4c73-9098-8dcf361206d8	6d21781a-a218-4548-8b2a-ff16f3eecb33	hey i wanna know about tump 	openai	gpt-3.5-turbo	f	2026-08-06 12:18:27.77	2026-08-06 12:18:27.77
4048b86b-4477-4c5a-b690-318183dfe0ae	6d21781a-a218-4548-8b2a-ff16f3eecb33	Image: genrate an image with a man standing at a beach with a 	groq	llama-3.3-70b-versatile	f	2026-08-06 12:24:35.431	2026-08-06 12:24:35.431
2d7c9255-97e5-40ad-96bf-29b3707eab48	678dfb75-5040-4ad2-8348-b690cf718faa	Image: A sunrise over the sea	groq	llama-3.3-70b-versatile	f	2026-08-06 12:27:45.695	2026-08-06 12:27:45.695
18cc9c4d-f5c0-4c91-a9a5-83d0c3919776	678dfb75-5040-4ad2-8348-b690cf718faa	Hi, this is a test message.	openai	gpt-4o	f	2026-08-07 05:47:38.665	2026-08-07 05:47:38.665
74640ffd-6fbd-4143-b17c-13b6ec71b74d	678dfb75-5040-4ad2-8348-b690cf718faa	Image: prfoessonal work environment breakdown	openai	dall-e-3	f	2026-08-07 06:31:22.092	2026-08-07 06:31:22.092
15ab9bf9-484d-4df9-95d5-6342cc7dd882	678dfb75-5040-4ad2-8348-b690cf718faa	Image: professional work environment breakdown	openai	dall-e-3	f	2026-08-07 06:31:39.012	2026-08-07 06:31:39.012
323fc3a1-2699-4236-b482-82732eaf08bf	678dfb75-5040-4ad2-8348-b690cf718faa	Image: professional work environment breakdown	openai	gpt-image-1	f	2026-08-07 06:37:14.083	2026-08-07 06:37:14.083
390c42fc-6fd0-4748-83a3-165fb1edcfc3	678dfb75-5040-4ad2-8348-b690cf718faa	Image: professional work environment breakdown	openai	gpt-image-1	f	2026-08-07 06:37:29.094	2026-08-07 06:37:29.094
e4585d5d-8c04-47c0-bb42-62ef4d29bf79	678dfb75-5040-4ad2-8348-b690cf718faa	Video: dim lightning	groq	llama-3.3-70b-versatile	f	2026-08-07 07:04:23.312	2026-08-07 07:04:23.312
d1b87480-61f1-4d43-a413-ea161f112103	678dfb75-5040-4ad2-8348-b690cf718faa	Hello world	openai	gpt-4o	f	2026-08-07 07:07:17.642	2026-08-07 07:07:17.642
bdeaa67d-8f69-4b99-bc51-2b662d309408	678dfb75-5040-4ad2-8348-b690cf718faa	Image: professional work environment breakdown	openai	gpt-image-1	f	2026-08-07 06:37:35.777	2026-08-07 10:07:49.483
6a677f3d-b350-4d1c-93f8-cd215f76a9bb	678dfb75-5040-4ad2-8348-b690cf718faa	Video: trim to 5sec \r\nadd music	groq	llama-3.3-70b-versatile	f	2026-08-10 05:37:37.623	2026-08-10 05:37:37.623
a5263acc-435c-4418-9556-15b86888b1c7	678dfb75-5040-4ad2-8348-b690cf718faa	Review our compliance checklist	openai	gpt-4o	f	2026-08-10 06:28:31.999	2026-08-10 06:28:31.999
b6ed4faf-45f7-4129-8a84-fb39fa05e3c2	678dfb75-5040-4ad2-8348-b690cf718faa	Image: professional office desk	openai	gpt-image-1	f	2026-08-10 11:00:46.153	2026-08-10 11:00:46.153
\.


--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cost_centers (id, code, name, description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: delegated_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.delegated_assignments (id, "delegatorId", "targetUserId", "assignedRoleId", "startDate", "endDate", "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: delegation_policies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.delegation_policies (id, "roleId", "maxAssignableRoleId", scope, "canDelegate", "maxDepth", "createdAt") FROM stdin;
del-policy-admin	ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	4fe4acae-0aad-458e-8a85-68189bf6a2f4	DEPARTMENT	t	1	2026-08-06 07:51:56.41
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.departments (id, code, name, description, status, "createdAt", "updatedAt", "headOfDepartmentId", "costCenterId", "monthlyBudgetPkr", "dailyBudgetPkr", "yearlyBudgetPkr", "monthlyTokenLimit", "monthlyRequestLimit") FROM stdin;
83de0844-a252-469e-a305-f2c5006131e3	EXEC	Executive Office	Executive leadership	ACTIVE	2026-08-06 07:47:08.122	2026-08-07 06:22:55.366	\N	\N	\N	\N	\N	\N	\N
6d622145-4a44-40e4-896a-bf62d00d103a	IT	IT Department	Information Technology	ACTIVE	2026-08-06 07:47:09.74	2026-08-07 06:22:58.267	\N	\N	\N	\N	\N	\N	\N
5ec822fa-09e9-41ff-b630-22a8a4df35f4	MKT	Marketing	Brand and digital marketing	ACTIVE	2026-08-06 07:47:09.945	2026-08-07 06:22:58.528	\N	\N	\N	\N	\N	\N	\N
433954eb-e011-4ddc-a833-6ff2c1ee9740	FIN	Finance & Accounts	Financial reporting and accounting	ACTIVE	2026-08-06 07:47:10.148	2026-08-07 06:22:58.908	\N	\N	\N	\N	\N	\N	\N
dcf22bd5-3922-4698-a397-9c40b170fc5c	HR	Human Resources	Talent and employee relations	ACTIVE	2026-08-06 07:47:10.355	2026-08-07 06:22:59.367	\N	\N	\N	\N	\N	\N	\N
37f11f3b-e660-4c84-bce1-17641d5f034f	SCM	Supply Chain	Procurement and logistics	ACTIVE	2026-08-06 07:47:10.561	2026-08-07 06:22:59.75	\N	\N	\N	\N	\N	\N	\N
0259c538-7e05-4e52-92eb-a37f22de4df7	PROD	Production	Manufacturing and packaging	ACTIVE	2026-08-06 07:47:10.765	2026-08-07 06:22:59.969	\N	\N	\N	\N	\N	\N	\N
7145b480-bd2c-4a46-872f-dd6c306f6148	QA	Quality Assurance	Quality control and compliance	ACTIVE	2026-08-06 07:47:10.973	2026-08-07 06:23:00.277	\N	\N	\N	\N	\N	\N	\N
996c1d54-eeaf-4ef7-a282-8faa3730e73b	RND	Research & Development	Product formulation research	ACTIVE	2026-08-06 07:47:11.181	2026-08-07 06:23:00.504	\N	\N	\N	\N	\N	\N	\N
fe45c6dd-1bee-4ce5-86fc-7b9f5eec8624	SALES	Sales	National sales and distribution	ACTIVE	2026-08-06 07:47:11.385	2026-08-07 06:23:00.778	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, "knowledgeBaseId", title, content, "metadataJson", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employee_master; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.employee_master (id, "employeeId", "companyEmail", name, department, designation, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.employees (id, "employeeId", name, email, password, department, "departmentId", "teamId", designation, role, "userType", "registrationStatus", "isActive", "avatarUrl", "createdAt", "updatedAt") FROM stdin;
678dfb75-5040-4ad2-8348-b690cf718faa	HAM-001	Super Admin	superadmin@hamdard.com.pk	$2b$10$BffJtaWfvDV4TSed79uMfOEFZvpute4STmM/8MfPxPaxRu.iCg7SK	Executive Office	83de0844-a252-469e-a305-f2c5006131e3	\N	System Administrator	SUPER_ADMIN	EMPLOYEE	APPROVED	t	\N	2026-08-06 07:51:47.766	2026-08-07 06:26:36.504
6d21781a-a218-4548-8b2a-ff16f3eecb33	HAM-002	Admin User	admin@hamdard.com.pk	$2b$10$CSOzyRg1F/UlWn7YdqrOB.3Z17SS9YEJ6.XUNafadZoWvbb07BP3G	IT Department	6d622145-4a44-40e4-896a-bf62d00d103a	\N	IT Administrator	ADMIN	EMPLOYEE	APPROVED	t	\N	2026-08-06 07:51:49.136	2026-08-07 06:26:37.94
b9e13fee-ef83-44bc-acff-03b23eb15194	HAM-003	Dept Manager	manager@hamdard.com.pk	$2b$10$bAG08WVmTTl9FeKmCjWp8ez4fkhTja0CQv2F/jmLcx1Ws0X/cSHRq	Marketing	5ec822fa-09e9-41ff-b630-22a8a4df35f4	\N	Marketing Manager	DEPT_MANAGER	EMPLOYEE	APPROVED	t	\N	2026-08-06 07:51:50.502	2026-08-07 06:26:39.468
7de5e7de-713a-4376-8c56-428cfefd6e71	HAM-004	Employee User	employee@hamdard.com.pk	$2b$10$V0ljt9HyBjrMiW2UlmLTUu.MEqH.hQ9BR4czBF5WgURqfXIJE7jwS	IT Department	6d622145-4a44-40e4-896a-bf62d00d103a	\N	Software Engineer	EMPLOYEE	EMPLOYEE	APPROVED	t	\N	2026-08-06 07:51:51.866	2026-08-07 06:26:40.89
08576d31-e40f-4cea-a52a-029846ca70fb	HAM-005	Contractor User	contractor@hamdard.com.pk	$2b$10$VSWi4NUro9heyD8UHdgO.Of8cuCjKRuntjxm5gBG/d2uMjruVXnai	IT Department	6d622145-4a44-40e4-896a-bf62d00d103a	\N	External Consultant	CONTRACTOR	EMPLOYEE	APPROVED	t	\N	2026-08-06 07:51:53.211	2026-08-07 06:26:42.328
95e4e762-0159-4d94-a40b-ed00689efce6	HAM-006	Guest User	guest@hamdard.com.pk	$2b$10$5WKezaKeEtDeMBdcGqtUEOku50vI.KtoZvToV/uczbcdpft0bNN0q	IT Department	6d622145-4a44-40e4-896a-bf62d00d103a	\N	Guest Viewer	GUEST	EMPLOYEE	APPROVED	t	\N	2026-08-06 07:51:54.608	2026-08-07 06:26:43.706
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.feature_flags (id, "featureName", enabled, "departmentId", "roleId", "createdAt") FROM stdin;
8398b473-c956-4df2-b19a-c021d7ffc223	drbac_delegation_engine	t	\N	\N	2026-08-06 07:51:44.801
cb2dc08d-3c65-470b-8de4-f8cb49e623fe	admin_approval_workflow	t	\N	\N	2026-08-06 07:51:45.927
\.


--
-- Data for Name: knowledge_bases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.knowledge_bases (id, name, description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.messages (id, "sessionId", role, content, "tokensUsed", "costUsd", "createdAt") FROM stdin;
38493128-58ba-4f69-9f5e-789c5559cc79	11a8c395-6554-4c73-9098-8dcf361206d8	user	hey i wanna know about tump 	0	0	2026-08-06 12:18:30.487
48f006cb-2293-42c7-9ae9-c8ef9e8754ff	11a8c395-6554-4c73-9098-8dcf361206d8	assistant	Could you please provide more specific information about "tump"? It could refer to various things such as a place, a person's name, or a topic/theme. Additional context would help me provide you with accurate information.	0	0	2026-08-06 12:18:40.146
74924696-a670-41fd-8e9c-eb307d1e6b0b	11a8c395-6554-4c73-9098-8dcf361206d8	user	i mean donald trump	0	0	2026-08-06 12:18:59.385
990d7812-dc58-4c42-9924-d355ae2c1012	11a8c395-6554-4c73-9098-8dcf361206d8	assistant	Donald Trump is a well-known businessman, television personality, and former President of the United States. He served as the 45th President from 2017 to 2021. During his presidency, he implemented various policies on issues such as immigration, trade, and healthcare. Trump's presidency was marked by controversy and polarization, with strong support from his base and opposition from many critics. If you have any specific questions or need more detailed information about Donald Trump, feel free to ask.	0	0	2026-08-06 12:19:14.441
ff4676ee-a52d-49c7-a299-90b2b4fb5a93	4048b86b-4477-4c5a-b690-318183dfe0ae	assistant	Generated image: genrate an image with a man standing at a beach with a lone wolf besides him	0	0	2026-08-06 12:24:35.654
0fbd9945-b2c8-4fae-a086-ac2afd41df7c	2d7c9255-97e5-40ad-96bf-29b3707eab48	assistant	Generated image: A sunrise over the sea	0	0	2026-08-06 12:27:45.924
5a02207f-d781-4833-8159-66f5d8bfb239	2d7c9255-97e5-40ad-96bf-29b3707eab48	assistant	Video edit request received: "Make it black and white, 10 seconds". Below is the processed output.	0	0	2026-08-06 12:27:48.605
1927c877-f20b-40d7-a018-16993007c843	18cc9c4d-f5c0-4c91-a9a5-83d0c3919776	user	Hi, this is a test message.	0	0	2026-08-07 05:47:42.675
112b296f-53b4-4209-a1be-d38e5c925e8a	18cc9c4d-f5c0-4c91-a9a5-83d0c3919776	assistant	Hello! If you need any assistance or have questions, feel free to ask. How can I help you today?	0	0	2026-08-07 05:47:45.978
16c58a06-da00-46fe-8435-7cc4c14563d5	bdeaa67d-8f69-4b99-bc51-2b662d309408	assistant	Generated image: professional work environment breakdown	0	0	2026-08-07 06:38:18.779
31a51ae0-81c9-473e-adc4-9876150c14de	bdeaa67d-8f69-4b99-bc51-2b662d309408	assistant	Video edit request received: "add captions and voice over to the video". Below is the processed output.	0	0	2026-08-07 06:44:26.296
7f3c76d3-3038-439e-a886-1f24c8675635	e4585d5d-8c04-47c0-bb42-62ef4d29bf79	assistant	Video edit completed for: "dim lightning".	0	0	2026-08-07 07:04:24.121
2c5f65d2-29ac-4c81-8935-4faed6adb6ce	d1b87480-61f1-4d43-a413-ea161f112103	user	Hello world	0	0	2026-08-07 07:07:21.493
59a2a3ec-00d9-46c3-953c-4c2d3d8d34d2	d1b87480-61f1-4d43-a413-ea161f112103	assistant	Hello! How can I assist you today?	0	0	2026-08-07 07:07:24.532
eb4e811b-cd22-4419-8e55-357f01fb037a	6a677f3d-b350-4d1c-93f8-cd215f76a9bb	assistant	Video edit completed for: "trim to 5sec \r\nadd music".	0	0	2026-08-10 05:37:38.205
2b8137c8-0b08-4e1a-9d1e-b0eebc975138	6a677f3d-b350-4d1c-93f8-cd215f76a9bb	user	is it possible to break into company's firewall	0	0	2026-08-10 05:38:21.111
ee50adc8-959e-40d6-a180-cc6686662313	6a677f3d-b350-4d1c-93f8-cd215f76a9bb	assistant	I’m sorry, I can't assist with that. If you have concerns about security, it's best to report them to your IT department or security team.	0	0	2026-08-10 05:38:24.336
7031a094-e8cd-4c0c-92ac-9ffa594f985d	a5263acc-435c-4418-9556-15b86888b1c7	user	Review our compliance checklist	0	0	2026-08-10 06:28:33.1
c383e2f9-985c-4440-88b3-53557d8f3fe6	a5263acc-435c-4418-9556-15b86888b1c7	assistant	To help you effectively, I would need you to provide the compliance checklist or key points from it. If you have specific areas or questions about compliance, feel free to share them, and I'll do my best to assist you.	0	0	2026-08-10 06:28:35.913
a67b10a0-d4af-432a-8f2f-df81e4486a7a	a5263acc-435c-4418-9556-15b86888b1c7	user	here you go\n\n---\nAttached files:\n[File: 01-agreement-Bahria-Obaid Anwar.docx — binary content, cannot read as text]	0	0	2026-08-10 06:28:59.62
e47c5a51-1bfb-433c-ad79-351179def9f0	a5263acc-435c-4418-9556-15b86888b1c7	assistant	It seems the file you've mentioned isn't providing readable content directly here. Please upload the file to a secure internal platform where I can access and review it, or provide key points or sections from the document that you'd like reviewed. This will help ensure a thorough and accurate response while maintaining security and confidentiality.	0	0	2026-08-10 06:29:02.075
3aad3235-bd9a-4bc2-9f84-fd871a48a0f1	b6ed4faf-45f7-4129-8a84-fb39fa05e3c2	assistant	Generated image: professional office desk	0	0	2026-08-10 11:01:35.73
\.


--
-- Data for Name: model_health_checks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.model_health_checks (id, "modelId", "credentialId", status, "latencyMs", error, details, "createdAt") FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.permissions (id, module, resource, action, "permissionKey", description, "createdAt") FROM stdin;
3717f026-dafb-4ff1-84f2-c457b044a456	policies	policy	assign	policies.assign	Assign policies to scopes	2026-08-06 07:47:16.096
df7011d3-1a19-4980-94df-101c5a195c18	policies	policy	evaluate	policies.evaluate	View policy evaluation logs	2026-08-06 07:47:16.305
bedaa498-e9a2-42e9-90e4-78cebeba16e6	policies	policy	export	policies.export	Export policies	2026-08-06 07:47:16.51
91789cac-c380-416a-99d5-09be405c3943	audit	log	read	audit.view	View audit logs	2026-08-06 07:47:16.713
65cb10ba-df4e-40d2-899c-a56bf46e2998	settings	system	update	settings.update	Update settings	2026-08-06 07:47:16.916
0032de1e-f397-4979-8dce-8c76f7b56450	chat	session	create	chat.session.create	Create chat sessions	2026-08-06 07:47:17.121
6ee3571a-520f-4746-9ab2-5511adcd48a8	chat	session	read	chat.session.read	Read chat history	2026-08-06 07:47:17.325
1cf29897-ede5-4d8d-8c06-764f3f557b15	departments	department	create	departments.create	Create departments	2026-08-06 07:47:17.527
4a031f70-13e1-497f-8f8c-ef44ef50ec16	departments	department	read	departments.view	View departments	2026-08-06 07:47:17.729
93183686-032e-4f9a-bace-d6d089ce6b8f	departments	department	update	departments.update	Update departments	2026-08-06 07:47:17.935
3141f89f-02b0-408a-bb84-7a2ab8c039ef	departments	department	delete	departments.delete	Delete departments	2026-08-06 07:47:18.139
b3df3114-fd4a-4867-90c7-8ea38dff0751	teams	team	create	teams.create	Create teams	2026-08-06 07:47:18.342
701b586a-f389-4c19-a43f-fc9697842af8	teams	team	read	teams.view	View teams	2026-08-06 07:47:18.545
b96ab3e2-38fd-4427-956c-bda90d3d03c7	teams	team	update	teams.update	Update teams	2026-08-06 07:47:18.749
ae7caac9-00a8-446d-8eff-d6badd56bc0c	teams	team	delete	teams.delete	Delete teams	2026-08-06 07:47:18.954
ebc986c9-b411-4a27-8de5-06b67d3eaf76	agents	agent	create	agents.create	Create AI agents	2026-08-07 06:23:12.577
77c98b5a-2260-45b3-96df-8f4547a427db	models	model	manage	models.manage	Manage AI models	2026-08-06 07:47:19.575
3152702f-f016-45f4-8ae6-08c45af63466	chat	image	generate	chat.image.generate	Generate images	2026-08-06 07:47:19.78
daa0901d-bf00-4cc0-82c7-00ad911b70a7	chat	video	edit	chat.video.edit	Edit videos	2026-08-06 07:47:19.983
a3f2a725-fc95-43b3-995b-ceb16bbde539	chat	document	upload	chat.upload.document	Upload documents	2026-08-06 07:47:20.19
dd84edd5-2c80-4933-80a3-a78761068640	agents	agent	manage	agents.manage	Manage AI agents	2026-08-06 07:47:19.158
7363daa3-54a0-451d-9540-8323317a0403	workflows	workflow	manage	workflows.manage	Manage workflows	2026-08-06 07:47:19.362
ca1a9eee-8771-496a-b87f-c46fa5e41558	dashboard	view	read	admin.dashboard.view	Access Admin Dashboard	2026-08-06 07:47:12.827
be85d524-8c9f-4d0a-a59d-c60e15f89188	users	employee	create	users.employee.create	Create employees	2026-08-06 07:47:13.034
553e6404-7a82-4f68-bbd3-8d309ca1c886	users	employee	read	users.employee.read	View employees	2026-08-06 07:47:13.237
c3dec811-16c3-4b41-b0ff-e8505915a78d	users	employee	update	users.employee.update	Update employees	2026-08-06 07:47:13.438
90ac76d6-0849-49db-8d6c-a15e093d1ca4	users	employee	delete	users.employee.delete	Delete employees	2026-08-06 07:47:13.641
d4440f73-696a-4fcd-b8cd-cc829b1f270a	registration	approval	approve	registration.approve	Approve registrations	2026-08-06 07:47:13.848
4bf50226-46be-40a3-8fe3-0ab7141badce	registration	approval	reject	registration.reject	Reject registrations	2026-08-06 07:47:14.052
2d9767f6-0d9d-49b8-b0e0-2b8e8aba8dda	drbac	role	manage	drbac.role.manage	Manage roles	2026-08-06 07:47:14.258
fd19229f-e786-4a3a-9220-fcc36107e83e	drbac	permission	assign	drbac.permission.assign	Assign permissions	2026-08-06 07:47:14.463
2c5740b9-5bb0-4019-af1b-f0301690b961	delegation	role	delegate	delegation.role.delegate	Delegate roles	2026-08-06 07:47:14.666
e2e284d3-8a38-4289-afa2-f735b8ae419b	delegation	role	revoke	delegation.role.revoke	Revoke delegations	2026-08-06 07:47:14.869
8053c94a-726c-45d1-9fe6-0f1b1a271bde	analytics	usage	read	analytics.view	View analytics	2026-08-06 07:47:15.071
6030df90-d3ee-488c-a893-8c3906277742	costs	budget	read	costs.view	View costs	2026-08-06 07:47:15.273
f88c0dc6-db17-40d9-a569-60564ac6a6c1	policies	ai_policy	create	policies.create	Create policies	2026-08-06 07:47:15.477
4cc61e9e-e684-4784-97e8-d49b5a349ec6	policies	ai_policy	read	policies.read	View policies	2026-08-06 07:47:15.679
c08a86ab-063c-4c07-805e-9d5500b72c79	policies	ai_policy	update	policies.update	Update policies	2026-08-06 07:47:15.888
7b0193dd-5508-464b-a2b1-803f9ddc6603	agents	agent	read	agents.read	View AI agents	2026-08-07 06:23:12.806
9217befe-5768-445b-9fac-db90cc386051	agents	agent	update	agents.update	Edit AI agents	2026-08-07 06:23:13.032
af9c5173-13a3-4af9-807a-6f454903f33b	agents	agent	delete	agents.delete	Delete AI agents	2026-08-07 06:23:13.807
d7c0b3eb-1a3f-4bad-8804-14f8dd69d683	workflows	workflow	create	workflows.create	Create workflows	2026-08-07 06:23:14.041
daa93e1c-cb45-451f-a2da-806b445b8fbe	workflows	workflow	read	workflows.read	View workflows	2026-08-07 06:23:14.268
a386d332-b937-4239-af0d-9eafa10d8424	workflows	workflow	update	workflows.update	Update workflows	2026-08-07 06:23:14.635
f2480bb2-85ce-4e3d-bc50-9222d9a1c399	workflows	workflow	delete	workflows.delete	Delete workflows	2026-08-07 06:23:14.888
7fbb9fd9-9612-46a9-a419-2b9a454aa76f	prompts	template	manage	prompts.manage	Manage prompt templates	2026-08-07 06:23:15.145
6e863e3e-0c35-4585-b025-f688f25d201e	prompts	template	read	prompts.read	View prompt templates	2026-08-07 06:23:15.364
4b6c0ae3-fc4a-4ad9-8864-1c965403e8a6	knowledge	base	manage	knowledge.manage	Manage Knowledge Bases	2026-08-07 06:23:15.666
153d83c0-4da1-4ab6-9aa6-ecf08de3608c	knowledge	base	read	knowledge.read	View Knowledge Bases	2026-08-07 06:23:15.895
\.


--
-- Data for Name: policy_evaluation_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.policy_evaluation_logs (id, "policyId", "employeeId", "contextType", "contextJson", decision, details, "createdAt") FROM stdin;
4e849db7-9a62-4637-b5ef-703170899113	policy-rate-limit-default	6d21781a-a218-4548-8b2a-ff16f3eecb33	LOGIN	{"ip":"unknown","timestamp":"2026-08-06T11:13:55.759Z"}	BLOCK_REQUEST	{"policyName":"Standard Rate Limit","category":"QUOTA_USAGE","details":"Policy \\"Standard Rate Limit\\" (QUOTA_USAGE) → BLOCK_REQUEST","blocked":true,"warnings":[]}	2026-08-06 11:13:55.983
05b6ae3a-c269-4d8b-bf0c-5cb1136879c1	policy-rate-limit-default	7de5e7de-713a-4376-8c56-428cfefd6e71	LOGIN	{"ip":"unknown","timestamp":"2026-08-06T11:16:45.408Z"}	BLOCK_REQUEST	{"policyName":"Standard Rate Limit","category":"QUOTA_USAGE","details":"Policy \\"Standard Rate Limit\\" (QUOTA_USAGE) → BLOCK_REQUEST","blocked":true,"warnings":[]}	2026-08-06 11:16:45.626
\.


--
-- Data for Name: policy_scopes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.policy_scopes (id, "policyId", "scopeType", "targetId", "createdAt") FROM stdin;
\.


--
-- Data for Name: prompt_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.prompt_templates (id, name, description, content, variables, category, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: quota_configs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quota_configs (id, scope, "scopeTargetId", "monthlyBudgetPkr", "dailyBudgetPkr", "yearlyBudgetPkr", "monthlyTokenLimit", "dailyTokenLimit", "monthlyRequestLimit", "dailyRequestLimit", "maxConcurrentSessions", "monthlyUploadLimit", "maxFileSizeBytes", "modelLimitsJson", status, "effectiveAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: role_modules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.role_modules ("roleId", "moduleId") FROM stdin;
515482ff-b117-45ef-a98c-470cc67a77f4	02398d26-7cb2-42cb-a8a0-0811e4ecf600
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	02398d26-7cb2-42cb-a8a0-0811e4ecf600
515482ff-b117-45ef-a98c-470cc67a77f4	78aeb51e-ad23-4aec-b500-4061e0a31078
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	78aeb51e-ad23-4aec-b500-4061e0a31078
515482ff-b117-45ef-a98c-470cc67a77f4	8d3fa194-4e03-4244-a5ae-e70e34d972fa
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	8d3fa194-4e03-4244-a5ae-e70e34d972fa
515482ff-b117-45ef-a98c-470cc67a77f4	55ce44d3-0136-4ffd-a9ca-dc8c2d28a28d
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	55ce44d3-0136-4ffd-a9ca-dc8c2d28a28d
515482ff-b117-45ef-a98c-470cc67a77f4	7bf9e6d1-0f41-43ee-ae20-36f4e36a502f
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	7bf9e6d1-0f41-43ee-ae20-36f4e36a502f
515482ff-b117-45ef-a98c-470cc67a77f4	6e5f60a5-4f20-4c3e-886a-8d1f18986214
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	6e5f60a5-4f20-4c3e-886a-8d1f18986214
515482ff-b117-45ef-a98c-470cc67a77f4	db16e0d4-f619-4813-a9fd-2dd0d28993c3
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	db16e0d4-f619-4813-a9fd-2dd0d28993c3
515482ff-b117-45ef-a98c-470cc67a77f4	449aa043-92de-49ad-963a-aeb23352fdc8
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	449aa043-92de-49ad-963a-aeb23352fdc8
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.role_permissions ("roleId", "permissionId", "assignedAt") FROM stdin;
515482ff-b117-45ef-a98c-470cc67a77f4	ca1a9eee-8771-496a-b87f-c46fa5e41558	2026-08-06 07:47:20.829
515482ff-b117-45ef-a98c-470cc67a77f4	be85d524-8c9f-4d0a-a59d-c60e15f89188	2026-08-06 07:47:21.841
515482ff-b117-45ef-a98c-470cc67a77f4	553e6404-7a82-4f68-bbd3-8d309ca1c886	2026-08-06 07:47:22.852
515482ff-b117-45ef-a98c-470cc67a77f4	c3dec811-16c3-4b41-b0ff-e8505915a78d	2026-08-06 07:47:23.89
515482ff-b117-45ef-a98c-470cc67a77f4	90ac76d6-0849-49db-8d6c-a15e093d1ca4	2026-08-06 07:47:24.906
515482ff-b117-45ef-a98c-470cc67a77f4	d4440f73-696a-4fcd-b8cd-cc829b1f270a	2026-08-06 07:47:25.921
515482ff-b117-45ef-a98c-470cc67a77f4	4bf50226-46be-40a3-8fe3-0ab7141badce	2026-08-06 07:47:26.946
515482ff-b117-45ef-a98c-470cc67a77f4	2d9767f6-0d9d-49b8-b0e0-2b8e8aba8dda	2026-08-06 07:47:27.966
515482ff-b117-45ef-a98c-470cc67a77f4	fd19229f-e786-4a3a-9220-fcc36107e83e	2026-08-06 07:47:28.983
515482ff-b117-45ef-a98c-470cc67a77f4	2c5740b9-5bb0-4019-af1b-f0301690b961	2026-08-06 07:47:30.003
515482ff-b117-45ef-a98c-470cc67a77f4	e2e284d3-8a38-4289-afa2-f735b8ae419b	2026-08-06 07:47:31.424
515482ff-b117-45ef-a98c-470cc67a77f4	8053c94a-726c-45d1-9fe6-0f1b1a271bde	2026-08-06 07:47:32.433
515482ff-b117-45ef-a98c-470cc67a77f4	6030df90-d3ee-488c-a893-8c3906277742	2026-08-06 07:47:33.439
515482ff-b117-45ef-a98c-470cc67a77f4	f88c0dc6-db17-40d9-a569-60564ac6a6c1	2026-08-06 07:47:34.448
515482ff-b117-45ef-a98c-470cc67a77f4	4cc61e9e-e684-4784-97e8-d49b5a349ec6	2026-08-06 07:47:35.464
515482ff-b117-45ef-a98c-470cc67a77f4	c08a86ab-063c-4c07-805e-9d5500b72c79	2026-08-06 07:47:36.472
515482ff-b117-45ef-a98c-470cc67a77f4	3717f026-dafb-4ff1-84f2-c457b044a456	2026-08-06 07:47:37.493
515482ff-b117-45ef-a98c-470cc67a77f4	df7011d3-1a19-4980-94df-101c5a195c18	2026-08-06 07:47:38.525
515482ff-b117-45ef-a98c-470cc67a77f4	bedaa498-e9a2-42e9-90e4-78cebeba16e6	2026-08-06 07:47:39.541
515482ff-b117-45ef-a98c-470cc67a77f4	91789cac-c380-416a-99d5-09be405c3943	2026-08-06 07:47:40.56
515482ff-b117-45ef-a98c-470cc67a77f4	65cb10ba-df4e-40d2-899c-a56bf46e2998	2026-08-06 07:47:41.577
515482ff-b117-45ef-a98c-470cc67a77f4	0032de1e-f397-4979-8dce-8c76f7b56450	2026-08-06 07:47:42.614
515482ff-b117-45ef-a98c-470cc67a77f4	6ee3571a-520f-4746-9ab2-5511adcd48a8	2026-08-06 07:47:43.638
515482ff-b117-45ef-a98c-470cc67a77f4	1cf29897-ede5-4d8d-8c06-764f3f557b15	2026-08-06 07:47:44.658
515482ff-b117-45ef-a98c-470cc67a77f4	4a031f70-13e1-497f-8f8c-ef44ef50ec16	2026-08-06 07:47:45.674
515482ff-b117-45ef-a98c-470cc67a77f4	93183686-032e-4f9a-bace-d6d089ce6b8f	2026-08-06 07:47:46.716
515482ff-b117-45ef-a98c-470cc67a77f4	3141f89f-02b0-408a-bb84-7a2ab8c039ef	2026-08-06 07:47:47.73
515482ff-b117-45ef-a98c-470cc67a77f4	b3df3114-fd4a-4867-90c7-8ea38dff0751	2026-08-06 07:47:48.749
515482ff-b117-45ef-a98c-470cc67a77f4	701b586a-f389-4c19-a43f-fc9697842af8	2026-08-06 07:47:49.773
515482ff-b117-45ef-a98c-470cc67a77f4	b96ab3e2-38fd-4427-956c-bda90d3d03c7	2026-08-06 07:47:50.784
515482ff-b117-45ef-a98c-470cc67a77f4	ae7caac9-00a8-446d-8eff-d6badd56bc0c	2026-08-06 07:47:51.794
515482ff-b117-45ef-a98c-470cc67a77f4	dd84edd5-2c80-4933-80a3-a78761068640	2026-08-06 07:47:52.851
515482ff-b117-45ef-a98c-470cc67a77f4	7363daa3-54a0-451d-9540-8323317a0403	2026-08-06 07:47:53.879
515482ff-b117-45ef-a98c-470cc67a77f4	77c98b5a-2260-45b3-96df-8f4547a427db	2026-08-06 07:47:54.901
515482ff-b117-45ef-a98c-470cc67a77f4	3152702f-f016-45f4-8ae6-08c45af63466	2026-08-06 07:47:55.927
515482ff-b117-45ef-a98c-470cc67a77f4	daa0901d-bf00-4cc0-82c7-00ad911b70a7	2026-08-06 07:47:56.947
515482ff-b117-45ef-a98c-470cc67a77f4	a3f2a725-fc95-43b3-995b-ceb16bbde539	2026-08-06 07:47:57.97
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	ca1a9eee-8771-496a-b87f-c46fa5e41558	2026-08-06 07:47:58.986
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	be85d524-8c9f-4d0a-a59d-c60e15f89188	2026-08-06 07:47:59.993
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	553e6404-7a82-4f68-bbd3-8d309ca1c886	2026-08-06 07:48:01.416
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	c3dec811-16c3-4b41-b0ff-e8505915a78d	2026-08-06 07:48:02.424
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	d4440f73-696a-4fcd-b8cd-cc829b1f270a	2026-08-06 07:48:03.435
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	4bf50226-46be-40a3-8fe3-0ab7141badce	2026-08-06 07:48:04.443
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	8053c94a-726c-45d1-9fe6-0f1b1a271bde	2026-08-06 07:48:05.447
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	6030df90-d3ee-488c-a893-8c3906277742	2026-08-06 07:48:06.46
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	f88c0dc6-db17-40d9-a569-60564ac6a6c1	2026-08-06 07:48:07.502
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	4cc61e9e-e684-4784-97e8-d49b5a349ec6	2026-08-06 07:48:08.532
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	c08a86ab-063c-4c07-805e-9d5500b72c79	2026-08-06 07:48:09.542
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	3717f026-dafb-4ff1-84f2-c457b044a456	2026-08-06 07:48:10.556
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	df7011d3-1a19-4980-94df-101c5a195c18	2026-08-06 07:48:11.564
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	bedaa498-e9a2-42e9-90e4-78cebeba16e6	2026-08-06 07:48:12.57
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	91789cac-c380-416a-99d5-09be405c3943	2026-08-06 07:48:13.578
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	2c5740b9-5bb0-4019-af1b-f0301690b961	2026-08-06 07:48:14.612
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	e2e284d3-8a38-4289-afa2-f735b8ae419b	2026-08-06 07:48:15.619
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	0032de1e-f397-4979-8dce-8c76f7b56450	2026-08-06 07:48:16.626
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	6ee3571a-520f-4746-9ab2-5511adcd48a8	2026-08-06 07:48:17.636
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	1cf29897-ede5-4d8d-8c06-764f3f557b15	2026-08-06 07:48:18.668
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	4a031f70-13e1-497f-8f8c-ef44ef50ec16	2026-08-06 07:48:19.698
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	93183686-032e-4f9a-bace-d6d089ce6b8f	2026-08-06 07:48:20.712
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	3141f89f-02b0-408a-bb84-7a2ab8c039ef	2026-08-06 07:48:21.733
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	b3df3114-fd4a-4867-90c7-8ea38dff0751	2026-08-06 07:48:22.753
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	701b586a-f389-4c19-a43f-fc9697842af8	2026-08-06 07:48:23.779
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	b96ab3e2-38fd-4427-956c-bda90d3d03c7	2026-08-06 07:48:24.794
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	ae7caac9-00a8-446d-8eff-d6badd56bc0c	2026-08-06 07:48:25.825
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	2d9767f6-0d9d-49b8-b0e0-2b8e8aba8dda	2026-08-06 07:48:26.869
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	fd19229f-e786-4a3a-9220-fcc36107e83e	2026-08-06 07:48:27.881
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	65cb10ba-df4e-40d2-899c-a56bf46e2998	2026-08-06 07:48:28.906
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	dd84edd5-2c80-4933-80a3-a78761068640	2026-08-06 07:48:29.92
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	7363daa3-54a0-451d-9540-8323317a0403	2026-08-06 07:48:30.933
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	77c98b5a-2260-45b3-96df-8f4547a427db	2026-08-06 07:48:31.962
163e0fcd-d5f2-4640-a6e7-304dfc321b40	ca1a9eee-8771-496a-b87f-c46fa5e41558	2026-08-06 07:48:32.998
163e0fcd-d5f2-4640-a6e7-304dfc321b40	553e6404-7a82-4f68-bbd3-8d309ca1c886	2026-08-06 07:48:34.015
163e0fcd-d5f2-4640-a6e7-304dfc321b40	8053c94a-726c-45d1-9fe6-0f1b1a271bde	2026-08-06 07:48:35.034
163e0fcd-d5f2-4640-a6e7-304dfc321b40	6030df90-d3ee-488c-a893-8c3906277742	2026-08-06 07:48:36.043
163e0fcd-d5f2-4640-a6e7-304dfc321b40	0032de1e-f397-4979-8dce-8c76f7b56450	2026-08-06 07:48:37.048
163e0fcd-d5f2-4640-a6e7-304dfc321b40	6ee3571a-520f-4746-9ab2-5511adcd48a8	2026-08-06 07:48:38.052
163e0fcd-d5f2-4640-a6e7-304dfc321b40	4a031f70-13e1-497f-8f8c-ef44ef50ec16	2026-08-06 07:48:39.055
163e0fcd-d5f2-4640-a6e7-304dfc321b40	701b586a-f389-4c19-a43f-fc9697842af8	2026-08-06 07:48:40.061
4fe4acae-0aad-458e-8a85-68189bf6a2f4	0032de1e-f397-4979-8dce-8c76f7b56450	2026-08-06 07:48:41.072
4fe4acae-0aad-458e-8a85-68189bf6a2f4	6ee3571a-520f-4746-9ab2-5511adcd48a8	2026-08-06 07:48:42.079
4fe4acae-0aad-458e-8a85-68189bf6a2f4	553e6404-7a82-4f68-bbd3-8d309ca1c886	2026-08-06 07:48:43.087
4fe4acae-0aad-458e-8a85-68189bf6a2f4	3152702f-f016-45f4-8ae6-08c45af63466	2026-08-06 07:48:44.099
4fe4acae-0aad-458e-8a85-68189bf6a2f4	daa0901d-bf00-4cc0-82c7-00ad911b70a7	2026-08-06 07:48:45.106
4fe4acae-0aad-458e-8a85-68189bf6a2f4	a3f2a725-fc95-43b3-995b-ceb16bbde539	2026-08-06 07:48:46.113
00468d26-87d5-4644-9102-0a676bbb79ac	0032de1e-f397-4979-8dce-8c76f7b56450	2026-08-06 07:48:47.149
00468d26-87d5-4644-9102-0a676bbb79ac	6ee3571a-520f-4746-9ab2-5511adcd48a8	2026-08-06 07:48:48.169
00468d26-87d5-4644-9102-0a676bbb79ac	553e6404-7a82-4f68-bbd3-8d309ca1c886	2026-08-06 07:48:49.189
a4f2d40b-7a40-41a4-b2aa-14282c218ea7	6ee3571a-520f-4746-9ab2-5511adcd48a8	2026-08-06 07:48:50.206
a4f2d40b-7a40-41a4-b2aa-14282c218ea7	553e6404-7a82-4f68-bbd3-8d309ca1c886	2026-08-06 07:48:51.227
515482ff-b117-45ef-a98c-470cc67a77f4	ebc986c9-b411-4a27-8de5-06b67d3eaf76	2026-08-07 06:24:11.48
515482ff-b117-45ef-a98c-470cc67a77f4	7b0193dd-5508-464b-a2b1-803f9ddc6603	2026-08-07 06:24:13.56
515482ff-b117-45ef-a98c-470cc67a77f4	9217befe-5768-445b-9fac-db90cc386051	2026-08-07 06:24:15.431
515482ff-b117-45ef-a98c-470cc67a77f4	af9c5173-13a3-4af9-807a-6f454903f33b	2026-08-07 06:24:17.493
515482ff-b117-45ef-a98c-470cc67a77f4	d7c0b3eb-1a3f-4bad-8804-14f8dd69d683	2026-08-07 06:24:19.674
515482ff-b117-45ef-a98c-470cc67a77f4	daa93e1c-cb45-451f-a2da-806b445b8fbe	2026-08-07 06:24:21.322
515482ff-b117-45ef-a98c-470cc67a77f4	a386d332-b937-4239-af0d-9eafa10d8424	2026-08-07 06:24:22.677
515482ff-b117-45ef-a98c-470cc67a77f4	f2480bb2-85ce-4e3d-bc50-9222d9a1c399	2026-08-07 06:24:24.76
515482ff-b117-45ef-a98c-470cc67a77f4	7fbb9fd9-9612-46a9-a419-2b9a454aa76f	2026-08-07 06:24:26.838
515482ff-b117-45ef-a98c-470cc67a77f4	6e863e3e-0c35-4585-b025-f688f25d201e	2026-08-07 06:24:28.392
515482ff-b117-45ef-a98c-470cc67a77f4	4b6c0ae3-fc4a-4ad9-8864-1c965403e8a6	2026-08-07 06:24:30.458
515482ff-b117-45ef-a98c-470cc67a77f4	153d83c0-4da1-4ab6-9aa6-ecf08de3608c	2026-08-07 06:24:32.163
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	ebc986c9-b411-4a27-8de5-06b67d3eaf76	2026-08-07 06:25:23.581
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	7b0193dd-5508-464b-a2b1-803f9ddc6603	2026-08-07 06:25:24.962
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	9217befe-5768-445b-9fac-db90cc386051	2026-08-07 06:25:26.474
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	af9c5173-13a3-4af9-807a-6f454903f33b	2026-08-07 06:25:27.616
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	d7c0b3eb-1a3f-4bad-8804-14f8dd69d683	2026-08-07 06:25:28.73
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	daa93e1c-cb45-451f-a2da-806b445b8fbe	2026-08-07 06:25:29.941
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	a386d332-b937-4239-af0d-9eafa10d8424	2026-08-07 06:25:31.107
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	f2480bb2-85ce-4e3d-bc50-9222d9a1c399	2026-08-07 06:25:32.142
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	7fbb9fd9-9612-46a9-a419-2b9a454aa76f	2026-08-07 06:25:33.241
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	6e863e3e-0c35-4585-b025-f688f25d201e	2026-08-07 06:25:34.562
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	4b6c0ae3-fc4a-4ad9-8864-1c965403e8a6	2026-08-07 06:25:35.785
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	153d83c0-4da1-4ab6-9aa6-ecf08de3608c	2026-08-07 06:25:36.98
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, code, name, description, "parentRoleId", "delegationLevel", "isActive", "createdAt", "updatedAt") FROM stdin;
515482ff-b117-45ef-a98c-470cc67a77f4	SUPER_ADMIN	Super Admin	Full system control	\N	100	t	2026-08-06 07:47:11.594	2026-08-07 06:23:01.007
ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	ADMIN	Admin	Platform administration	\N	80	t	2026-08-06 07:47:11.802	2026-08-07 06:23:01.277
163e0fcd-d5f2-4640-a6e7-304dfc321b40	DEPT_MANAGER	Department Manager	Departmental authority	\N	50	t	2026-08-06 07:47:12.005	2026-08-07 06:23:02.112
4fe4acae-0aad-458e-8a85-68189bf6a2f4	EMPLOYEE	Employee	Standard staff with AI chat	\N	10	t	2026-08-06 07:47:12.213	2026-08-07 06:23:02.366
00468d26-87d5-4644-9102-0a676bbb79ac	CONTRACTOR	Contractor	Third-party restricted access	\N	5	t	2026-08-06 07:47:12.418	2026-08-07 06:23:02.588
a4f2d40b-7a40-41a4-b2aa-14282c218ea7	GUEST	Guest	Read-only sandbox access	\N	0	t	2026-08-06 07:47:12.621	2026-08-07 06:23:02.835
f5a07340-caec-4834-b696-18dcf96cf6fc	TEST ROLE	Test role	kldn	\N	40	t	2026-08-07 10:12:45.914	2026-08-07 10:12:45.914
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.system_settings (id, category, key, value, version, "isActive", "updatedAt") FROM stdin;
f6474a3a-078c-4270-ae67-4f43dfd1c1e9	AUTH	auth.registration_approval_required	true	1	t	2026-08-06 07:51:40.325
36ebbf50-4eb3-4dd2-b2b4-22b763c76ae0	SECURITY	security.jwt_ttl_seconds	28800	1	t	2026-08-06 07:51:41.453
6d8e4d0d-9ab7-45a2-9907-d3725c805ecf	AI	ai.monthly_quota_pkr	15000	1	t	2026-08-06 07:51:42.567
13757c49-48df-4ee5-a741-ac4b521d243c	COSTS	costs.pkr_per_usd	280	1	t	2026-08-06 07:51:43.678
f2449ce8-6447-4db2-90bd-a6c22dc96de7	AI	admin_agents	[{"name":"Report Generator","model":"llama-3.3-70b-versatile","temp":0.7,"status":"Active"},{"name":"Data Analyst","model":"llama-3.3-70b-versatile","temp":0.5,"status":"Active"},{"name":"HR Assistant","model":"llama-3.1-8b-instant","temp":0.3,"status":"Draft"}]	1	t	2026-08-07 05:55:20.472
48fef786-0c0a-457b-a9c9-8e842c4224ca	SYSTEM	admin_workflows	[{"name":"Report Generation Pipeline","agents":3,"status":"Active"},{"name":"Customer Analysis Flow","agents":2,"status":"Testing"},{"name":"Data Validation Chain","agents":4,"status":"Draft"}]	1	t	2026-08-07 05:55:41.504
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.team_members (id, "teamId", "employeeId", role, "joinedAt") FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.teams (id, name, "departmentId", description, status, "createdAt", "updatedAt", "costCenterId", "leadId", "monthlyBudgetPkr", "monthlyTokenLimit", "monthlyRequestLimit", "maxConcurrentSessions", "assignedModels") FROM stdin;
\.


--
-- Data for Name: ui_modules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ui_modules (id, "moduleName", route, icon, "orderIndex", enabled) FROM stdin;
02398d26-7cb2-42cb-a8a0-0811e4ecf600	Overview	/admin	LayoutDashboard	1	t
78aeb51e-ad23-4aec-b500-4061e0a31078	User Management	/admin/users	Users	2	t
8d3fa194-4e03-4244-a5ae-e70e34d972fa	Departments	/admin/departments	Building2	3	t
55ce44d3-0136-4ffd-a9ca-dc8c2d28a28d	Roles & Permissions	/admin/roles	Key	4	t
7bf9e6d1-0f41-43ee-ae20-36f4e36a502f	Analytics	/admin/analytics	BarChart3	5	t
6e5f60a5-4f20-4c3e-886a-8d1f18986214	Cost Control	/admin/costs	DollarSign	6	t
db16e0d4-f619-4813-a9fd-2dd0d28993c3	AI Policies	/admin/policies	Shield	7	t
449aa043-92de-49ad-963a-aeb23352fdc8	Audit Trail	/admin/audit	ScrollText	8	t
\.


--
-- Data for Name: usage_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.usage_logs (id, "employeeId", "aiProvider", "aiModel", "tokensInput", "tokensOutput", "costUsd", department, "createdAt") FROM stdin;
56a49eb8-1fb4-40a2-824b-05e99d8e8ac5	6d21781a-a218-4548-8b2a-ff16f3eecb33	openai	gpt-3.5-turbo	58	45	0.0965	IT Department	2026-08-06 12:18:40.388
9ab654f4-8a9c-4dbd-b7f0-3368a3dd3c30	6d21781a-a218-4548-8b2a-ff16f3eecb33	openai	gpt-3.5-turbo	114	98	0.20400000000000001	IT Department	2026-08-06 12:19:16.07
86e8291c-fc31-4117-84e8-1f05bb4553ef	678dfb75-5040-4ad2-8348-b690cf718faa	openai	gpt-4o	58	24	0.385	Executive Office	2026-08-07 05:47:46.222
aae681f2-f720-4d0c-aaf9-e8cb521fb31e	678dfb75-5040-4ad2-8348-b690cf718faa	openai	gpt-4o	52	10	0.23	Executive Office	2026-08-07 07:07:24.853
b0a5f8ca-0bae-4a1b-bdd9-f0ec2efce823	678dfb75-5040-4ad2-8348-b690cf718faa	openai	gpt-4o	75	31	0.4975	Executive Office	2026-08-10 05:38:24.561
c12edf20-289e-430a-b55b-a23d854812d3	678dfb75-5040-4ad2-8348-b690cf718faa	openai	gpt-4o	54	46	0.595	Executive Office	2026-08-10 06:28:36.119
31a3fe15-acd7-45df-b93e-d27d5e8154f9	678dfb75-5040-4ad2-8348-b690cf718faa	openai	gpt-4o	141	60	0.9524999999999999	Executive Office	2026-08-10 06:29:02.38
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_roles (id, "userId", "roleId", "assignedById", "assignedAt") FROM stdin;
33f11500-1c1a-4c73-8085-aba2b2b22815	678dfb75-5040-4ad2-8348-b690cf718faa	515482ff-b117-45ef-a98c-470cc67a77f4	\N	2026-08-06 07:51:48.448
17709fdc-846b-4b6a-bb97-5fabc0d16876	6d21781a-a218-4548-8b2a-ff16f3eecb33	ff8a7ff6-e428-4ba1-a7a9-b8ef0df5f947	\N	2026-08-06 07:51:49.828
a997dd87-a82e-43c9-9288-9581eaa030c5	b9e13fee-ef83-44bc-acff-03b23eb15194	163e0fcd-d5f2-4640-a6e7-304dfc321b40	\N	2026-08-06 07:51:51.192
3e9df0c0-9554-4687-a725-061304e99635	7de5e7de-713a-4376-8c56-428cfefd6e71	4fe4acae-0aad-458e-8a85-68189bf6a2f4	\N	2026-08-06 07:51:52.536
c3fcf077-0c36-4c94-874f-d6fa50c06f53	08576d31-e40f-4cea-a52a-029846ca70fb	00468d26-87d5-4644-9102-0a676bbb79ac	\N	2026-08-06 07:51:53.931
5a1a07f2-5fa1-40f1-b539-3a051bdde508	95e4e762-0159-4d94-a40b-ed00689efce6	a4f2d40b-7a40-41a4-b2aa-14282c218ea7	\N	2026-08-06 07:51:55.285
\.


--
-- Data for Name: workflow_steps; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workflow_steps (id, "workflowId", name, "orderIndex", "agentId", "configJson", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workflows (id, name, agents, description, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: active_sessions active_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT active_sessions_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: ai_models ai_models_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_pkey PRIMARY KEY (id);


--
-- Name: ai_policies ai_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_policies
    ADD CONSTRAINT ai_policies_pkey PRIMARY KEY (id);


--
-- Name: api_credentials api_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_credentials
    ADD CONSTRAINT api_credentials_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_attachments chat_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_attachments
    ADD CONSTRAINT chat_attachments_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: delegated_assignments delegated_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegated_assignments
    ADD CONSTRAINT delegated_assignments_pkey PRIMARY KEY (id);


--
-- Name: delegation_policies delegation_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegation_policies
    ADD CONSTRAINT delegation_policies_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employee_master employee_master_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: knowledge_bases knowledge_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.knowledge_bases
    ADD CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: model_health_checks model_health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.model_health_checks
    ADD CONSTRAINT model_health_checks_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: policy_evaluation_logs policy_evaluation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.policy_evaluation_logs
    ADD CONSTRAINT policy_evaluation_logs_pkey PRIMARY KEY (id);


--
-- Name: policy_scopes policy_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.policy_scopes
    ADD CONSTRAINT policy_scopes_pkey PRIMARY KEY (id);


--
-- Name: prompt_templates prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prompt_templates
    ADD CONSTRAINT prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: quota_configs quota_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quota_configs
    ADD CONSTRAINT quota_configs_pkey PRIMARY KEY (id);


--
-- Name: role_modules role_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_modules
    ADD CONSTRAINT role_modules_pkey PRIMARY KEY ("roleId", "moduleId");


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY ("roleId", "permissionId");


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: ui_modules ui_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ui_modules
    ADD CONSTRAINT ui_modules_pkey PRIMARY KEY (id);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: active_sessions_employeeId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "active_sessions_employeeId_idx" ON public.active_sessions USING btree ("employeeId");


--
-- Name: active_sessions_lastActiveAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "active_sessions_lastActiveAt_idx" ON public.active_sessions USING btree ("lastActiveAt");


--
-- Name: active_sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "active_sessions_sessionToken_key" ON public.active_sessions USING btree ("sessionToken");


--
-- Name: agents_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX agents_name_key ON public.agents USING btree (name);


--
-- Name: ai_models_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_models_category_idx ON public.ai_models USING btree (category);


--
-- Name: ai_models_credentialId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ai_models_credentialId_idx" ON public.ai_models USING btree ("credentialId");


--
-- Name: ai_models_enabled_isDefault_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ai_models_enabled_isDefault_idx" ON public.ai_models USING btree (enabled, "isDefault");


--
-- Name: ai_models_provider_modelId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ai_models_provider_modelId_key" ON public.ai_models USING btree (provider, "modelId");


--
-- Name: ai_policies_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_policies_category_idx ON public.ai_policies USING btree (category);


--
-- Name: ai_policies_isActive_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ai_policies_isActive_idx" ON public.ai_policies USING btree ("isActive");


--
-- Name: ai_policies_priority_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_policies_priority_idx ON public.ai_policies USING btree (priority DESC);


--
-- Name: ai_policies_scope_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_policies_scope_idx ON public.ai_policies USING btree (scope);


--
-- Name: ai_policies_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ai_policies_status_idx ON public.ai_policies USING btree (status);


--
-- Name: api_credentials_provider_apiKeyAlias_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "api_credentials_provider_apiKeyAlias_key" ON public.api_credentials USING btree (provider, "apiKeyAlias");


--
-- Name: api_credentials_provider_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX api_credentials_provider_idx ON public.api_credentials USING btree (provider);


--
-- Name: api_credentials_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX api_credentials_status_idx ON public.api_credentials USING btree (status);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_actorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "audit_logs_actorId_idx" ON public.audit_logs USING btree ("actorId");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: chat_attachments_messageId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "chat_attachments_messageId_idx" ON public.chat_attachments USING btree ("messageId");


--
-- Name: chat_attachments_sessionId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "chat_attachments_sessionId_idx" ON public.chat_attachments USING btree ("sessionId");


--
-- Name: chat_attachments_storageKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "chat_attachments_storageKey_key" ON public.chat_attachments USING btree ("storageKey");


--
-- Name: chat_sessions_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "chat_sessions_createdAt_idx" ON public.chat_sessions USING btree ("createdAt");


--
-- Name: chat_sessions_employeeId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "chat_sessions_employeeId_idx" ON public.chat_sessions USING btree ("employeeId");


--
-- Name: chat_sessions_isArchived_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "chat_sessions_isArchived_idx" ON public.chat_sessions USING btree ("isArchived");


--
-- Name: cost_centers_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX cost_centers_code_key ON public.cost_centers USING btree (code);


--
-- Name: cost_centers_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX cost_centers_name_key ON public.cost_centers USING btree (name);


--
-- Name: departments_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX departments_code_key ON public.departments USING btree (code);


--
-- Name: departments_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX departments_name_key ON public.departments USING btree (name);


--
-- Name: documents_knowledgeBaseId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "documents_knowledgeBaseId_idx" ON public.documents USING btree ("knowledgeBaseId");


--
-- Name: employee_master_companyEmail_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "employee_master_companyEmail_key" ON public.employee_master USING btree ("companyEmail");


--
-- Name: employee_master_employeeId_companyEmail_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "employee_master_employeeId_companyEmail_key" ON public.employee_master USING btree ("employeeId", "companyEmail");


--
-- Name: employee_master_employeeId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "employee_master_employeeId_key" ON public.employee_master USING btree ("employeeId");


--
-- Name: employees_departmentId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "employees_departmentId_idx" ON public.employees USING btree ("departmentId");


--
-- Name: employees_department_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX employees_department_idx ON public.employees USING btree (department);


--
-- Name: employees_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);


--
-- Name: employees_employeeId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "employees_employeeId_key" ON public.employees USING btree ("employeeId");


--
-- Name: employees_isActive_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "employees_isActive_idx" ON public.employees USING btree ("isActive");


--
-- Name: employees_registrationStatus_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "employees_registrationStatus_idx" ON public.employees USING btree ("registrationStatus");


--
-- Name: employees_role_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX employees_role_idx ON public.employees USING btree (role);


--
-- Name: feature_flags_featureName_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "feature_flags_featureName_key" ON public.feature_flags USING btree ("featureName");


--
-- Name: knowledge_bases_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX knowledge_bases_name_key ON public.knowledge_bases USING btree (name);


--
-- Name: messages_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "messages_createdAt_idx" ON public.messages USING btree ("createdAt");


--
-- Name: messages_sessionId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "messages_sessionId_idx" ON public.messages USING btree ("sessionId");


--
-- Name: model_health_checks_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "model_health_checks_createdAt_idx" ON public.model_health_checks USING btree ("createdAt");


--
-- Name: model_health_checks_modelId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "model_health_checks_modelId_idx" ON public.model_health_checks USING btree ("modelId");


--
-- Name: model_health_checks_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX model_health_checks_status_idx ON public.model_health_checks USING btree (status);


--
-- Name: permissions_module_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX permissions_module_idx ON public.permissions USING btree (module);


--
-- Name: permissions_permissionKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "permissions_permissionKey_key" ON public.permissions USING btree ("permissionKey");


--
-- Name: permissions_resource_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX permissions_resource_idx ON public.permissions USING btree (resource);


--
-- Name: policy_evaluation_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "policy_evaluation_logs_createdAt_idx" ON public.policy_evaluation_logs USING btree ("createdAt");


--
-- Name: policy_evaluation_logs_decision_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX policy_evaluation_logs_decision_idx ON public.policy_evaluation_logs USING btree (decision);


--
-- Name: policy_evaluation_logs_employeeId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "policy_evaluation_logs_employeeId_idx" ON public.policy_evaluation_logs USING btree ("employeeId");


--
-- Name: policy_evaluation_logs_policyId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "policy_evaluation_logs_policyId_idx" ON public.policy_evaluation_logs USING btree ("policyId");


--
-- Name: policy_scopes_policyId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "policy_scopes_policyId_idx" ON public.policy_scopes USING btree ("policyId");


--
-- Name: policy_scopes_policyId_scopeType_targetId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "policy_scopes_policyId_scopeType_targetId_key" ON public.policy_scopes USING btree ("policyId", "scopeType", "targetId");


--
-- Name: policy_scopes_scopeType_targetId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "policy_scopes_scopeType_targetId_idx" ON public.policy_scopes USING btree ("scopeType", "targetId");


--
-- Name: prompt_templates_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX prompt_templates_name_key ON public.prompt_templates USING btree (name);


--
-- Name: quota_configs_scope_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX quota_configs_scope_idx ON public.quota_configs USING btree (scope);


--
-- Name: quota_configs_scope_scopeTargetId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "quota_configs_scope_scopeTargetId_key" ON public.quota_configs USING btree (scope, "scopeTargetId");


--
-- Name: roles_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);


--
-- Name: team_members_employeeId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "team_members_employeeId_idx" ON public.team_members USING btree ("employeeId");


--
-- Name: team_members_teamId_employeeId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "team_members_teamId_employeeId_key" ON public.team_members USING btree ("teamId", "employeeId");


--
-- Name: team_members_teamId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "team_members_teamId_idx" ON public.team_members USING btree ("teamId");


--
-- Name: teams_departmentId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "teams_departmentId_idx" ON public.teams USING btree ("departmentId");


--
-- Name: ui_modules_route_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX ui_modules_route_key ON public.ui_modules USING btree (route);


--
-- Name: usage_logs_aiProvider_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "usage_logs_aiProvider_idx" ON public.usage_logs USING btree ("aiProvider");


--
-- Name: usage_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "usage_logs_createdAt_idx" ON public.usage_logs USING btree ("createdAt");


--
-- Name: usage_logs_department_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX usage_logs_department_idx ON public.usage_logs USING btree (department);


--
-- Name: usage_logs_employeeId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "usage_logs_employeeId_idx" ON public.usage_logs USING btree ("employeeId");


--
-- Name: user_roles_userId_roleId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON public.user_roles USING btree ("userId", "roleId");


--
-- Name: workflow_steps_workflowId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "workflow_steps_workflowId_idx" ON public.workflow_steps USING btree ("workflowId");


--
-- Name: workflows_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX workflows_name_key ON public.workflows USING btree (name);


--
-- Name: active_sessions active_sessions_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.active_sessions
    ADD CONSTRAINT "active_sessions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_models ai_models_credentialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT "ai_models_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES public.api_credentials(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ai_policies ai_policies_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_policies
    ADD CONSTRAINT "ai_policies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ai_policies ai_policies_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_policies
    ADD CONSTRAINT "ai_policies_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_attachments chat_attachments_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_attachments
    ADD CONSTRAINT "chat_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public.messages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_attachments chat_attachments_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_attachments
    ADD CONSTRAINT "chat_attachments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.chat_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_attachments chat_attachments_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_attachments
    ADD CONSTRAINT "chat_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT "chat_sessions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delegated_assignments delegated_assignments_assignedRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegated_assignments
    ADD CONSTRAINT "delegated_assignments_assignedRoleId_fkey" FOREIGN KEY ("assignedRoleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delegated_assignments delegated_assignments_delegatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegated_assignments
    ADD CONSTRAINT "delegated_assignments_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delegated_assignments delegated_assignments_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegated_assignments
    ADD CONSTRAINT "delegated_assignments_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delegation_policies delegation_policies_maxAssignableRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegation_policies
    ADD CONSTRAINT "delegation_policies_maxAssignableRoleId_fkey" FOREIGN KEY ("maxAssignableRoleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: delegation_policies delegation_policies_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delegation_policies
    ADD CONSTRAINT "delegation_policies_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departments departments_headOfDepartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_headOfDepartmentId_fkey" FOREIGN KEY ("headOfDepartmentId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_knowledgeBaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES public.knowledge_bases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: feature_flags feature_flags_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT "feature_flags_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: feature_flags feature_flags_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT "feature_flags_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.chat_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: model_health_checks model_health_checks_credentialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.model_health_checks
    ADD CONSTRAINT "model_health_checks_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES public.api_credentials(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: model_health_checks model_health_checks_modelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.model_health_checks
    ADD CONSTRAINT "model_health_checks_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES public.ai_models(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: policy_evaluation_logs policy_evaluation_logs_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.policy_evaluation_logs
    ADD CONSTRAINT "policy_evaluation_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: policy_evaluation_logs policy_evaluation_logs_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.policy_evaluation_logs
    ADD CONSTRAINT "policy_evaluation_logs_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public.ai_policies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: policy_scopes policy_scopes_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.policy_scopes
    ADD CONSTRAINT "policy_scopes_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public.ai_policies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_modules role_modules_moduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_modules
    ADD CONSTRAINT "role_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES public.ui_modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_modules role_modules_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_modules
    ADD CONSTRAINT "role_modules_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles roles_parentRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "roles_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: team_members team_members_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "team_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: team_members team_members_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teams teams_costCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "teams_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: teams teams_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teams teams_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "teams_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usage_logs usage_logs_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT "usage_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assignedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workflow_steps workflow_steps_workflowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT "workflow_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES public.workflows(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict uhaSF6ck2dlohz7vmgmHNGVuGRzL0ZxADfOnSui27G6mlBPGqN9MLrrGGfWerZm

