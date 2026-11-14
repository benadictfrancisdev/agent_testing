"""Single AI orchestrator: one Claude tool-calling loop with persistent run state."""
import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from database import db

logger = logging.getLogger(__name__)

TOOL_DEFS = [
    {"type": "function", "function": {"name": "fetch_repo", "description": "Clone/fetch the configured GitHub repository. Returns file tree and recent commits.", "parameters": {"type": "object", "properties": {"depth": {"type": "integer", "description": "Clone depth", "default": 50}}, "required": []}}},
    {"type": "function", "function": {"name": "read_requirements_docs", "description": "Read the uploaded requirement documents (plan.md, scenario.md, functionalities-scenario.md).", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "diff_commits_against_baseline", "description": "Show git diff between the baseline commit and the current HEAD.", "parameters": {"type": "object", "properties": {"baseline_sha": {"type": "string", "description": "Baseline commit SHA to diff against. Use the first commit if unknown."}}, "required": []}}},
    {"type": "function", "function": {"name": "list_changed_files_and_symbols", "description": "List files changed since baseline with status (A/M/D) and changed function/class names.", "parameters": {"type": "object", "properties": {"baseline_sha": {"type": "string"}}, "required": []}}},
    {"type": "function", "function": {"name": "detect_stack", "description": "Detect the application's technology stack from repo files.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "playwright_login", "description": "Log into the application using a vaulted test account. The password is injected securely — never include it in your response.", "parameters": {"type": "object", "properties": {"account_id": {"type": "string", "description": "Test account ID from the vault"}}, "required": ["account_id"]}}},
    {"type": "function", "function": {"name": "playwright_explore", "description": "Navigate the authenticated application, capture page structure, links, forms, and take a screenshot.", "parameters": {"type": "object", "properties": {"url": {"type": "string", "description": "URL to navigate to (must be within authorized domains)"}, "action": {"type": "string", "description": "Optional: click a selector, fill a form, etc.", "default": ""}}, "required": ["url"]}}},
    {"type": "function", "function": {"name": "playwright_run_scenario", "description": "Execute a sequence of browser steps described in natural language and report pass/fail.", "parameters": {"type": "object", "properties": {"scenario_description": {"type": "string"}, "steps": {"type": "array", "items": {"type": "string"}}}, "required": ["scenario_description", "steps"]}}},
    {"type": "function", "function": {"name": "api_test", "description": "Make an HTTP request to test an API endpoint.", "parameters": {"type": "object", "properties": {"method": {"type": "string"}, "url": {"type": "string"}, "headers": {"type": "object"}, "body": {"type": "string"}}, "required": ["method", "url"]}}},
    {"type": "function", "function": {"name": "collect_evidence", "description": "Store a piece of evidence (screenshot, log, trace) for the report.", "parameters": {"type": "object", "properties": {"label": {"type": "string"}, "evidence_type": {"type": "string", "enum": ["screenshot", "log", "trace", "api_response", "diff"]}, "content": {"type": "string", "description": "Text content or base64 image data (truncated if needed)"}}, "required": ["label", "evidence_type", "content"]}}},
    {"type": "function", "function": {"name": "write_report", "description": "Write the final structured test report. Call this when all testing is complete.", "parameters": {"type": "object", "properties": {"summary": {"type": "string"}, "files_changed": {"type": "integer"}, "tests_passed": {"type": "integer"}, "tests_failed": {"type": "integer"}, "tests_blocked": {"type": "integer"}, "critical_defects": {"type": "array", "items": {"type": "string"}}, "findings": {"type": "array", "items": {"type": "object", "properties": {"test_id": {"type": "string"}, "category": {"type": "string"}, "description": {"type": "string"}, "status": {"type": "string"}, "expected": {"type": "string"}, "actual": {"type": "string"}, "evidence_label": {"type": "string"}, "severity": {"type": "string"}}}}}, "required": ["summary", "findings"]}}},
]


def build_system_prompt(project, docs, test_accounts):
    doc_summaries = ""
    for d in docs:
        doc_summaries += f"\n### {d.get('doc_type', 'unknown')} ({d.get('filename', '')})\nWord count: {d.get('metadata', {}).get('word_count', 0)}, Sections: {len(d.get('metadata', {}).get('sections', []))}\n"

    account_refs = ""
    for a in test_accounts:
        account_refs += f"- ID: {a['_id']}, Label: {a.get('label','')}, Role: {a.get('role','')}, Username: {a.get('username','')}\n"

    repo = project.get("repository", {})
    app = project.get("application", {})

    return f"""You are Ayksa, an autonomous AI testing agent. You test software applications end-to-end.

## Your Mission
Analyze the connected repository, understand requirements from the uploaded documents, identify code changes, and test the application through its UI and APIs. Produce a factual, evidence-backed report.

## Project Configuration
- Repository: {repo.get('url', 'Not configured')} (branch: {repo.get('branch', 'main')})
- Application URL: {app.get('url', 'Not configured')} (env: {app.get('environment', 'staging')})
- Authorized domains: {', '.join(app.get('authorized_domains', [])) or 'Not restricted'}

## Available Documents
{doc_summaries or 'No documents uploaded yet.'}

## Test Accounts (credential references — NEVER output passwords)
{account_refs or 'No test accounts configured.'}

## Rules
1. NEVER output, log, or include passwords or secrets in your responses.
2. NEVER modify the repository — read-only access only.
3. Only test within authorized domains. Do not navigate outside them.
4. Report only actual findings — never simulate or fabricate results.
5. Distinguish application defects from environment/automation issues.
6. Preserve full error messages and stack traces.
7. Call write_report when done with a structured summary of all findings.

## Workflow
1. Fetch the repo and detect the stack.
2. Read requirement documents to understand expected behavior.
3. Diff commits to identify what changed.
4. Log into the application using a test account.
5. Explore the UI and verify key workflows from the documents.
6. Collect evidence (screenshots, logs) for every finding.
7. Write the final report with pass/fail per test, evidence, and impact analysis.

Begin when instructed."""


async def update_run(run_id, updates):
    await db.runs.update_one({"_id": run_id}, {"$set": updates})


async def append_tool_call(run_id, entry):
    await db.runs.update_one({"_id": run_id}, {"$push": {"tool_calls": entry}})


async def run_agent(run_id: str, project_id: str):
    """Main agent loop — runs as a background task."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    from agent.tools import execute_tool

    project = await db.projects.find_one({"_id": project_id})
    if not project:
        await update_run(run_id, {"status": "failed", "error": "Project not found"})
        return

    docs = await db.documents.find({"project_id": project_id, "status": "active"}).to_list(10)
    test_accounts = await db.test_accounts.find({"project_id": project_id}).to_list(10)

    system = build_system_prompt(project, docs, test_accounts)
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        await update_run(run_id, {"status": "failed", "error": "No LLM API key configured"})
        return

    chat = LlmChat(api_key=api_key, session_id=run_id, system_message=system)
    chat = chat.with_model("anthropic", "claude-sonnet-5-5")
    chat = chat.with_tools(TOOL_DEFS, tool_choice="auto")

    await update_run(run_id, {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()})

    user_msg = UserMessage(text="Begin testing. Fetch the repository, read requirements, analyze changes, test the application, and produce a report.")
    total_input = 0
    total_output = 0

    try:
        for step in range(40):
            response = await chat.send_message_with_tools(user_msg)

            # Track tokens
            if response.raw:
                usage = getattr(response.raw, "usage", None)
                if usage:
                    total_input += getattr(usage, "prompt_tokens", 0) or 0
                    total_output += getattr(usage, "completion_tokens", 0) or 0

            if not response.tool_calls:
                await update_run(run_id, {
                    "status": "completed",
                    "agent_final_message": response.content or "",
                    "token_usage": {"input_tokens": total_input, "output_tokens": total_output, "model": "claude-sonnet-5-5"},
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "steps_taken": step + 1,
                })
                logger.info(f"Run {run_id} completed in {step+1} steps")
                return

            for tc in response.tool_calls:
                entry = {"step": step, "tool": tc.name, "arguments": tc.arguments, "timestamp": datetime.now(timezone.utc).isoformat()}
                try:
                    result = await execute_tool(tc.name, tc.arguments, project, run_id)
                    result_str = json.dumps(result, default=str)
                    entry["status"] = "success"
                    entry["result_preview"] = result_str[:1500]
                    chat.add_tool_result(tc.id, result_str)
                except Exception as e:
                    entry["status"] = "error"
                    entry["error"] = str(e)
                    chat.add_tool_result(tc.id, json.dumps({"error": str(e)}))

                await append_tool_call(run_id, entry)

            user_msg = None

        await update_run(run_id, {"status": "completed", "agent_final_message": "Max steps reached.",
                                   "token_usage": {"input_tokens": total_input, "output_tokens": total_output, "model": "claude-sonnet-5-5"},
                                   "finished_at": datetime.now(timezone.utc).isoformat()})
    except Exception as e:
        logger.exception(f"Run {run_id} failed: {e}")
        await update_run(run_id, {"status": "failed", "error": str(e),
                                   "token_usage": {"input_tokens": total_input, "output_tokens": total_output, "model": "claude-sonnet-5-5"},
                                   "finished_at": datetime.now(timezone.utc).isoformat()})
