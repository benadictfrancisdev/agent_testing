# AI Autonomous Regression Testing Platform - PRD

## Original Problem Statement
Build an enterprise-grade AI Autonomous Regression Testing Platform with provider-independent AI Model Gateway, project management, document management, GitHub integration, browser testing, and comprehensive token/cost governance.

## Architecture
- **Backend**: FastAPI + MongoDB (via motor) on port 8001
- **Frontend**: React + Tailwind CSS + Shadcn UI on port 3000
- **Database**: MongoDB (collections: organizations, users, projects, documents, ai_providers, ai_models, model_assignments, audit_logs)
- **Auth**: None (Phase 2)

## User Personas
- Super Admin: Full platform access (seeded: admin@platform.com)
- Project Admin: Manage projects (Phase 2)
- QA Engineer: Execute tests (Phase 2)
- Viewer: Read-only (Phase 2)

## Core Requirements
1. Single-org project management with CRUD
2. Three mandatory document uploads (plan.md, scenario.md, functionalities-scenario.md)
3. Provider-independent AI Model Gateway (Anthropic, OpenAI, Google, Custom)
4. Model registry with capabilities and pricing
5. GitHub repository configuration per project
6. Application URL and credential configuration
7. Audit logging for all platform actions
8. Token usage tracking and cost governance
9. Budget management with thresholds

## What's Been Implemented (Phase 1 - 2026-11-14)
- [x] Dashboard with KPI stats, recent projects, activity feed, quick actions
- [x] Project CRUD (create, read, update, delete, search)
- [x] Project detail with tabs: Overview, Documents, Repository, Application
- [x] Document upload with drag-drop, markdown preview, versioning, metadata extraction
- [x] Repository configuration (URL, branch)
- [x] Application configuration (URL, environment)
- [x] AI Provider management (add, validate, delete, set key)
- [x] Model Registry (register models with capabilities, pricing, context window)
- [x] Model Assignments API (org/project/task level)
- [x] Audit logging with filtering
- [x] Settings page
- [x] Sidebar navigation with collapse
- [x] Dark enterprise theme (Obsidian Zinc + Electric Cyan)
- [x] Seeded admin user and default organization

## Prioritized Backlog
### P0 (Next Phase)
- Authentication and RBAC (login, roles, permissions)
- GitHub API integration (repo connection, branch fetch, commit history)
- Credential vault (encrypted storage for API keys and test credentials)

### P1
- Single AI Agent orchestrator (Claude/OpenAI/Gemini tool calling)
- Git change analysis and code intelligence
- Static analysis and test execution
- Token usage tracking and cost calculations

### P2
- Playwright MCP for browser automation
- Browser login and exploratory testing
- Repeatable E2E regression scripts
- Budget controls and spending limits

### P3
- Regression selection and historical comparisons
- Failure analysis and evidence collection
- Reporting and export (PDF/JSON)
- Multi-organization support

## Next Tasks
1. Implement auth with RBAC (Phase 2)
2. GitHub API integration for repo operations
3. Encrypted credential vault
4. AI agent orchestrator with tool calling
5. Token usage capture and cost dashboard
