# Ayksa Testing — AI Autonomous Regression Testing Platform

## Architecture
- **Backend**: FastAPI + MongoDB on port 8001
- **Frontend**: React + Tailwind CSS + Shadcn UI on port 3000
- **Agent**: Single Claude orchestrator with structured tool calling via emergentintegrations
- **Browser**: Playwright (Chromium headless) for agent-driven testing
- **Auth**: Clerk (wired, pending platform key activation)

## Data Model
Organization (single) → Applications (projects) → Documents + Test Accounts → Runs → Tool Calls + Evidence + Report + Token Usage

## What's Implemented (Phase 2 — 2026-11-14)

### Working Now
- [x] Dashboard with KPI stats, recent projects, activity feed
- [x] Application (project) CRUD with search
- [x] Document upload (plan.md, scenario.md, functionalities-scenario.md) with markdown preview
- [x] Repository configuration (URL, branch)
- [x] Application configuration with authorized domains + production guard
- [x] Credential vault: encrypted test accounts per project (Fernet encryption, passwords never returned)
- [x] Staging setup documentation in-app
- [x] AI Provider management (Anthropic, OpenAI, Google, Custom)
- [x] Model Registry with capabilities + pricing
- [x] Audit logging with filters
- [x] Rebranded to "Ayksa Testing"
- [x] Stub routes for agent executions, playwright runs, code analyses, reports, token usage
- [x] Run API: POST /api/runs (start), GET /api/runs (list), GET /api/runs/{id} (detail)
- [x] Agent orchestrator: single Claude loop with 12 tools, persistent run state
- [x] Agent tools: fetch_repo, read_requirements_docs, diff_commits, list_changed_files, detect_stack, playwright_login, playwright_explore, api_test, collect_evidence, write_report
- [x] Run view UI: live tool call log, report display, token usage
- [x] Start Run button on project detail

### Blocked (Platform Key Inactive)
- [ ] Clerk auth (files wired, provisioning failed — key inactive)
- [ ] Agent runs (LLM key inactive — orchestrator tested but cannot complete)
- Admin email configured: benadictfrancis.dev@gmail.com

## Next Tasks (Priority Order)
1. **Activate platform keys** (Clerk + LLM) — once active, auth + agent runs work immediately
2. **End-to-end proof**: Connect real repo, start run, verify diff + Playwright login + report
3. Code change analysis with AST parsing for changed functions/classes
4. Full Playwright scenario execution (agent-driven)
5. Report generator with PDF/JSON export
6. Token/cost tracking with budget thresholds
