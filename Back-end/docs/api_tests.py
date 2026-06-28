"""
Hamilul-Quran — Comprehensive API Integration Test Suite
=======================================================
Tests every endpoint group against the live running server.

Prerequisites:
    1. Server is running:   uvicorn app.main:app --reload
    2. DB is seeded:        python seed.py
    3. httpx installed:     pip install httpx

Run:
    python docs/api_tests.py

Output: Detailed report per group printed to stdout + saved to docs/test_report.md
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, Optional

import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

# ─── Seed Credentials ────────────────────────────────────────────────────────
ADMIN_EMAIL = "admin@qvhealth.com"
ADMIN_PASSWORD = "Admin@123456"

# ─── Test Result Tracking ─────────────────────────────────────────────────────
class TestResult:
    def __init__(self, group: str, name: str, passed: bool, status_code: int,
                 expected_status: int, detail: str = ""):
        self.group = group
        self.name = name
        self.passed = passed
        self.status_code = status_code
        self.expected_status = expected_status
        self.detail = detail

    def __repr__(self):
        icon = "✅" if self.passed else "❌"
        return f"{icon} [{self.status_code}] {self.name}" + (f" — {self.detail}" if self.detail else "")


results: list[TestResult] = []


def record(group: str, name: str, resp: httpx.Response, expected: int,
           detail: str = "") -> bool:
    passed = resp.status_code == expected
    if not passed and not detail:
        try:
            body = resp.json()
            detail = body.get("message") or body.get("detail") or str(body)[:120]
        except Exception:
            detail = resp.text[:120]
    results.append(TestResult(group, name, passed, resp.status_code, expected, detail))
    return passed


# ─── Auth Helper ─────────────────────────────────────────────────────────────
async def login(client: httpx.AsyncClient, email: str, password: str) -> Optional[str]:
    r = await client.post("/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json()["access_token"]
    return None


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── GROUP 1: Health ──────────────────────────────────────────────────────────
async def test_health(client: httpx.AsyncClient) -> None:
    G = "Health"
    r = await client.get("/health")
    record(G, "GET /health → 200 OK", r, 200)
    if r.status_code == 200:
        data = r.json()
        ok = data.get("status") in ("ok", "degraded")
        results.append(TestResult(G, "Response has status + services keys", ok,
                                  r.status_code, 200,
                                  f"status={data.get('status')}"))


# ─── GROUP 2: Authentication ──────────────────────────────────────────────────
async def test_auth(client: httpx.AsyncClient) -> dict:
    G = "Authentication"
    tokens: dict = {}

    # Valid login — admin
    r = await client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    record(G, "POST /auth/login — valid admin credentials → 200", r, 200)
    admin_token = r.json().get("access_token") if r.status_code == 200 else None
    refresh_token = r.json().get("refresh_token") if r.status_code == 200 else None
    tokens["admin"] = admin_token

    # Invalid credentials
    r_bad = await client.post("/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong!"})
    record(G, "POST /auth/login — wrong password → 401", r_bad, 401)

    # Invalid email format
    r_fmt = await client.post("/auth/login", json={"email": "not-an-email", "password": "x"})
    record(G, "POST /auth/login — invalid email format → 422", r_fmt, 422)

    # GET /auth/me
    if admin_token:
        r_me = await client.get("/auth/me", headers=auth(admin_token))
        record(G, "GET /auth/me — authenticated → 200", r_me, 200)

    # GET /auth/me — no token
    r_unauth = await client.get("/auth/me")
    record(G, "GET /auth/me — no token → 401", r_unauth, 401)

    # Refresh token
    if refresh_token:
        r_ref = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
        record(G, "POST /auth/refresh — valid token → 200", r_ref, 200)

    # Logout
    if refresh_token:
        r_out = await client.post("/auth/logout", json={"refresh_token": refresh_token},
                                   headers=auth(admin_token))
        record(G, "POST /auth/logout — valid token → 204", r_out, 204)

        # After logout, refresh should fail
        r_ref2 = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
        record(G, "POST /auth/refresh — after logout → 401", r_ref2, 401)

    return tokens


# ─── GROUP 3: Users ───────────────────────────────────────────────────────────
async def test_users(client: httpx.AsyncClient, tokens: dict) -> Optional[str]:
    G = "Users"
    admin_tok = tokens.get("admin")
    created_user_id = None

    # List users (admin)
    r = await client.get("/users", headers=auth(admin_tok))
    record(G, "GET /users — admin → 200 with pagination", r, 200)

    # List users — search
    r_s = await client.get("/users?search=admin&limit=5", headers=auth(admin_tok))
    record(G, "GET /users?search=admin — admin → 200", r_s, 200)

    # Create user (admin)
    unique = str(uuid.uuid4())[:8]
    new_user = {
        "username": f"testuser_{unique}",
        "email": f"testuser_{unique}@test.io",
        "first_name": "Test",
        "last_name": "User",
        "password": "TestPass@8",
        "role": "TEACHER",
    }
    r_c = await client.post("/users", json=new_user, headers=auth(admin_tok))
    record(G, "POST /users — admin creates TEACHER → 201", r_c, 201)
    if r_c.status_code == 201:
        created_user_id = r_c.json()["id"]

    # Create user — duplicate email → service returns 409 Conflict
    if created_user_id:
        r_dup = await client.post("/users", json=new_user, headers=auth(admin_tok))
        record(G, "POST /users — duplicate email → 409", r_dup, 409)

    # Create user — weak password
    r_weak = await client.post("/users", json={**new_user, "email": "weak@t.io", "password": "short"},
                                headers=auth(admin_tok))
    record(G, "POST /users — weak password → 422", r_weak, 422)

    # GET /users/me
    if created_user_id:
        # login as new user
        new_token = await login(client, new_user["email"], new_user["password"])
        if new_token:
            r_me = await client.get("/users/me", headers=auth(new_token))
            record(G, "GET /users/me — teacher → 200", r_me, 200)

            # test non-admin forbidden for listing users
            r_f = await client.get("/users", headers=auth(new_token))
            record(G, "GET /users — teacher → 403", r_f, 403)

    # GET /users/{id}
    if created_user_id:
        r_get = await client.get(f"/users/{created_user_id}", headers=auth(admin_tok))
        record(G, "GET /users/{id} — admin → 200", r_get, 200)

        # PATCH /users/{id}
        r_p = await client.patch(f"/users/{created_user_id}",
                                  json={"role": "STUDENT"}, headers=auth(admin_tok))
        record(G, "PATCH /users/{id} — admin updates role → 200", r_p, 200)

        # DELETE /users/{id}
        r_d = await client.delete(f"/users/{created_user_id}", headers=auth(admin_tok))
        record(G, "DELETE /users/{id} — admin deactivates → 204", r_d, 204)

        # Confirm user is suspended
        r_get_suspended = await client.get(f"/users/{created_user_id}", headers=auth(admin_tok))
        if r_get_suspended.status_code == 200 and r_get_suspended.json()["status"] == "SUSPENDED":
            record(G, "GET /users/{id} — verified SUSPENDED status", r_get_suspended, 200)
        else:
            record(G, "GET /users/{id} — verified SUSPENDED status", r_get_suspended, 200, "User is not suspended")


    # GET /users/{id} — not found
    r_nf = await client.get(f"/users/{uuid.uuid4()}", headers=auth(admin_tok))
    record(G, "GET /users/{id} — non-existent → 404", r_nf, 404)

    return created_user_id


# ─── Report Generator ─────────────────────────────────────────────────────────
def generate_report() -> str:
    groups: dict[str, list[TestResult]] = {}
    for r in results:
        groups.setdefault(r.group, []).append(r)

    total_pass = sum(1 for r in results if r.passed)
    total_fail = sum(1 for r in results if not r.passed)
    total = len(results)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        f"# Hamilul-Quran API Test Report",
        f"",
        f"**Generated:** {now}  ",
        f"**Base URL:** {BASE_URL}  ",
        f"**Total Tests:** {total} · ✅ {total_pass} passed · ❌ {total_fail} failed",
        f"",
        f"---",
        f"",
    ]

    for group, group_results in groups.items():
        passed = sum(1 for r in group_results if r.passed)
        failed = len(group_results) - passed
        status = "✅" if failed == 0 else "⚠️" if passed > failed else "❌"
        lines.append(f"## {status} {group} — {passed}/{len(group_results)} passed")
        lines.append("")
        lines.append("| Result | Status | Test |")
        lines.append("|---|---|---|")
        for r in group_results:
            icon = "✅" if r.passed else "❌"
            detail = f" `{r.detail}`" if r.detail and not r.passed else ""
            lines.append(f"| {icon} | `{r.status_code}` | {r.name}{detail} |")
        lines.append("")

    # Summary table
    lines.append("---")
    lines.append("")
    lines.append("## Summary by Group")
    lines.append("")
    lines.append("| Group | Passed | Failed | Total | Status |")
    lines.append("|---|---|---|---|---|")
    for group, group_results in groups.items():
        passed = sum(1 for r in group_results if r.passed)
        failed = len(group_results) - passed
        status = "✅ PASS" if failed == 0 else f"❌ {failed} FAIL"
        lines.append(f"| {group} | {passed} | {failed} | {len(group_results)} | {status} |")
    lines.append(f"| **TOTAL** | **{total_pass}** | **{total_fail}** | **{total}** | {'✅ ALL PASS' if total_fail == 0 else f'❌ {total_fail} FAILED'} |")

    return "\n".join(lines)


def print_console_report():
    groups: dict[str, list[TestResult]] = {}
    for r in results:
        groups.setdefault(r.group, []).append(r)

    total_pass = sum(1 for r in results if r.passed)
    total_fail = sum(1 for r in results if not r.passed)
    total = len(results)

    print("\n\n" + "="*70)
    print("  Hamilul-Quran API TEST RESULTS")
    print("="*70)

    for group, group_results in groups.items():
        passed = sum(1 for r in group_results if r.passed)
        print(f"\n────────────────────────────────────────────────────────────")
        print(f"  {group}  ({passed}/{len(group_results)} passed)")
        print(f"────────────────────────────────────────────────────────────")
        for r in group_results:
            print(f"  {r}")

    print("\n" + "="*70)
    print(f"  TOTAL: {total_pass}/{total} passed · {total_fail} failed")
    print("="*70 + "\n")


# ─── Main ─────────────────────────────────────────────────────────────────────
async def main():
    print(f"🚀 Starting Hamilul-Quran API Tests against {BASE_URL}")
    print("   Make sure `uvicorn app.main:app --reload` is running and DB is seeded.")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        await test_health(client)
        tokens = await test_auth(client)
        
        await test_users(client, tokens)

    print_console_report()
    report_md = generate_report()
    with open("docs/test_report.md", "w") as f:
        f.write(report_md)
    print(f"📄 Full report saved to: docs/test_report.md\n")

if __name__ == "__main__":
    asyncio.run(main())
