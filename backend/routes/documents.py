from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from database import db
from models import Document, AuditLog, compute_content_hash, extract_markdown_metadata
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["documents"])

VALID_DOC_TYPES = {"plan", "scenario", "functionalities"}
DOC_TYPE_FIELD_MAP = {
    "plan": "plan_uploaded",
    "scenario": "scenario_uploaded",
    "functionalities": "functionalities_uploaded",
}


async def log_audit(action, resource_type, resource_id, resource_name="", details=None):
    entry = AuditLog(action=action, resource_type=resource_type, resource_id=resource_id,
                     resource_name=resource_name, details=details or {})
    await db.audit_logs.insert_one(entry.to_mongo())


@router.post("/projects/{project_id}/documents")
async def upload_document(
    project_id: str,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
):
    project = await db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")
    if doc_type not in VALID_DOC_TYPES:
        raise HTTPException(400, f"doc_type must be one of: {', '.join(VALID_DOC_TYPES)}")
    if not file.filename.lower().endswith(".md"):
        raise HTTPException(400, "Only .md (Markdown) files are accepted")

    raw = await file.read()
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(400, "File is not valid UTF-8 encoded text")
    content_hash = compute_content_hash(content)

    existing = await db.documents.find_one(
        {"project_id": project_id, "doc_type": doc_type, "status": "active"}
    )
    version = (existing.get("version", 0) + 1) if existing else 1

    if existing:
        if existing.get("content_hash") == content_hash:
            return Document.from_mongo(existing).model_dump()
        await db.documents.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )

    metadata = extract_markdown_metadata(content)
    doc = Document(
        project_id=project_id,
        doc_type=doc_type,
        filename=file.filename,
        content=content,
        content_hash=content_hash,
        version=version,
        metadata=metadata,
    )
    await db.documents.insert_one(doc.to_mongo())

    field = DOC_TYPE_FIELD_MAP[doc_type]
    await db.projects.update_one(
        {"_id": project_id},
        {"$set": {f"document_status.{field}": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await log_audit("uploaded", "document", doc.id, file.filename,
                    {"doc_type": doc_type, "version": version, "project_id": project_id})
    return doc.model_dump()


@router.get("/projects/{project_id}/documents")
async def list_documents(project_id: str, include_archived: bool = False):
    query = {"project_id": project_id}
    if not include_archived:
        query["status"] = "active"
    docs = await db.documents.find(query).sort("created_at", -1).to_list(100)
    results = []
    for d in docs:
        doc_obj = Document.from_mongo(d)
        out = doc_obj.model_dump()
        out.pop("content", None)
        results.append(out)
    return results


@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    return Document.from_mongo(doc).model_dump()


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    await db.documents.delete_one({"_id": document_id})

    remaining = await db.documents.find_one(
        {"project_id": doc["project_id"], "doc_type": doc["doc_type"], "status": "active"}
    )
    if not remaining:
        field = DOC_TYPE_FIELD_MAP.get(doc["doc_type"])
        if field:
            await db.projects.update_one(
                {"_id": doc["project_id"]},
                {"$set": {f"document_status.{field}": False}},
            )
    await log_audit("deleted", "document", document_id, doc.get("filename", ""))
    return {"status": "deleted"}
