from fastapi import APIRouter, HTTPException
from database import db
from models import AIModel, ModelCreate, ModelAssignment, ModelAssignmentCreate, AuditLog
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["models"])


async def log_audit(action, resource_type, resource_id, resource_name="", details=None):
    entry = AuditLog(action=action, resource_type=resource_type, resource_id=resource_id,
                     resource_name=resource_name, details=details or {})
    await db.audit_logs.insert_one(entry.to_mongo())


@router.get("/models")
async def list_models(provider_id: str = None, provider_type: str = None):
    query = {}
    if provider_id:
        query["provider_id"] = provider_id
    if provider_type:
        query["provider_type"] = provider_type
    docs = await db.ai_models.find(query).sort("display_name", 1).to_list(200)
    return [AIModel.from_mongo(d).model_dump() for d in docs]


@router.post("/models", status_code=201)
async def create_model(body: ModelCreate):
    provider = await db.ai_providers.find_one({"_id": body.provider_id})
    if not provider:
        raise HTTPException(404, "Provider not found")
    existing = await db.ai_models.find_one({"provider_id": body.provider_id, "model_id": body.model_id})
    if existing:
        raise HTTPException(409, "Model already registered for this provider")
    if not body.model_id.strip() or not body.display_name.strip():
        raise HTTPException(400, "model_id and display_name cannot be empty")
    from models import ModelCapabilities, ModelPricing
    model = AIModel(
        provider_id=body.provider_id,
        provider_type=provider.get("provider_type", body.provider_type),
        model_id=body.model_id.strip(),
        display_name=body.display_name.strip(),
        capabilities=body.capabilities or ModelCapabilities(),
        context_window=body.context_window,
        max_output_tokens=body.max_output_tokens,
        pricing=body.pricing or ModelPricing(),
    )
    await db.ai_models.insert_one(model.to_mongo())
    await log_audit("registered", "model", model.id, model.display_name)
    return model.model_dump()


@router.get("/models/{model_db_id}")
async def get_model(model_db_id: str):
    doc = await db.ai_models.find_one({"_id": model_db_id})
    if not doc:
        raise HTTPException(404, "Model not found")
    return AIModel.from_mongo(doc).model_dump()


@router.delete("/models/{model_db_id}")
async def delete_model(model_db_id: str):
    doc = await db.ai_models.find_one({"_id": model_db_id})
    if not doc:
        raise HTTPException(404, "Model not found")
    name = doc.get("display_name", "")
    await db.ai_models.delete_one({"_id": model_db_id})
    await db.model_assignments.delete_many({"ai_model_db_id": model_db_id})
    await log_audit("deleted", "model", model_db_id, name)
    return {"status": "deleted"}


# --- Model Assignments ---
@router.get("/model-assignments")
async def list_assignments(project_id: str = None, level: str = None):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if level:
        query["level"] = level
    docs = await db.model_assignments.find(query).sort("task_type", 1).to_list(200)
    return [ModelAssignment.from_mongo(d).model_dump() for d in docs]


@router.post("/model-assignments", status_code=201)
async def create_assignment(body: ModelAssignmentCreate):
    existing = await db.model_assignments.find_one({
        "task_type": body.task_type,
        "level": body.level,
        "project_id": body.project_id,
    })
    if existing:
        await db.model_assignments.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "provider_id": body.provider_id,
                "model_id": body.model_id,
                "ai_model_db_id": body.ai_model_db_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        updated = await db.model_assignments.find_one({"_id": existing["_id"]})
        return ModelAssignment.from_mongo(updated).model_dump()

    assignment = ModelAssignment(
        project_id=body.project_id,
        task_type=body.task_type,
        provider_id=body.provider_id,
        model_id=body.model_id,
        ai_model_db_id=body.ai_model_db_id,
        level=body.level,
    )
    await db.model_assignments.insert_one(assignment.to_mongo())
    await log_audit("assigned", "model_assignment", assignment.id,
                    details={"task": body.task_type, "model": body.model_id})
    return assignment.model_dump()


@router.delete("/model-assignments/{assignment_id}")
async def delete_assignment(assignment_id: str):
    result = await db.model_assignments.delete_one({"_id": assignment_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Assignment not found")
    return {"status": "deleted"}


TASK_TYPES = [
    {"id": "requirement_analysis", "label": "Requirement & Document Analysis"},
    {"id": "code_reasoning", "label": "Repository & Code Reasoning"},
    {"id": "test_planning", "label": "Test Planning & Generation"},
    {"id": "browser_testing", "label": "Browser Exploration & Testing"},
    {"id": "screenshot_analysis", "label": "Screenshot & Visual Analysis"},
    {"id": "failure_investigation", "label": "Failure Investigation & RCA"},
    {"id": "report_generation", "label": "Report Summarization"},
]


@router.get("/task-types")
async def get_task_types():
    return TASK_TYPES
