from fastapi import APIRouter
from database import db

router = APIRouter(prefix="/api", tags=["stubs"])


@router.get("/agent-executions")
async def list_executions(project_id: str = None):
    query = {"project_id": project_id} if project_id else {}
    docs = await db.agent_executions.find(query).sort("created_at", -1).limit(50).to_list(50)
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
    return docs


@router.get("/playwright-runs")
async def list_playwright_runs(execution_id: str = None):
    query = {"execution_id": execution_id} if execution_id else {}
    docs = await db.playwright_runs.find(query).sort("created_at", -1).limit(50).to_list(50)
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
    return docs


@router.get("/code-analyses")
async def list_code_analyses(project_id: str = None):
    query = {"project_id": project_id} if project_id else {}
    docs = await db.code_analyses.find(query).sort("created_at", -1).limit(50).to_list(50)
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
    return docs


@router.get("/reports")
async def list_reports(project_id: str = None):
    query = {"project_id": project_id} if project_id else {}
    docs = await db.reports.find(query).sort("created_at", -1).limit(50).to_list(50)
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
    return docs


@router.get("/token-usage")
async def list_token_usage(project_id: str = None, execution_id: str = None):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if execution_id:
        query["execution_id"] = execution_id
    docs = await db.token_usage.find(query).sort("created_at", -1).limit(100).to_list(100)
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
    return docs
