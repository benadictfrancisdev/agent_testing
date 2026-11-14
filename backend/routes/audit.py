from fastapi import APIRouter, Query
from database import db

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("")
async def list_audit_logs(
    resource_type: str = None,
    action: str = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    query = {}
    if resource_type:
        query["resource_type"] = resource_type
    if action:
        query["action"] = action
    total = await db.audit_logs.count_documents(query)
    docs = await db.audit_logs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return {"total": total, "items": docs, "limit": limit, "skip": skip}
