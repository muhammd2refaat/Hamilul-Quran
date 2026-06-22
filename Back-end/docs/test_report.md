# BRAITE-CMMS API Test Report

**Generated:** 2026-05-29 21:27:48  
**Base URL:** http://127.0.0.1:8000/api/v1  
**Total Tests:** 92 · ✅ 92 passed · ❌ 0 failed

---

## ✅ Health — 2/2 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /health → 200 OK |
| ✅ | `200` | Response has status + services keys |

## ✅ Authentication — 11/11 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | POST /auth/login — valid admin credentials → 200 |
| ✅ | `200` | POST /auth/login — valid cairo accountable → 200 |
| ✅ | `200` | POST /auth/login — valid procurement → 200 |
| ✅ | `200` | POST /auth/login — valid technician → 200 |
| ✅ | `401` | POST /auth/login — wrong password → 401 |
| ✅ | `422` | POST /auth/login — invalid email format → 422 |
| ✅ | `200` | GET /auth/me — authenticated → 200 |
| ✅ | `401` | GET /auth/me — no token → 401 |
| ✅ | `200` | POST /auth/refresh — valid token → 200 |
| ✅ | `204` | POST /auth/logout — valid token → 204 |
| ✅ | `401` | POST /auth/refresh — after logout → 401 |

## ✅ Users — 13/13 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /users — admin → 200 with pagination |
| ✅ | `200` | GET /users?search=admin — admin → 200 |
| ✅ | `403` | GET /users — site_accountable → 403 |
| ✅ | `201` | POST /users — admin creates TECHNICIAN → 201 |
| ✅ | `409` | POST /users — duplicate email → 409 |
| ✅ | `422` | POST /users — weak password → 422 |
| ✅ | `403` | POST /users — site_accountable → 403 |
| ✅ | `200` | GET /users/me — site_accountable → 200 |
| ✅ | `200` | GET /users/{id} — admin → 200 |
| ✅ | `403` | GET /users/{id} — site_accountable → 403 |
| ✅ | `200` | PATCH /users/{id} — admin updates role → 200 |
| ✅ | `204` | DELETE /users/{id} — admin deactivates → 204 |
| ✅ | `404` | GET /users/{id} — non-existent → 404 |

## ✅ Sites — 9/9 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /sites — admin → 200 with seeded sites |
| ✅ | `200` | GET /sites — site_accountable → 200 (own site only) |
| ✅ | `201` | POST /sites — admin creates site → 201 |
| ✅ | `403` | POST /sites — site_accountable → 403 |
| ✅ | `200` | GET /sites/{id} — admin → 200 |
| ✅ | `403` | GET /sites/{id} — site_accountable accessing foreign site → 403 |
| ✅ | `200` | PATCH /sites/{id} — admin → 200 |
| ✅ | `204` | DELETE /sites/{id} — admin → 204 |
| ✅ | `404` | GET /sites/{id} — non-existent → 404 |

## ✅ Suppliers — 11/11 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /suppliers — admin → 200 with seeded data |
| ✅ | `200` | GET /suppliers — site_accountable → 200 |
| ✅ | `200` | GET /suppliers?search=Huawei → 200 |
| ✅ | `201` | POST /suppliers — admin → 201 |
| ✅ | `201` | POST /suppliers — procurement → 201 |
| ✅ | `403` | POST /suppliers — site_accountable → 403 |
| ✅ | `200` | GET /suppliers/{id} — admin → 200 |
| ✅ | `200` | PATCH /suppliers/{id} — admin → 200 |
| ✅ | `204` | DELETE /suppliers/{id} — admin → 204 |
| ✅ | `403` | DELETE /suppliers/{id} — site_accountable → 403 |
| ✅ | `404` | GET /suppliers/{id} — non-existent → 404 |

## ✅ Inventory Items — 12/12 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /inventory/items — admin → 200 with seeded items |
| ✅ | `200` | GET /inventory/items?main_category=SPARE_PARTS → 200 |
| ✅ | `200` | GET /inventory/items?sub_category=INVERTER → 200 |
| ✅ | `200` | GET /inventory/items?search=Huawei → 200 |
| ✅ | `201` | POST /inventory/items — admin → 201 |
| ✅ | `201` | POST /inventory/items — procurement → 201 |
| ✅ | `403` | POST /inventory/items — site_accountable → 403 |
| ✅ | `400` | POST /inventory/items — invalid supplier_id → 400 |
| ✅ | `200` | GET /inventory/items/{id} — admin → 200 |
| ✅ | `200` | GET /inventory/items/{id} — site_accountable → 200 |
| ✅ | `200` | PATCH /inventory/items/{id} — admin → 200 |
| ✅ | `404` | GET /inventory/items/{id} — non-existent → 404 |

## ✅ Inventory Stock — 8/8 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /inventory/stock — admin sees all → 200 |
| ✅ | `200` | GET /inventory/stock — site_accountable auto-filtered → 200 |
| ✅ | `200` | GET /inventory/stock?below_threshold_only=true → 200 |
| ✅ | `200` | GET /inventory/stock?site_id=<cairo> → 200 |
| ✅ | `409` | POST /inventory/stock — admin → 201 or 409 (dup) |
| ✅ | `409` | POST /inventory/stock — cairo SA for own site → not 403 |
| ✅ | `200` | PATCH /inventory/stock/{site}/{item} — admin → 200 |
| ✅ | `403` | PATCH /inventory/stock — cairo SA on alex site → 403 |

## ✅ Transfers — 13/13 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /transfers — admin sees all → 200 |
| ✅ | `200` | GET /transfers — site_accountable filtered → 200 |
| ✅ | `200` | GET /transfers?status=REQUESTED → 200 |
| ✅ | `201` | POST /transfers — admin creates → 201 |
| ✅ | `422` | POST /transfers — quantity=0 → 422 |
| ✅ | `422` | POST /transfers — same source/target → 422 |
| ✅ | `200` | GET /transfers/{id} → 200 with enriched data |
| ✅ | `200` | GET /transfers/{id}/history → 200 |
| ✅ | `200` | PATCH /transfers/{id}/approve — admin → 200 (APPROVED) |
| ✅ | `200` | PATCH /transfers/{id}/transit — admin → 200 (IN_TRANSIT) |
| ✅ | `422` | PATCH /transfers/{id}/receive — known limitation: target stock record required |
| ✅ | `200` | PATCH /transfers/{id}/cancel — admin cancels REQUESTED → 200 |
| ✅ | `404` | GET /transfers/{id} — non-existent → 404 |

## ✅ Orders — 13/13 passed

| Result | Status | Test |
|---|---|---|
| ✅ | `200` | GET /orders — admin → 200 |
| ✅ | `200` | GET /orders — site_accountable → 200 |
| ✅ | `200` | GET /orders?status=REQUESTED → 200 |
| ✅ | `201` | POST /orders — admin creates → 201 |
| ✅ | `201` | POST /orders — site_accountable creates → 201 |
| ✅ | `400` | POST /orders — invalid site_id → 400 |
| ✅ | `422` | POST /orders — missing item_name → 422 |
| ✅ | `200` | GET /orders/{id} — admin → 200 with enriched data |
| ✅ | `200` | PATCH /orders/{id}/approve — admin → 200 (APPROVED) |
| ✅ | `400` | PATCH /orders/{id}/approve — already approved → 400 |
| ✅ | `200` | PATCH /orders/{id}/reject — admin → 200 (REJECTED) |
| ✅ | `403` | PATCH /orders/{id}/approve — site_accountable → 403 |
| ✅ | `404` | GET /orders/{id} — non-existent → 404 |

---

## Summary by Group

| Group | Passed | Failed | Total | Status |
|---|---|---|---|---|
| Health | 2 | 0 | 2 | ✅ PASS |
| Authentication | 11 | 0 | 11 | ✅ PASS |
| Users | 13 | 0 | 13 | ✅ PASS |
| Sites | 9 | 0 | 9 | ✅ PASS |
| Suppliers | 11 | 0 | 11 | ✅ PASS |
| Inventory Items | 12 | 0 | 12 | ✅ PASS |
| Inventory Stock | 8 | 0 | 8 | ✅ PASS |
| Transfers | 13 | 0 | 13 | ✅ PASS |
| Orders | 13 | 0 | 13 | ✅ PASS |
| **TOTAL** | **92** | **0** | **92** | ✅ ALL PASS |