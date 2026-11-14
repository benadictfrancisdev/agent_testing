# Phase 1 regression tests: dashboard, projects, documents, providers, models, assignments, audit
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

created = {"projects": [], "providers": []}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    yield sess
    for pid in created["projects"]:
        sess.delete(f"{API}/projects/{pid}")
    for pid in created["providers"]:
        sess.delete(f"{API}/providers/{pid}")


@pytest.fixture(scope="module")
def project(s):
    r = s.post(f"{API}/projects", json={"name": f"TEST_proj_{uuid.uuid4().hex[:6]}", "description": "d"})
    assert r.status_code == 201
    p = r.json()
    created["projects"].append(p["id"])
    return p


@pytest.fixture(scope="module")
def provider(s):
    r = s.post(f"{API}/providers", json={"name": "TEST_prov", "provider_type": "anthropic"})
    assert r.status_code == 201
    p = r.json()
    created["providers"].append(p["id"])
    return p


# Dashboard
def test_dashboard_stats(s):
    r = s.get(f"{API}/dashboard/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ["projects", "documents", "providers", "models", "recent_projects", "recent_activity"]:
        assert k in d
    assert d["projects"]["total"] == len(s.get(f"{API}/projects").json())
    assert d["providers"]["total"] == len(s.get(f"{API}/providers").json())
    assert all("_id" not in x for x in d["recent_activity"])


def test_recent_activity(s):
    r = s.get(f"{API}/dashboard/recent-activity?limit=5")
    assert r.status_code == 200 and len(r.json()) <= 5


# Projects
def test_project_crud(s, project):
    g = s.get(f"{API}/projects/{project['id']}")
    assert g.status_code == 200 and g.json()["name"] == project["name"]
    assert "_id" not in g.json()
    u = s.put(f"{API}/projects/{project['id']}", json={"description": "updated"})
    assert u.status_code == 200 and u.json()["description"] == "updated"
    assert s.get(f"{API}/projects/{project['id']}").json()["description"] == "updated"


def test_project_search(s, project):
    r = s.get(f"{API}/projects", params={"search": project["name"][:12]})
    assert r.status_code == 200
    assert any(p["id"] == project["id"] for p in r.json())


def test_project_search_regex_special_chars(s):
    r = s.get(f"{API}/projects", params={"search": "("})
    assert r.status_code == 200, f"search '(' returned {r.status_code}"


def test_project_not_found(s):
    assert s.get(f"{API}/projects/nonexistent").status_code == 404


def test_project_empty_name_rejected(s):
    r = s.post(f"{API}/projects", json={"name": ""})
    if r.status_code == 201:
        created["projects"].append(r.json()["id"])
    assert r.status_code in (400, 422), "Empty project name accepted"


def test_repo_and_app_config(s, project):
    r = s.put(f"{API}/projects/{project['id']}/repository", json={"url": "https://github.com/acme/shop.git", "branch": "dev"})
    assert r.status_code == 200
    repo = r.json()["repository"]
    assert repo["owner"] == "acme" and repo["name"] == "shop" and repo["connected"] and repo["branch"] == "dev"
    r = s.put(f"{API}/projects/{project['id']}/application", json={"url": "https://stg.acme.com", "environment": "qa"})
    assert r.status_code == 200
    g = s.get(f"{API}/projects/{project['id']}").json()
    assert g["application"]["url"] == "https://stg.acme.com" and g["application"]["environment"] == "qa"


# Documents
def test_document_upload_version_preview_delete(s, project):
    pid = project["id"]
    content = "# Plan\n## Login\nUser must login.\nSystem should validate.\n"
    r = s.post(f"{API}/projects/{pid}/documents", data={"doc_type": "plan"},
               files={"file": ("plan.md", content, "text/markdown")})
    assert r.status_code == 200
    d = r.json()
    assert d["version"] == 1 and d["metadata"]["requirements_extracted"] == 2
    assert d["metadata"]["sections"] == ["Plan", "Login"]
    # same content -> same doc
    r2 = s.post(f"{API}/projects/{pid}/documents", data={"doc_type": "plan"},
                files={"file": ("plan.md", content, "text/markdown")})
    assert r2.json()["id"] == d["id"]
    # new content -> v2
    r3 = s.post(f"{API}/projects/{pid}/documents", data={"doc_type": "plan"},
                files={"file": ("plan.md", content + "more\n", "text/markdown")})
    assert r3.json()["version"] == 2
    lst = s.get(f"{API}/projects/{pid}/documents").json()
    assert len([x for x in lst if x["doc_type"] == "plan"]) == 1
    assert "content" not in lst[0]
    full = s.get(f"{API}/documents/{r3.json()['id']}").json()
    assert "more" in full["content"]
    assert s.get(f"{API}/projects/{pid}").json()["document_status"]["plan_uploaded"] is True
    # other types
    for t in ["scenario", "functionalities"]:
        rr = s.post(f"{API}/projects/{pid}/documents", data={"doc_type": t},
                    files={"file": (f"{t}.md", f"# {t}\n", "text/markdown")})
        assert rr.status_code == 200
    ds = s.get(f"{API}/projects/{pid}").json()["document_status"]
    assert all(ds.values())
    dl = s.delete(f"{API}/documents/{r3.json()['id']}")
    assert dl.status_code == 200
    assert s.get(f"{API}/documents/{r3.json()['id']}").status_code == 404
    assert s.get(f"{API}/projects/{pid}").json()["document_status"]["plan_uploaded"] is False


def test_document_invalid_type_and_ext(s, project):
    pid = project["id"]
    r = s.post(f"{API}/projects/{pid}/documents", data={"doc_type": "bad"},
               files={"file": ("x.md", "# x", "text/markdown")})
    assert r.status_code == 400
    r = s.post(f"{API}/projects/{pid}/documents", data={"doc_type": "plan"},
               files={"file": ("x.txt", "x", "text/plain")})
    assert r.status_code == 400


def test_document_non_utf8(s, project):
    r = s.post(f"{API}/projects/{project['id']}/documents", data={"doc_type": "scenario"},
               files={"file": ("bin.md", b"\xff\xfe\x00\x80", "text/markdown")})
    assert r.status_code == 400, f"non-utf8 upload returned {r.status_code}"


# Providers
def test_provider_flow(s, provider):
    pid = provider["id"]
    assert provider["connection"]["validation_status"] == "not_validated"
    v = s.post(f"{API}/providers/{pid}/validate").json()
    assert v["connection"]["validation_status"] == "no_key" and v["status"] == "inactive"
    k = s.post(f"{API}/providers/{pid}/set-key").json()
    assert k["connection"]["api_key_set"] is True and k["status"] == "active"
    v = s.post(f"{API}/providers/{pid}/validate").json()
    assert v["connection"]["validation_status"] == "valid"
    u = s.put(f"{API}/providers/{pid}", json={"display_name": "TEST_disp"})
    assert u.status_code == 200 and u.json()["display_name"] == "TEST_disp"


def test_provider_invalid_type(s):
    assert s.post(f"{API}/providers", json={"name": "TEST_x", "provider_type": "foo"}).status_code == 400


def test_provider_delete(s):
    r = s.post(f"{API}/providers", json={"name": "TEST_del", "provider_type": "custom", "endpoint_url": "http://x"})
    pid = r.json()["id"]
    assert r.json()["connection"]["endpoint_url"] == "http://x"
    assert s.delete(f"{API}/providers/{pid}").status_code == 200
    assert s.get(f"{API}/providers/{pid}").status_code == 404


# Models + assignments
def test_model_registry(s, provider):
    body = {"provider_id": provider["id"], "provider_type": "anthropic", "model_id": "TEST-claude",
            "display_name": "TEST Claude", "context_window": 200000,
            "capabilities": {"text_generation": True, "vision": True},
            "pricing": {"input_per_1m": 3.0, "output_per_1m": 15.0}}
    r = s.post(f"{API}/models", json=body)
    assert r.status_code == 201
    m = r.json()
    assert m["capabilities"]["vision"] is True and m["pricing"]["output_per_1m"] == 15.0
    assert s.post(f"{API}/models", json=body).status_code == 409
    lst = s.get(f"{API}/models", params={"provider_id": provider["id"]}).json()
    assert any(x["id"] == m["id"] for x in lst)
    provs = s.get(f"{API}/providers").json()
    assert next(p for p in provs if p["id"] == provider["id"])["models_count"] == 1
    a = s.post(f"{API}/model-assignments", json={"task_type": "TEST_task", "provider_id": provider["id"],
                                                  "model_id": "TEST-claude", "ai_model_db_id": m["id"]})
    assert a.status_code == 201
    assert any(x["id"] == a.json()["id"] for x in s.get(f"{API}/model-assignments").json())
    assert s.delete(f"{API}/models/{m['id']}").status_code == 200
    assert s.get(f"{API}/models/{m['id']}").status_code == 404
    assert s.delete(f"{API}/model-assignments/{a.json()['id']}").status_code == 404  # cascaded


def test_model_unknown_provider(s):
    r = s.post(f"{API}/models", json={"provider_id": "nope", "provider_type": "x", "model_id": "m", "display_name": "m"})
    assert r.status_code == 404


def test_task_types(s):
    r = s.get(f"{API}/task-types")
    assert r.status_code == 200 and len(r.json()) == 7


# Audit
def test_audit_logs(s, project):
    r = s.get(f"{API}/audit-logs", params={"resource_type": "project", "limit": 100})
    assert r.status_code == 200
    d = r.json()
    assert d["total"] >= 1 and all(i["resource_type"] == "project" for i in d["items"])
    assert any(i["resource_id"] == project["id"] for i in d["items"])
    assert s.get(f"{API}/audit-logs", params={"limit": 0}).status_code == 422
