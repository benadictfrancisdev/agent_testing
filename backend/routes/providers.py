from fastapi import APIRouter, HTTPException
from database import db
from models import AIProvider, ProviderCreate, ProviderUpdate, AuditLog, ProviderConnection
from datetime import datetime, timezone

router = APIRouter(prefix="/api/providers", tags=["providers"])


async def log_audit(action, resource_type, resource_id, resource_name="", details=None):
    entry = AuditLog(action=action, resource_type=resource_type, resource_id=resource_id,
                     resource_name=resource_name, details=details or {})
    await db.audit_logs.insert_one(entry.to_mongo())


PROVIDER_TYPES = {"anthropic", "openai", "google", "custom"}


@router.get("")
async def list_providers():
    docs = await db.ai_providers.find().sort("created_at", -1).to_list(50)
    results = []
    for d in docs:
        provider = AIProvider.from_mongo(d)
        count = await db.ai_models.count_documents({"provider_id": provider.id})
        p = provider.model_dump()
        p["models_count"] = count
        results.append(p)
    return results


@router.post("", status_code=201)
async def create_provider(body: ProviderCreate):
    if body.provider_type not in PROVIDER_TYPES:
        raise HTTPException(400, f"provider_type must be one of: {', '.join(PROVIDER_TYPES)}")
    provider = AIProvider(
        name=body.name,
        provider_type=body.provider_type,
        display_name=body.display_name or body.name,
        connection=ProviderConnection(endpoint_url=body.endpoint_url),
    )
    await db.ai_providers.insert_one(provider.to_mongo())
    await log_audit("created", "provider", provider.id, provider.name)
    return provider.model_dump()


@router.get("/{provider_id}")
async def get_provider(provider_id: str):
    doc = await db.ai_providers.find_one({"_id": provider_id})
    if not doc:
        raise HTTPException(404, "Provider not found")
    return AIProvider.from_mongo(doc).model_dump()


@router.put("/{provider_id}")
async def update_provider(provider_id: str, body: ProviderUpdate):
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.display_name is not None:
        updates["display_name"] = body.display_name
    if body.status is not None:
        updates["status"] = body.status
    if body.endpoint_url is not None:
        updates["connection.endpoint_url"] = body.endpoint_url
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.ai_providers.update_one({"_id": provider_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Provider not found")
    await log_audit("updated", "provider", provider_id, details=updates)
    doc = await db.ai_providers.find_one({"_id": provider_id})
    return AIProvider.from_mongo(doc).model_dump()


@router.delete("/{provider_id}")
async def delete_provider(provider_id: str):
    result = await db.ai_providers.delete_one({"_id": provider_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Provider not found")
    await db.ai_models.delete_many({"provider_id": provider_id})
    await log_audit("deleted", "provider", provider_id)
    return {"status": "deleted"}


@router.post("/{provider_id}/validate")
async def validate_provider(provider_id: str):
    doc = await db.ai_providers.find_one({"_id": provider_id})
    if not doc:
        raise HTTPException(404, "Provider not found")
    now = datetime.now(timezone.utc).isoformat()
    validation_status = "valid" if doc.get("connection", {}).get("api_key_set") else "no_key"
    await db.ai_providers.update_one(
        {"_id": provider_id},
        {"$set": {
            "connection.last_validated": now,
            "connection.validation_status": validation_status,
            "status": "active" if validation_status == "valid" else "inactive",
            "updated_at": now,
        }},
    )
    await log_audit("validated", "provider", provider_id, details={"validation_status": validation_status})
    updated = await db.ai_providers.find_one({"_id": provider_id})
    return AIProvider.from_mongo(updated).model_dump()


@router.post("/{provider_id}/set-key")
async def set_provider_key(provider_id: str):
    """Mark that an API key has been configured (actual key stored in secret vault)."""
    doc = await db.ai_providers.find_one({"_id": provider_id})
    if not doc:
        raise HTTPException(404, "Provider not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.ai_providers.update_one(
        {"_id": provider_id},
        {"$set": {
            "connection.api_key_set": True,
            "connection.validation_status": "valid",
            "status": "active",
            "updated_at": now,
        }},
    )
    await log_audit("key_configured", "provider", provider_id)
    updated = await db.ai_providers.find_one({"_id": provider_id})
    return AIProvider.from_mongo(updated).model_dump()
