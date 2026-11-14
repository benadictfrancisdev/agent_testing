from fastapi import APIRouter, HTTPException
from database import db
from models import (
    Project, ProjectCreate, ProjectUpdate,
    RepositoryConfigUpdate, ApplicationConfigUpdate,
    AuditLog,
)
from datetime import datetime, timezone

router = APIRouter(prefix="/api/projects", tags=["projects"])


async def log_audit(action, resource_type, resource_id, resource_name="", details=None):
    entry = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        details=details or {},
    )
    await db.audit_logs.insert_one(entry.to_mongo())


@router.get("")
async def list_projects(status: str = None, search: str = None):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    cursor = db.projects.find(query, {"_id": 1, "name": 1, "description": 1, "status": 1,
                                       "repository": 1, "application": 1, "document_status": 1,
                                       "stats": 1, "tags": 1, "created_at": 1, "updated_at": 1})
    cursor.sort("created_at", -1)
    docs = await cursor.to_list(200)
    return [Project.from_mongo(d).model_dump() for d in docs]


@router.post("", status_code=201)
async def create_project(body: ProjectCreate):
    project = Project(name=body.name, description=body.description, tags=body.tags)
    await db.projects.insert_one(project.to_mongo())
    await log_audit("created", "project", project.id, project.name)
    return project.model_dump()


@router.get("/{project_id}")
async def get_project(project_id: str):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(404, "Project not found")
    return Project.from_mongo(doc).model_dump()


@router.put("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one({"_id": project_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Project not found")
    await log_audit("updated", "project", project_id, details=updates)
    doc = await db.projects.find_one({"_id": project_id})
    return Project.from_mongo(doc).model_dump()


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    await db.documents.delete_many({"project_id": project_id})
    await log_audit("deleted", "project", project_id)
    return {"status": "deleted"}


@router.put("/{project_id}/repository")
async def update_repository_config(project_id: str, body: RepositoryConfigUpdate):
    repo_data = body.model_dump()
    if body.url and not body.owner:
        parts = body.url.rstrip("/").split("/")
        if len(parts) >= 2:
            repo_data["owner"] = parts[-2]
            repo_data["name"] = parts[-1].replace(".git", "")
    repo_data["connected"] = bool(body.url)
    updates = {f"repository.{k}": v for k, v in repo_data.items()}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one({"_id": project_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Project not found")
    await log_audit("updated", "project", project_id, details={"repository": repo_data})
    doc = await db.projects.find_one({"_id": project_id})
    return Project.from_mongo(doc).model_dump()


@router.put("/{project_id}/application")
async def update_application_config(project_id: str, body: ApplicationConfigUpdate):
    app_data = body.model_dump()
    app_data["auth_configured"] = False
    updates = {f"application.{k}": v for k, v in app_data.items()}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one({"_id": project_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Project not found")
    await log_audit("updated", "project", project_id, details={"application": app_data})
    doc = await db.projects.find_one({"_id": project_id})
    return Project.from_mongo(doc).model_dump()
