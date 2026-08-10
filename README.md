# Hamdard AI Platform (HEAIP)

The Hamdard AI Platform is an enterprise-grade, multi-tenant AI governance and operational platform. It provides employees access to a variety of Large Language Models (LLMs) and tools (including document processing, video editing, and image generation) while enforcing strict Delegation-based Role-Based Access Control (dRBAC), budget tracking in local currency (PKR), and comprehensive AI usage policies.

## Features

- **Enterprise Governance:** Granular dRBAC, department and team hierarchies, and hierarchical quotas/budgets.
- **Advanced Policy Engine:** Configurable AI policies to intercept, redact, block, or warn on AI interactions.
- **Multi-Modal AI:** Support for Chat, Document Uploads (PDF/Word), Video Parsing, and Image Generation.
- **Cost Analytics:** Real-time dashboards monitoring token usage and costs across departments and individual models.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (with `pgvector` for future RAG workloads)
- **ORM:** Prisma v7
- **Styling:** Tailwind CSS
- **Orchestration:** Docker & Docker Compose (includes Redis for caching/rate limiting)

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (if running the full stack locally)
- A PostgreSQL 16 database (can be provided by Docker or a managed service like Neon)

### 1. Environment Setup

Copy the example environment files and configure your secrets:

```bash
cp .env.local.example .env.local
cp .env.compose.example .env.compose
```
*Note: Ensure `DATABASE_URL` and `AUTH_SECRET` are correctly set.*

### 2. Local Development (Node.js)

To run the application locally in development mode:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Database Migrations and Seeding:**
   Apply database migrations and populate the database with initial departments, roles, and administrative users:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Production / Docker Compose Deployment

To deploy the entire stack (Next.js, PostgreSQL, Redis) via Docker Compose:

```bash
docker compose --env-file .env.compose up -d --build
```

The application will be exposed on port `3000`. 

## Architecture & Technical Audit

A comprehensive breakdown of the system architecture, component reasoning, known flaws, and the strategic roadmap to production readiness is documented in the [TECHNICAL_AUDIT_REPORT.md](./TECHNICAL_AUDIT_REPORT.md).
