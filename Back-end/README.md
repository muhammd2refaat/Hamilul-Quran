# Solar Asset & Inventory ERP — Backend API

Enterprise backend for managing solar equipment assets, inventory stock, supplier procurement, and inter-site transfers with strict ACID guarantees.

## Tech Stack

- **FastAPI** (Python 3.12) — ASGI framework
- **PostgreSQL 16** — Primary database
- **SQLModel** — ORM (SQLAlchemy + Pydantic hybrid)
- **Alembic** — Database migrations
- **Redis 7** — Refresh token store + pub/sub events
- **Docker / docker-compose** — Containerized development

---

## Quick Start

### 1. Configure Environment

```bash
cp .env.example .env
# Edit .env — update SECRET_KEY with a real random string
```

### 2. Start Services

```bash
docker compose up -d
```

### 3. Run Migrations

```bash
docker compose exec api alembic upgrade head
```

### 4. Seed Mock Data

```bash
docker compose exec api python seed.py
```

### 5. Access the API

| Resource | URL |
|---|---|
| Swagger UI | http://localhost:8000/api/v1/docs |
| ReDoc | http://localhost:8000/api/v1/redoc |
| Health Check | http://localhost:8000/api/v1/health |

---

## Seeded Credentials

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@solar-erp.io` | `Admin@1234!` |
| SITE_ACCOUNTABLE (Cairo) | `cairo.accountable@solar-erp.io` | `Cairo@1234!` |
| SITE_ACCOUNTABLE (Alex) | `alex.accountable@solar-erp.io` | `Alex@1234!` |
| SITE_ACCOUNTABLE (Aswan) | `aswan.accountable@solar-erp.io` | `Aswan@1234!` |
| PROCUREMENT | `procurement@solar-erp.io` | `Proc@1234!` |

---

## API Endpoints

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Get JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Current user info |

### Users (ADMIN only)
| Method | Path |
|---|---|
| GET | `/api/v1/users` |
| POST | `/api/v1/users` |
| GET | `/api/v1/users/{id}` |
| PATCH | `/api/v1/users/{id}` |
| DELETE | `/api/v1/users/{id}` |

### Sites
| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/sites` | All (SITE_ACCOUNTABLE sees own only) |
| POST | `/api/v1/sites` | ADMIN |
| GET | `/api/v1/sites/{id}` | All |
| PATCH | `/api/v1/sites/{id}` | ADMIN |
| DELETE | `/api/v1/sites/{id}` | ADMIN |

### Suppliers (search: `?search=huawei`)
| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/suppliers` | All |
| POST | `/api/v1/suppliers` | ADMIN / PROCUREMENT |
| GET | `/api/v1/suppliers/{id}` | All |
| PATCH | `/api/v1/suppliers/{id}` | ADMIN / PROCUREMENT |
| DELETE | `/api/v1/suppliers/{id}` | ADMIN |

### Inventory
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/inventory/items?search=&category=` | Paginated |
| POST | `/api/v1/inventory/items` | ADMIN / PROCUREMENT |
| GET | `/api/v1/inventory/items/{id}` | All |
| PATCH | `/api/v1/inventory/items/{id}` | ADMIN / PROCUREMENT |
| GET | `/api/v1/inventory/stock?site_id=&below_threshold_only=` | RBAC filtered |
| POST | `/api/v1/inventory/stock` | ADMIN / SITE_ACCOUNTABLE (own site) |
| PATCH | `/api/v1/inventory/stock/{site_id}/{item_id}` | ADMIN / SITE_ACCOUNTABLE (own site) |

### Transfers (ACID State Machine)
| Method | Path | Side Effect |
|---|---|---|
| POST | `/api/v1/transfers` | Creates REQUESTED transfer |
| GET | `/api/v1/transfers` | RBAC-filtered list |
| GET | `/api/v1/transfers/{id}` | Single transfer |
| PATCH | `/api/v1/transfers/{id}/approve` | **Atomically decrements source stock** |
| PATCH | `/api/v1/transfers/{id}/transit` | Marks as IN_TRANSIT |
| PATCH | `/api/v1/transfers/{id}/receive` | **Atomically increments target stock** |
| PATCH | `/api/v1/transfers/{id}/cancel` | **Rolls back stock if APPROVED/IN_TRANSIT** |

---

## Transfer State Machine

```
REQUESTED ──────────────────── CANCELLED (creator or ADMIN)
    │
  approve (ADMIN) — decrements source stock
    │
APPROVED ───────────────────── CANCELLED (ADMIN, stock rollback)
    │
  transit (ADMIN)
    │
IN_TRANSIT ─────────────────── CANCELLED (ADMIN, stock rollback)
    │
  receive (ADMIN or target SITE_ACCOUNTABLE) — increments target stock
    │
RECEIVED ✓ (terminal)
```

---

## RBAC Matrix

| Resource | ADMIN | SITE_ACCOUNTABLE | PROCUREMENT |
|---|---|---|---|
| Users | Full CRUD | Own profile only | Own profile only |
| Sites | Full CRUD | Own site (read) | All sites (read) |
| Suppliers | Full CRUD | Read | Full CRUD |
| Inventory Items | Full CRUD | Read | Full CRUD |
| Inventory Stock | Full CRUD | Own site only | Read |
| Transfers | All | Own site transfers | Read |
| Transfer Approve | ✅ | ❌ | ❌ |
| Transfer Receive | ✅ | Own target site | ❌ |

---

## Running Tests

```bash
# Install deps locally (or run inside Docker)
pip install -r requirements.txt
pip install aiosqlite  # SQLite driver for tests

pytest tests/ -v
```

---

## Project Structure

```
app/
├── core/
│   ├── config.py         # Pydantic settings
│   ├── database.py       # Async SQLAlchemy engine
│   ├── redis_client.py   # Redis connection pool
│   ├── security.py       # JWT + bcrypt
│   ├── dependencies.py   # FastAPI RBAC dependencies
│   └── health.py         # /health endpoint
├── features/
│   ├── auth/             # JWT login, refresh, logout
│   ├── users/            # User management
│   ├── sites/            # Solar site management
│   ├── suppliers/        # Supplier CRUD
│   ├── inventory/        # Items + stock levels
│   └── transfers/        # ACID transfer state machine
└── main.py               # App factory
alembic/                  # Database migrations
tests/                    # pytest test suite
seed.py                   # Mock data seeder
```

---

## Redis Events

The system publishes the following events for downstream consumers:

| Channel | Trigger |
|---|---|
| `solar_erp:low_stock_alert` | Stock falls below `min_safety_threshold` |
| `solar_erp:transfer_status_changed` | Any transfer state transition |
