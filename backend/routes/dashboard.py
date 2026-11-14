from fastapi import APIRouter
from database import db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats():
    projects_count = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": "active"})
    documents_count = await db.documents.count_documents({"status": "active"})
    providers_count = await db.ai_providers.count_documents({})
    active_providers = await db.ai_providers.count_documents({"status": "active"})
    models_count = await db.ai_models.count_documents({})
    assignments_count = await db.model_assignments.count_documents({})

    recent_projects = await db.projects.find(
        {}, {"_id": 1, "name": 1, "status": 1, "document_status": 1, "stats": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(5)
    for p in recent_projects:
        p["id"] = str(p.pop("_id"))

    recent_logs = await db.audit_logs.find(
        {}, {"_id": 1, "action": 1, "resource_type": 1, "resource_name": 1, "user_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    for l in recent_logs:
        l["id"] = str(l.pop("_id"))

    return {
        "projects": {"total": projects_count, "active": active_projects},
        "documents": {"total": documents_count},
        "providers": {"total": providers_count, "active": active_providers},
        "models": {"total": models_count},
        "assignments": {"total": assignments_count},
        "recent_projects": recent_projects,
        "recent_activity": recent_logs,
    }


@router.get("/recent-activity")
async def get_recent_activity(limit: int = 20):
    logs = await db.audit_logs.find().sort("created_at", -1).limit(limit).to_list(limit)
    for l in logs:
        l["id"] = str(l.pop("_id"))
    return logs
