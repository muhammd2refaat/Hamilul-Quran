# BRAITE-CMMS — Back-end API Documentation

> **Version:** 1.0.0 · **Base URL:** `http://localhost:8000/api/v1` · **Format:** REST/JSON · **Auth:** JWT Bearer

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Role Reference](#role-reference)
5. [Common Response Formats](#common-response-formats)
6. [Error Codes](#error-codes)
7. [Endpoints by Group](#endpoints-by-group)
   - [Health](#health)
   - [Authentication](#authentication)
   - [Users](#users)
   - [Sites](#sites)
   - [Suppliers](#suppliers)
   - [Inventory Items](#inventory-items)
   - [Inventory Stock](#inventory-stock)
   - [Transfers](#transfers)
   - [Orders](#orders)
8. [Data Models & Enums](#data-models--enums)
9. [Onboarding Quickstart](#onboarding-quickstart)

---

## Overview

The **BRAITE Solar Asset ERP** back-end is a FastAPI async REST API that manages:

- **Solar plant sites** (3 Egyptian facilities: Cairo, Alexandria, Aswan)
- **Inventory items** — spare parts, tools, safety equipment
- **Per-site stock levels** with minimum safety thresholds
- **Inter-site equipment transfers** with a 4-state workflow
- **Purchasing orders** from suppliers
- **Users** with 4 distinct roles enforcing site-level RBAC

**Tech Stack:**
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 + Uvicorn |
| ORM | SQLModel (SQLAlchemy 2 async + Pydantic v2) |
| Database | PostgreSQL 16 (asyncpg driver) |
| Cache / Pub-Sub | Redis 7 |
| Auth | JWT (python-jose) + bcrypt password hashing |
| Migrations | Alembic |

---

## Architecture

```
app/
├── config/settings.py          ← Pydantic settings (env vars)
├── database/session.py         ← Async engine + session factory
├── infrastructure/redis/       ← Redis client + pub/sub channels
├── middleware/cors.py           ← CORS registration
├── core/
│   ├── security.py             ← JWT create/decode, bcrypt hash/verify
│   ├── dependencies.py         ← FastAPI deps: get_current_user, RBAC guards
│   ├── exceptions.py           ← Custom exception classes
│   ├── handlers.py             ← Global HTTP/DB exception handlers
│   └── health.py               ← /health router
└── features/
    ├── auth/                   ← Login, refresh, logout, /me
    ├── users/                  ← User CRUD
    ├── sites/                  ← Site CRUD
    ├── suppliers/              ← Supplier CRUD
    ├── inventory/              ← Items + stock levels
    ├── transfers/              ← Inter-site transfer workflow
    └── orders/                 ← Purchasing order requests
```

---

## Authentication & Authorization

All endpoints except `GET /health` and `POST /auth/login` require a **Bearer token**.

### How to authenticate

```bash
# 1. Login
POST /api/v1/auth/login
{ "email": "admin@solar-erp.io", "password": "Admin@1234!" }

# Response
{
  "access_token": "<JWT>",
  "refresh_token": "<JWT>",
  "token_type": "bearer",
  "expires_in": 1800
}

# 2. Use the token on all subsequent requests
Authorization: Bearer <access_token>
```

### Token Lifecycle

| Token | TTL | Storage |
|---|---|---|
| `access_token` | 30 minutes | In-memory / client only |
| `refresh_token` | 7 days | Redis (JTI key, revocable) |

- Refresh tokens are **revocable**: stored by JTI in Redis. Calling `POST /auth/logout` deletes the JTI.
- Access tokens are **not** revocable — they expire naturally.

---

## Role Reference

| Role | Value | Description |
|---|---|---|
| Admin | `ADMIN` | Full access to everything |
| Site Accountable | `SITE_ACCOUNTABLE` | Manages one specific site; read-only on others |
| Procurement | `PROCUREMENT` | Read-only on sites; can create suppliers/items/orders |
| Technician | `TECHNICIAN` | Read-only; assigned to one site; can receive transfers |

### Permission Matrix

| Action | ADMIN | SITE_ACCOUNTABLE | PROCUREMENT | TECHNICIAN |
|---|---|---|---|---|
| Create/Delete users | ✅ | ❌ | ❌ | ❌ |
| Create/Delete sites | ✅ | ❌ | ❌ | ❌ |
| Create suppliers/items | ✅ | ❌ | ✅ | ❌ |
| View inventory | ✅ | ✅ (own site) | ✅ | ✅ (own site) |
| Create stock entry | ✅ | ✅ (own site) | ❌ | ❌ |
| Create transfer | ✅ | ✅ (own site) | ❌ | ✅ (own site) |
| Approve transfer | ✅ | ❌ | ❌ | ❌ |
| Approve/transit transfer (source) | ✅ | ✅ (source site) | ❌ | ❌ |
| Receive transfer (target) | ✅ | ✅ (target site) | ❌ | ✅ (assigned site) |
| Create order | ✅ | ✅ | ✅ | ✅ |
| Approve/Reject order | ✅ | ❌ | ❌ | ❌ |

---

## Common Response Formats

### Paginated List

```json
{
  "items": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

**Query parameters available on all list endpoints:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | int | 20 | Items per page (1–100) |
| `offset` | int | 0 | Skip N items |
| `search` | string | — | Text filter (varies by resource) |

---

## Error Codes

| HTTP | `error_code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body / query params |
| 400 | `UNIQUE_VIOLATION` | Duplicate unique field (email, model number) |
| 400 | `FOREIGN_KEY_VIOLATION` | Referenced entity (site, supplier) does not exist |
| 400 | `DATABASE_INTEGRITY_ERROR` | Other DB constraint violation |
| 401 | `HTTP_EXCEPTION` | Missing / invalid / expired access token |
| 403 | `HTTP_EXCEPTION` | Insufficient role or site permission |
| 404 | `HTTP_EXCEPTION` | Resource not found |
| 422 | `VALIDATION_ERROR` | Pydantic schema validation failure |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled server error |
| 500 | `DATABASE_ERROR` | SQLAlchemy-level database error |

**Error Response Shape:**
```json
{
  "error_code": "UNIQUE_VIOLATION",
  "message": "A record with this identifier already exists.",
  "details": "..."
}
```

---

## Endpoints by Group

---

### Health

#### `GET /api/v1/health`

Check API, database, and Redis connectivity. **No authentication required.**

**Response `200`:**
```json
{
  "status": "ok",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

If any service is down, `status` becomes `"degraded"` and the affected service shows an error message.

---

### Authentication

#### `POST /api/v1/auth/login`

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "admin@solar-erp.io",
  "password": "Admin@1234!"
}
```

**Response `200`:**
```json
{
  "access_token": "<JWT>",
  "refresh_token": "<JWT>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Errors:** `401` — Invalid email or password.

---

#### `POST /api/v1/auth/refresh`

Exchange a valid refresh token for a new access token.

**Request Body:**
```json
{ "refresh_token": "<JWT>" }
```

**Response `200`:** Same shape as `/auth/login`. The same refresh token is returned (rotation-on-use is not implemented).

**Errors:** `401` — Token expired, revoked, or invalid.

---

#### `POST /api/v1/auth/logout`

Revoke the refresh token by deleting its JTI from Redis. 🔒 **Auth required.**

**Request Body:**
```json
{ "refresh_token": "<JWT>" }
```

**Response `204`:** No content.

---

#### `GET /api/v1/auth/me`

Return the currently authenticated user's basic profile. 🔒 **Auth required.**

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "admin@solar-erp.io",
  "role": "ADMIN",
  "is_active": true
}
```

---

### Users

> **All endpoints require authentication. Create/Update/Delete/List require ADMIN role.**

#### `GET /api/v1/users`

List all users with optional email search and pagination. **ADMIN only.**

**Query Params:** `limit`, `offset`, `search` (filters by email substring).

**Response `200`:** Paginated `UserResponse` list.

---

#### `POST /api/v1/users`

Create a new user account. **ADMIN only.**

**Request Body:**
```json
{
  "username": "john.doe",
  "email": "john@example.com",
  "phone_number": "+20123456789",
  "password": "SecurePass@8",
  "role": "TECHNICIAN",
  "site_id": "<uuid or null>"
}
```
> Password must be ≥ 8 characters. `site_id` is required for `TECHNICIAN` and `SITE_ACCOUNTABLE` roles.

**Response `201`:** `UserResponse`

---

#### `GET /api/v1/users/me`

Get the authenticated user's own full profile. **All roles.**

**Response `200`:** `UserResponse`

---

#### `GET /api/v1/users/{user_id}`

Get a specific user by UUID. **ADMIN only.**

**Response `200`:** `UserResponse` · `404` if not found.

---

#### `PATCH /api/v1/users/{user_id}`

Partially update a user. **ADMIN only.**

**Request Body** (all fields optional):
```json
{
  "username": "new.username",
  "email": "new@example.com",
  "phone_number": "+20987654321",
  "role": "PROCUREMENT",
  "is_active": false,
  "site_id": "<uuid or null>"
}
```

**Response `200`:** Updated `UserResponse`

---

#### `DELETE /api/v1/users/{user_id}`

Soft-delete (deactivate) a user. **ADMIN only.**

**Response `204`:** No content.

---

### Sites

> **List/Get require any authenticated user. Create/Update/Delete require ADMIN.**
> `SITE_ACCOUNTABLE` users automatically see only their assigned site.

#### `GET /api/v1/sites`

List sites. SITE_ACCOUNTABLE sees only their own site.

**Query Params:** `limit`, `offset`, `search` (by name).

**Response `200`:** Paginated `SiteResponse` list.

---

#### `POST /api/v1/sites`

Create a new solar plant site. **ADMIN only.**

**Request Body:**
```json
{
  "name": "Luxor Solar Park",
  "location": "New Valley, Luxor Governorate, Egypt",
  "accountable_user_id": "<uuid or null>"
}
```

**Response `201`:** `SiteResponse`

---

#### `GET /api/v1/sites/{site_id}`

Get a single site by UUID. SITE_ACCOUNTABLE is blocked from viewing other sites.

**Response `200`:** `SiteResponse` · `403` if wrong site · `404` if not found.

---

#### `PATCH /api/v1/sites/{site_id}`

Update a site. **ADMIN only.**

**Request Body** (all optional): `name`, `location`, `accountable_user_id`

**Response `200`:** Updated `SiteResponse`

---

#### `DELETE /api/v1/sites/{site_id}`

Delete a site. **ADMIN only.**

**Response `204`:** No content.

---

### Suppliers

> **List/Get: any authenticated user. Create/Update: ADMIN or PROCUREMENT. Delete: ADMIN only.**

#### `GET /api/v1/suppliers`

List suppliers. Search by company name, contact name, or email.

**Query Params:** `limit`, `offset`, `search`

**Response `200`:** Paginated `SupplierResponse` list.

---

#### `POST /api/v1/suppliers`

Create a supplier. **ADMIN or PROCUREMENT.**

**Request Body:**
```json
{
  "company_name": "Example Supplier Ltd.",
  "contact_name": "Ali Hassan",
  "email": "ali@example-supplier.com",
  "phone": "+20123456789"
}
```

**Response `201`:** `SupplierResponse`

---

#### `GET /api/v1/suppliers/{supplier_id}`

Get supplier by UUID. **Any authenticated user.**

**Response `200`:** `SupplierResponse` · `404` if not found.

---

#### `PATCH /api/v1/suppliers/{supplier_id}`

Update supplier. **ADMIN or PROCUREMENT.**

**Request Body** (all optional): `company_name`, `contact_name`, `email`, `phone`

**Response `200`:** Updated `SupplierResponse`

---

#### `DELETE /api/v1/suppliers/{supplier_id}`

Delete supplier. **ADMIN only.**

**Response `204`:** No content.

---

### Inventory Items

> **List/Get: any authenticated user. Create/Update: ADMIN or PROCUREMENT.**
> There is no delete endpoint for items (referential integrity — stock entries reference them).

#### `GET /api/v1/inventory/items`

List inventory items. Filter by category or search name/model number.

**Query Params:**

| Param | Type | Options |
|---|---|---|
| `limit` | int | 1–100 |
| `offset` | int | — |
| `search` | string | Name or model number |
| `main_category` | enum | `SPARE_PARTS`, `TOOLS`, `SAFETY_EQUIPMENT` |
| `sub_category` | enum | `INVERTER`, `DC_CABLE`, `AC_CABLE`, `PANEL`, `BREAKER`, `CLAMP_METER`, `AVO_METER`, `FIRST_AID_KIT`, `SAFETY_HARNESS`, `OTHER` |

**Response `200`:** Paginated `InventoryItemResponse` list.

---

#### `POST /api/v1/inventory/items`

Create a new inventory item. **ADMIN or PROCUREMENT.**

**Request Body:**
```json
{
  "name": "Huawei SUN2000-200KTL-H3",
  "main_category": "SPARE_PARTS",
  "sub_category": "INVERTER",
  "model_number": "SUN2000-200KTL-H3",
  "supplier_id": "<supplier-uuid>"
}
```

**Response `201`:** `InventoryItemResponse`

---

#### `GET /api/v1/inventory/items/{item_id}`

Get a single inventory item. **Any authenticated user.**

**Response `200`:** `InventoryItemResponse` · `404` if not found.

---

#### `PATCH /api/v1/inventory/items/{item_id}`

Update an inventory item. **ADMIN or PROCUREMENT.**

**Request Body** (all optional): `name`, `main_category`, `sub_category`, `model_number`, `supplier_id`

**Response `200`:** Updated `InventoryItemResponse`

---

### Inventory Stock

> Stock is a **composite-keyed** resource: each `(site_id, item_id)` pair has exactly one stock record.

#### `GET /api/v1/inventory/stock`

List stock levels across sites. SITE_ACCOUNTABLE is auto-filtered to their site.

**Query Params:**

| Param | Type | Description |
|---|---|---|
| `site_id` | UUID | Filter by site |
| `item_id` | UUID | Filter by item |
| `below_threshold_only` | bool | Only show stock below min_safety_threshold |
| `limit` | int | 1–200 |
| `offset` | int | — |

**Response `200`:** Paginated `StockResponse` list.

---

#### `POST /api/v1/inventory/stock`

Create a stock entry for a site+item pair. **ADMIN or site's SITE_ACCOUNTABLE.**

**Request Body:**
```json
{
  "site_id": "<uuid>",
  "item_id": "<uuid>",
  "quantity_available": 10,
  "quantity_faulty": 0,
  "min_safety_threshold": 3
}
```

> `is_below_threshold` is computed on response: `quantity_available < min_safety_threshold`.

**Response `201`:** `StockResponse`

**Errors:** `400` — Duplicate `(site_id, item_id)` pair.

---

#### `PATCH /api/v1/inventory/stock/{site_id}/{item_id}`

Update an existing stock entry. **ADMIN or site's SITE_ACCOUNTABLE.**

**Request Body** (all optional): `quantity_available`, `quantity_faulty`, `min_safety_threshold`

**Response `200`:** Updated `StockResponse`

---

### Transfers

> Transfer workflow: `REQUESTED → APPROVED → IN_TRANSIT → RECEIVED` (or `→ CANCELLED`).
> 
> **Key RBAC rule:** The **source site** (giving the goods) approves and dispatches. The **target site** (receiving the goods) confirms receipt.
> 
> Stock is decremented atomically on **Approve** and incremented on **Receive**.

#### Transfer State Machine

```
REQUESTED
    │
    ├──[approve]──→ APPROVED
    │                  │
    │              [transit]──→ IN_TRANSIT
    │                              │
    │                          [receive]──→ RECEIVED
    │
    └──[cancel]──→ CANCELLED (from REQUESTED, APPROVED, or IN_TRANSIT)
```

#### `POST /api/v1/transfers`

Create a transfer request. **Any authenticated user.**

> TECHNICIAN / SITE_ACCOUNTABLE: `target_site_id` must be their assigned site.

**Request Body:**
```json
{
  "source_site_id": "<uuid>",
  "target_site_id": "<uuid>",
  "item_id": "<uuid>",
  "quantity": 5,
  "notes": "Urgent — needed for Q2 expansion"
}
```

**Validation:** `quantity > 0`, `source_site_id ≠ target_site_id`.

**Response `201`:** `TransferResponse`

---

#### `GET /api/v1/transfers`

List transfers filtered by role and query params. **Any authenticated user.**

- ADMIN: sees all.
- SITE_ACCOUNTABLE: sees transfers where their site is source or target.
- TECHNICIAN: sees transfers for their assigned site only.

**Query Params:**

| Param | Type | Description |
|---|---|---|
| `site_id` | UUID | Filter by source or target site |
| `status` | enum | `REQUESTED`, `APPROVED`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED` |
| `limit` / `offset` | int | Pagination |

**Response `200`:** Paginated `TransferResponse` list (enriched with nested site/item/user data).

---

#### `GET /api/v1/transfers/{transfer_id}`

Get a single transfer with full enriched details and history.

**Response `200`:** `TransferResponse` · `404` if not found.

---

#### `GET /api/v1/transfers/{transfer_id}/history`

Get the full audit trail (all state transitions) for a transfer.

**Response `200`:** `TransferHistoryResponse[]`

---

#### `PATCH /api/v1/transfers/{transfer_id}/approve`

`REQUESTED → APPROVED`. **ADMIN or SOURCE site's SITE_ACCOUNTABLE.**

The source site manager (the one who owns and is giving the items) must approve. Atomically **decrements** source site stock. Raises `400` if insufficient stock.

**Response `200`:** Updated `TransferResponse`

---

#### `PATCH /api/v1/transfers/{transfer_id}/transit`

`APPROVED → IN_TRANSIT`. **ADMIN or SOURCE site's SITE_ACCOUNTABLE.**

Source site confirms goods have been physically dispatched. No stock movement.

**Response `200`:** Updated `TransferResponse`

---

#### `PATCH /api/v1/transfers/{transfer_id}/receive`

`IN_TRANSIT → RECEIVED`. **ADMIN, TARGET site's SITE_ACCOUNTABLE, or TECHNICIAN at target site.**

Target site confirms arrival of the goods. Atomically **increments** target site stock.

**Response `200`:** Updated `TransferResponse`

---

#### `PATCH /api/v1/transfers/{transfer_id}/cancel`

Cancel a transfer. Stock is rolled back if `APPROVED` or `IN_TRANSIT`.

- **ADMIN:** can cancel from any state.
- **Creator:** can cancel only `REQUESTED` transfers.

**Response `200`:** Updated `TransferResponse`

---

### Orders

> Purchasing order requests to suppliers.
> Workflow: `REQUESTED → APPROVED | REJECTED | RECEIVED`

#### `POST /api/v1/orders`

Create a purchasing order. **Any authenticated user.**

**Request Body:**
```json
{
  "item_name": "Huawei SUN2000-100KTL-M1",
  "price": 15000.00,
  "description": "Replacement inverter for Cairo site unit 3",
  "supplier_id": "<uuid or null>",
  "site_id": "<uuid>"
}
```

**Response `201`:** `OrderDetailedResponse`

---

#### `GET /api/v1/orders`

List all orders. **Any authenticated user.**

**Query Params:**

| Param | Type | Description |
|---|---|---|
| `site_id` | UUID | Filter by site |
| `status` | enum | `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED` |
| `limit` / `offset` | int | Pagination |

**Response `200`:** Paginated `OrderDetailedResponse` list.

---

#### `GET /api/v1/orders/{order_id}`

Get a single order with full detail (site + requester enriched). **Any authenticated user.**

**Response `200`:** `OrderDetailedResponse` · `404` if not found.

---

#### `PATCH /api/v1/orders/{order_id}/approve`

`REQUESTED → APPROVED`. **ADMIN only.**

**Response `200`:** Updated `OrderDetailedResponse`

---

#### `PATCH /api/v1/orders/{order_id}/reject`

`REQUESTED → REJECTED`. **ADMIN only.**

**Response `200`:** Updated `OrderDetailedResponse`

---

## Data Models & Enums

### UserRole
| Value | Description |
|---|---|
| `ADMIN` | Full system access |
| `SITE_ACCOUNTABLE` | Manages one site |
| `PROCUREMENT` | Purchasing access |
| `TECHNICIAN` | Field technician, read-only mostly |

### MainCategory
`SPARE_PARTS` · `TOOLS` · `SAFETY_EQUIPMENT`

### SubCategory
`INVERTER` · `DC_CABLE` · `AC_CABLE` · `PANEL` · `BREAKER` · `CLAMP_METER` · `AVO_METER` · `FIRST_AID_KIT` · `SAFETY_HARNESS` · `OTHER`

### TransferStatus
`REQUESTED` → `APPROVED` → `IN_TRANSIT` → `RECEIVED` · `CANCELLED`

### OrderStatus
`REQUESTED` → `APPROVED` · `REJECTED` · `RECEIVED`

---

### UserResponse
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "phone_number": "string | null",
  "role": "UserRole",
  "is_active": true,
  "site_id": "uuid | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### SiteResponse
```json
{
  "id": "uuid",
  "name": "string",
  "location": "string",
  "accountable_user_id": "uuid | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### SupplierResponse
```json
{
  "id": "uuid",
  "company_name": "string",
  "contact_name": "string",
  "email": "string",
  "phone": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### InventoryItemResponse
```json
{
  "id": "uuid",
  "name": "string",
  "main_category": "MainCategory",
  "sub_category": "SubCategory",
  "model_number": "string",
  "supplier_id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### StockResponse
```json
{
  "site_id": "uuid",
  "item_id": "uuid",
  "quantity_available": 10,
  "quantity_faulty": 0,
  "min_safety_threshold": 3,
  "updated_at": "datetime",
  "is_below_threshold": false
}
```

### TransferResponse
```json
{
  "id": "uuid",
  "source_site_id": "uuid",
  "target_site_id": "uuid",
  "item_id": "uuid",
  "quantity": 5,
  "status": "REQUESTED",
  "created_by": "uuid",
  "notes": "string | null",
  "created_at": "datetime",
  "updated_at": "datetime",
  "source_site": { "id": "uuid", "name": "string" },
  "target_site": { "id": "uuid", "name": "string" },
  "item": { "id": "uuid", "name": "string", "main_category": "...", "sub_category": "..." },
  "requester": { "id": "uuid", "email": "string", "role": "string" },
  "history": [ TransferHistoryResponse ]
}
```

### OrderDetailedResponse
```json
{
  "id": "uuid",
  "item_name": "string",
  "price": 15000.00,
  "description": "string | null",
  "status": "REQUESTED",
  "supplier_id": "uuid | null",
  "site_id": "uuid",
  "created_by_id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime",
  "site": { "id": "uuid", "name": "string" },
  "created_by": { "id": "uuid", "email": "string", "role": "string" }
}
```

---

## Onboarding Quickstart

### 1. Prerequisites

```bash
# Services required
docker compose up -d db redis    # PostgreSQL + Redis

# Python environment
cd Back-end
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Apply Migrations & Seed

```bash
alembic upgrade head
python seed.py
```

### 3. Run the Server

```bash
uvicorn app.main:app --reload
# API: http://localhost:8000/api/v1
# Docs: http://localhost:8000/api/v1/docs
```

### 4. Test Credentials (from seed.py)

| Email | Password | Role |
|---|---|---|
| `admin@solar-erp.io` | `Admin@1234!` | ADMIN |
| `cairo.accountable@solar-erp.io` | `Cairo@1234!` | SITE_ACCOUNTABLE |
| `alex.accountable@solar-erp.io` | `Alex@1234!` | SITE_ACCOUNTABLE |
| `aswan.accountable@solar-erp.io` | `Aswan@1234!` | SITE_ACCOUNTABLE |
| `procurement@solar-erp.io` | `Proc@1234!` | PROCUREMENT |
| `tech.cairo@solar-erp.io` | `Tech@1234!` | TECHNICIAN |

### 5. Quick API Test

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solar-erp.io","password":"Admin@1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Health check
curl http://localhost:8000/api/v1/health

# List sites
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/sites

# Explore OpenAPI
open http://localhost:8000/api/v1/docs
```

---

*Generated: 2026-05-29 · BRAITE-CMMS v1.0.0*
