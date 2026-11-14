import asyncio
from contextlib import suppress
from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pymongo import ASCENDING, DESCENDING, IndexModel
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import db, client
from models import Organization, User
from routes.projects import router as projects_router
from routes.documents import router as documents_router
from routes.providers import router as providers_router
from routes.models_routes import router as models_router
from routes.dashboard import router as dashboard_router
from routes.audit import router as audit_router

INDEXES: dict[str, list[IndexModel]] = {
    "projects": [
        IndexModel([("status", ASCENDING)], name="status"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
    "documents": [
        IndexModel([("project_id", ASCENDING), ("doc_type", ASCENDING), ("status", ASCENDING)], name="proj_type_status"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
    "ai_providers": [
        IndexModel([("organization_id", ASCENDING)], name="org"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
    "ai_models": [
        IndexModel([("provider_id", ASCENDING)], name="provider"),
        IndexModel([("model_id", ASCENDING)], name="model_id"),
    ],
    "model_assignments": [
        IndexModel([("task_type", ASCENDING), ("level", ASCENDING)], name="task_level"),
    ],
    "audit_logs": [
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("resource_type", ASCENDING)], name="resource_type"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logging.getLogger(__name__).error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


async def seed_defaults():
    org = await db.organizations.find_one({"_id": "default"})
    if not org:
        default_org = Organization(slug="default", name="Default Organization")
        doc = default_org.to_mongo()
        doc["_id"] = "default"
        await db.organizations.insert_one(doc)

    admin = await db.users.find_one({"email": "admin@platform.com"})
    if not admin:
        admin_user = User(email="admin@platform.com", name="System Admin", role="super_admin")
        await db.users.insert_one(admin_user.to_mongo())


app = FastAPI(title="AI Regression Testing Platform", version="1.0.0")

app.include_router(projects_router)
app.include_router(documents_router)
app.include_router(providers_router)
app.include_router(models_router)
app.include_router(dashboard_router)
app.include_router(audit_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed_defaults()
    logger.info("AI Regression Testing Platform started")


@app.on_event("shutdown")
async def on_shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
