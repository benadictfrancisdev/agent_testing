import asyncio
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/runs", tags=["runs"])


class RunCreate(BaseModel):
    project_id: str


@router.post("", status_code=201)
async def start_run(body: RunCreate):
    project = await db.projects.find_one({"_id": body.project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    run_id = str(uuid.uuid4())
    run_doc = {
        "_id": run_id,
        "project_id": body.project_id,
        "project_name": project.get("name", ""),
        "status": "queued",
        "tool_calls": [],
        "report": None,
        "token_usage": None,
        "error": None,
        "agent_final_message": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "finished_at": None,
    }
    await db.runs.insert_one(run_doc)

    # Launch agent in background
    from agent.orchestrator import run_agent
    asyncio.create_task(run_agent(run_id, body.project_id))

    run_doc["id"] = run_doc.pop("_id")
    return run_doc


@router.get("")
async def list_runs(project_id: str = None, limit: int = 20):
    query = {}
    if project_id:
        query["project_id"] = project_id
    docs = await db.runs.find(query, {"tool_calls": 0, "report": 0, "agent_final_message": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@router.get("/{run_id}")
async def get_run(run_id: str):
    doc = await db.runs.find_one({"_id": run_id})
    if not doc:
        raise HTTPException(404, "Run not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/{run_id}/evidence")
async def get_run_evidence(run_id: str):
    docs = await db.evidence.find({"run_id": run_id}, {"data_b64": 0}).sort("created_at", 1).to_list(100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@router.get("/{run_id}/evidence/{evidence_id}")
async def get_evidence_detail(run_id: str, evidence_id: str):
    doc = await db.evidence.find_one({"_id": evidence_id, "run_id": run_id})
    if not doc:
        raise HTTPException(404, "Evidence not found")
    doc["id"] = str(doc.pop("_id"))
    return doc
