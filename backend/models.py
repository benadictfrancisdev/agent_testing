from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import Annotated, Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid
import hashlib

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: PyObjectId = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        if doc is None:
            return None
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return cls(**doc)

    def to_mongo(self):
        return self.model_dump(by_alias=True)


# --- Sub-models ---
class RepositoryConfig(BaseModel):
    url: str = ""
    owner: str = ""
    name: str = ""
    branch: str = "main"
    connected: bool = False
    last_synced: Optional[str] = None


class ApplicationConfig(BaseModel):
    url: str = ""
    environment: str = "staging"
    auth_configured: bool = False
    authorized_domains: List[str] = []
    production_override: bool = False
    production_override_reason: str = ""


class ProjectStats(BaseModel):
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    blocked: int = 0
    skipped: int = 0
    last_run: Optional[str] = None


class DocumentStatus(BaseModel):
    plan_uploaded: bool = False
    scenario_uploaded: bool = False
    functionalities_uploaded: bool = False


# --- Main Document Models ---
class Project(BaseDocument):
    organization_id: str = "default"
    name: str
    description: str = ""
    status: str = "active"
    repository: RepositoryConfig = Field(default_factory=RepositoryConfig)
    application: ApplicationConfig = Field(default_factory=ApplicationConfig)
    document_status: DocumentStatus = Field(default_factory=DocumentStatus)
    stats: ProjectStats = Field(default_factory=ProjectStats)
    tags: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = "admin"


class DocumentMetadata(BaseModel):
    word_count: int = 0
    line_count: int = 0
    sections: List[str] = []
    requirements_extracted: int = 0


class Document(BaseDocument):
    project_id: str
    doc_type: str
    filename: str
    content: str
    content_hash: str
    version: int = 1
    status: str = "active"
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    uploaded_by: str = "admin"


class ProviderConnection(BaseModel):
    api_key_set: bool = False
    endpoint_url: str = ""
    last_validated: Optional[str] = None
    validation_status: str = "not_validated"


class AIProvider(BaseDocument):
    organization_id: str = "default"
    name: str
    provider_type: str
    display_name: str = ""
    status: str = "inactive"
    connection: ProviderConnection = Field(default_factory=ProviderConnection)
    models_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = "admin"


class ModelCapabilities(BaseModel):
    text_generation: bool = True
    tool_calling: bool = False
    vision: bool = False
    streaming: bool = False
    prompt_caching: bool = False
    structured_output: bool = False
    audio_input: bool = False
    audio_output: bool = False
    video_input: bool = False


class ModelPricing(BaseModel):
    input_per_1m: float = 0.0
    output_per_1m: float = 0.0
    cached_input_per_1m: float = 0.0
    cache_creation_per_1m: float = 0.0


class AIModel(BaseDocument):
    provider_id: str
    provider_type: str
    model_id: str
    display_name: str
    capabilities: ModelCapabilities = Field(default_factory=ModelCapabilities)
    context_window: int = 0
    max_output_tokens: int = 0
    pricing: ModelPricing = Field(default_factory=ModelPricing)
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ModelAssignment(BaseDocument):
    organization_id: str = "default"
    project_id: Optional[str] = None
    task_type: str
    provider_id: str
    model_id: str
    ai_model_db_id: str = ""
    level: str = "organization"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = "admin"


class AuditLog(BaseDocument):
    organization_id: str = "default"
    user_id: str = "admin"
    user_name: str = "System Admin"
    action: str
    resource_type: str
    resource_id: str
    resource_name: str = ""
    details: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Organization(BaseDocument):
    name: str = "Default Organization"
    slug: str = "default"
    plan: str = "enterprise"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class User(BaseDocument):
    email: str
    name: str
    role: str = "super_admin"
    organization_id: str = "default"
    avatar: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# --- Request Models ---
class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    tags: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class RepositoryConfigUpdate(BaseModel):
    url: str
    owner: str = ""
    name: str = ""
    branch: str = "main"


class ApplicationConfigUpdate(BaseModel):
    url: str
    environment: str = "staging"
    authorized_domains: List[str] = []
    production_override: bool = False
    production_override_reason: str = ""


class TestAccountCreate(BaseModel):
    label: str
    role: str = ""
    username: str
    password: str = ""


class ProviderCreate(BaseModel):
    name: str
    provider_type: str
    display_name: str = ""
    endpoint_url: str = ""


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    status: Optional[str] = None
    endpoint_url: Optional[str] = None


class ModelCreate(BaseModel):
    provider_id: str
    provider_type: str
    model_id: str
    display_name: str
    capabilities: Optional[ModelCapabilities] = None
    context_window: int = 0
    max_output_tokens: int = 0
    pricing: Optional[ModelPricing] = None


class ModelAssignmentCreate(BaseModel):
    project_id: Optional[str] = None
    task_type: str
    provider_id: str
    model_id: str
    ai_model_db_id: str = ""
    level: str = "organization"


# --- Utility ---
def compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def extract_markdown_metadata(content: str) -> DocumentMetadata:
    lines = content.split("\n")
    sections = [line.strip("# ").strip() for line in lines if line.startswith("#")]
    words = len(content.split())
    req_keywords = ["must", "shall", "should", "required", "validate", "verify", "ensure"]
    reqs = sum(1 for line in lines if any(k in line.lower() for k in req_keywords))
    return DocumentMetadata(
        word_count=words,
        line_count=len(lines),
        sections=sections[:50],
        requirements_extracted=reqs,
    )
