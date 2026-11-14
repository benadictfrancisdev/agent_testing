"""Tool implementations for the Ayksa testing agent."""
import os
import json
import asyncio
import uuid
import base64
import httpx
from datetime import datetime, timezone
from database import db
from vault import decrypt_password
from urllib.parse import urlparse


REPO_BASE = "/tmp/ayksa_repos"


async def execute_tool(name, arguments, project, run_id):
    dispatch = {
        "fetch_repo": tool_fetch_repo,
        "read_requirements_docs": tool_read_docs,
        "diff_commits_against_baseline": tool_diff_commits,
        "list_changed_files_and_symbols": tool_list_changed_files,
        "detect_stack": tool_detect_stack,
        "playwright_login": tool_playwright_login,
        "playwright_explore": tool_playwright_explore,
        "playwright_run_scenario": tool_playwright_run_scenario,
        "api_test": tool_api_test,
        "collect_evidence": tool_collect_evidence,
        "write_report": tool_write_report,
    }
    fn = dispatch.get(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    return await fn(arguments, project, run_id)


def _repo_dir(project_id):
    return os.path.join(REPO_BASE, project_id)


async def _git(args, cwd):
    proc = await asyncio.create_subprocess_exec(
        "git", *args, cwd=cwd,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace")


# --- REPO TOOLS ---

async def tool_fetch_repo(args, project, run_id):
    repo = project.get("repository", {})
    url = repo.get("url", "")
    branch = repo.get("branch", "main")
    if not url:
        return {"error": "No repository URL configured"}

    d = _repo_dir(str(project["_id"]))
    os.makedirs(REPO_BASE, exist_ok=True)
    depth = args.get("depth", 50)

    if os.path.exists(os.path.join(d, ".git")):
        await _git(["fetch", "--all", "--prune"], d)
        await _git(["checkout", branch], d)
        await _git(["pull", "origin", branch], d)
    else:
        rc, out, err = await _git(["clone", "--depth", str(depth), "--branch", branch, url, d], REPO_BASE)
        if rc != 0:
            return {"error": f"Clone failed: {err[:500]}"}

    _, head, _ = await _git(["rev-parse", "HEAD"], d)
    _, log_out, _ = await _git(["log", "--oneline", "-10"], d)
    _, tree, _ = await _git(["ls-tree", "-r", "--name-only", "HEAD"], d)
    files = [f for f in tree.strip().split("\n") if f]

    # Save baseline if first run
    await db.projects.update_one(
        {"_id": project["_id"], "repository.last_fetched_commit": {"$exists": False}},
        {"$set": {"repository.baseline_commit": head.strip(), "repository.last_fetched_commit": head.strip()}}
    )
    await db.projects.update_one({"_id": project["_id"]}, {"$set": {"repository.last_fetched_commit": head.strip()}})

    return {"branch": branch, "head_sha": head.strip(), "file_count": len(files), "files": files[:300], "recent_commits": log_out.strip()}


async def tool_read_docs(args, project, run_id):
    docs = await db.documents.find({"project_id": str(project["_id"]), "status": "active"}).to_list(10)
    result = {}
    for d in docs:
        content = d.get("content", "")
        result[d["doc_type"]] = {"filename": d.get("filename", ""), "content": content[:8000],
                                  "word_count": d.get("metadata", {}).get("word_count", 0),
                                  "truncated": len(content) > 8000}
    if not result:
        return {"error": "No requirement documents uploaded for this project."}
    return result


async def tool_diff_commits(args, project, run_id):
    d = _repo_dir(str(project["_id"]))
    if not os.path.exists(os.path.join(d, ".git")):
        return {"error": "Repository not fetched yet. Call fetch_repo first."}
    baseline = args.get("baseline_sha") or project.get("repository", {}).get("baseline_commit", "")
    if not baseline:
        _, baseline, _ = await _git(["rev-list", "--max-parents=0", "HEAD"], d)
        baseline = baseline.strip().split("\n")[0]
    _, diff_out, _ = await _git(["diff", "--stat", baseline.strip(), "HEAD"], d)
    _, diff_full, _ = await _git(["diff", baseline.strip(), "HEAD", "--", ".", ":(exclude)*.lock", ":(exclude)package-lock.json"], d)
    return {"baseline": baseline.strip(), "stat": diff_out[:3000], "diff": diff_full[:6000], "truncated": len(diff_full) > 6000}


async def tool_list_changed_files(args, project, run_id):
    d = _repo_dir(str(project["_id"]))
    if not os.path.exists(os.path.join(d, ".git")):
        return {"error": "Repository not fetched yet."}
    baseline = args.get("baseline_sha") or project.get("repository", {}).get("baseline_commit", "")
    if not baseline:
        _, baseline, _ = await _git(["rev-list", "--max-parents=0", "HEAD"], d)
        baseline = baseline.strip().split("\n")[0]
    _, out, _ = await _git(["diff", "--name-status", baseline.strip(), "HEAD"], d)
    files = []
    for line in out.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 2:
            files.append({"status": parts[0], "path": parts[1]})
    return {"baseline": baseline.strip(), "changed_files": files[:200], "total": len(files)}


async def tool_detect_stack(args, project, run_id):
    d = _repo_dir(str(project["_id"]))
    if not os.path.exists(os.path.join(d, ".git")):
        return {"error": "Repository not fetched yet."}
    markers = {
        "package.json": "Node.js/JavaScript", "tsconfig.json": "TypeScript",
        "requirements.txt": "Python", "Pipfile": "Python", "pyproject.toml": "Python",
        "Gemfile": "Ruby", "go.mod": "Go", "pom.xml": "Java/Maven", "build.gradle": "Java/Gradle",
        "Cargo.toml": "Rust", "composer.json": "PHP",
        "next.config.js": "Next.js", "nuxt.config.ts": "Nuxt.js",
        "angular.json": "Angular", "vite.config.ts": "Vite",
        "Dockerfile": "Docker", "docker-compose.yml": "Docker Compose",
        "manage.py": "Django", "server.py": "FastAPI/Flask",
    }
    detected = {}
    for marker, tech in markers.items():
        check = os.path.exists(os.path.join(d, marker))
        if check:
            detected[marker] = tech
    return {"detected_stack": detected, "repo_dir": d}


# --- PLAYWRIGHT TOOLS ---

async def tool_playwright_login(args, project, run_id):
    account_id = args.get("account_id", "")
    if not account_id:
        # List available accounts
        accounts = await db.test_accounts.find({"project_id": str(project["_id"])}, {"password_encrypted": 0}).to_list(10)
        for a in accounts:
            a["id"] = str(a.pop("_id"))
        return {"error": "account_id required", "available_accounts": accounts}

    account = await db.test_accounts.find_one({"_id": account_id, "project_id": str(project["_id"])})
    if not account:
        return {"error": "Account not found"}

    password = decrypt_password(account.get("password_encrypted", ""))
    username = account.get("username", "")
    app_url = project.get("application", {}).get("url", "")
    if not app_url:
        return {"error": "Application URL not configured"}

    from playwright.async_api import async_playwright
    result = {}
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            ctx = await browser.new_context(viewport={"width": 1280, "height": 720})
            page = await ctx.new_page()
            console_logs = []
            page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

            await page.goto(app_url, timeout=30000, wait_until="networkidle")
            email_sel = 'input[type="email"], input[name="email"], input[name="username"], input[id="email"], input[name="login"]'
            pw_sel = 'input[type="password"]'
            email_el = await page.query_selector(email_sel)
            pw_el = await page.query_selector(pw_sel)

            if email_el and pw_el:
                await email_el.fill(username)
                await pw_el.fill(password)
                submit = await page.query_selector('button[type="submit"], input[type="submit"]')
                if not submit:
                    submit = await page.query_selector('button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), button:has-text("Submit")')
                if submit:
                    await submit.click()
                await page.wait_for_load_state("networkidle", timeout=15000)
                screenshot = await page.screenshot(type="png")
                eid = str(uuid.uuid4())
                await db.evidence.insert_one({"_id": eid, "run_id": run_id, "type": "screenshot", "label": "post_login",
                                               "data_b64": base64.b64encode(screenshot).decode()[:200000],
                                               "created_at": datetime.now(timezone.utc).isoformat()})
                result = {"status": "login_attempted", "url_after": page.url, "title": await page.title(),
                          "evidence_id": eid, "console_errors": [l for l in console_logs if "[error]" in l.lower()][:10]}
            else:
                screenshot = await page.screenshot(type="png")
                eid = str(uuid.uuid4())
                await db.evidence.insert_one({"_id": eid, "run_id": run_id, "type": "screenshot", "label": "login_page",
                                               "data_b64": base64.b64encode(screenshot).decode()[:200000],
                                               "created_at": datetime.now(timezone.utc).isoformat()})
                result = {"status": "no_standard_form", "url": page.url, "title": await page.title(),
                          "evidence_id": eid, "hint": "Login form not found with standard selectors. Try playwright_explore to inspect the page."}
            await browser.close()
    except Exception as e:
        result = {"status": "error", "error": str(e)}
    return result


async def tool_playwright_explore(args, project, run_id):
    target_url = args.get("url", "")
    app_url = project.get("application", {}).get("url", "")
    domains = project.get("application", {}).get("authorized_domains", [])

    if not target_url:
        target_url = app_url
    if not target_url:
        return {"error": "No URL provided and no application URL configured"}

    # Domain check
    if domains:
        parsed = urlparse(target_url)
        if parsed.hostname and not any(d in parsed.hostname for d in domains):
            return {"error": f"URL {parsed.hostname} is outside authorized domains: {domains}"}

    from playwright.async_api import async_playwright
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = await browser.new_page(viewport={"width": 1280, "height": 720})
            errors = []
            page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

            await page.goto(target_url, timeout=30000, wait_until="networkidle")

            action = args.get("action", "")
            if action:
                try:
                    await page.evaluate(f"() => {{ {action} }}")
                    await page.wait_for_timeout(2000)
                except Exception:
                    pass

            title = await page.title()
            links = await page.eval_on_selector_all("a[href]", "els => els.map(e => ({text: e.textContent?.trim()?.slice(0,60), href: e.href})).slice(0, 30)")
            forms = await page.eval_on_selector_all("form", "els => els.map(f => ({action: f.action, method: f.method, inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({name: i.name, type: i.type, id: i.id}))}))")
            headings = await page.eval_on_selector_all("h1,h2,h3", "els => els.map(e => ({tag: e.tagName, text: e.textContent?.trim()?.slice(0,80)}))")

            screenshot = await page.screenshot(type="png")
            eid = str(uuid.uuid4())
            await db.evidence.insert_one({"_id": eid, "run_id": run_id, "type": "screenshot", "label": f"explore_{urlparse(target_url).path}",
                                           "data_b64": base64.b64encode(screenshot).decode()[:200000],
                                           "created_at": datetime.now(timezone.utc).isoformat()})
            await browser.close()
            return {"url": target_url, "title": title, "links": links, "forms": forms, "headings": headings,
                    "console_errors": errors[:10], "evidence_id": eid}
    except Exception as e:
        return {"error": str(e)}


async def tool_playwright_run_scenario(args, project, run_id):
    return {"status": "stub", "message": "Scenario execution will be implemented in next phase. Use playwright_login and playwright_explore for individual steps."}


async def tool_api_test(args, project, run_id):
    method = args.get("method", "GET").upper()
    url = args.get("url", "")
    headers = args.get("headers", {})
    body = args.get("body", "")
    if not url:
        return {"error": "URL required"}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, headers=headers, content=body if body else None)
            return {"status_code": resp.status_code, "headers": dict(resp.headers),
                    "body": resp.text[:3000], "truncated": len(resp.text) > 3000}
    except Exception as e:
        return {"error": str(e)}


# --- EVIDENCE & REPORT ---

async def tool_collect_evidence(args, project, run_id):
    eid = str(uuid.uuid4())
    await db.evidence.insert_one({
        "_id": eid, "run_id": run_id, "type": args.get("evidence_type", "log"),
        "label": args.get("label", ""), "content": args.get("content", "")[:50000],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"evidence_id": eid, "stored": True}


async def tool_write_report(args, project, run_id):
    report = {
        "summary": args.get("summary", ""),
        "files_changed": args.get("files_changed", 0),
        "tests_passed": args.get("tests_passed", 0),
        "tests_failed": args.get("tests_failed", 0),
        "tests_blocked": args.get("tests_blocked", 0),
        "critical_defects": args.get("critical_defects", []),
        "findings": args.get("findings", []),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.runs.update_one({"_id": run_id}, {"$set": {"report": report}})
    return {"status": "report_saved", "finding_count": len(report["findings"])}
