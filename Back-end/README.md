# Hamilul-Quran Backend API

FastAPI backend for the Hamilul-Quran platform. Manages users, teachers, students, authentication, and user sub-records (complaints, teacher assignments, session scores).

## Tech Stack

- **FastAPI** (Python 3.12)
- **PostgreSQL** — Primary database
- **SQLModel** — ORM
- **Alembic** — Database migrations
- **Uvicorn** — ASGI Server

## Quick Start

### 1. Configure Environment

Create a `.env` file (if not existing) or export the necessary variables:
```bash
SQLALCHEMY_DATABASE_URI=postgresql+asyncpg://user:pass@localhost:5432/hamilul_quran_db
SECRET_KEY=your_secret_key
```

### 2. Run Migrations

To apply the schema changes to the database:
```bash
./.venv/bin/alembic upgrade head
```
*(Note: During development, `SQLModel.metadata.create_all` is sometimes used in scripts)*

### 3. Start the Server

```bash
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 4. Seed Mock Data

To seed the database with initial users, complaints, session scores, and history:
```bash
./.venv/bin/python seed_history.py
```

### 5. Access the API Docs

| Resource | URL |
|---|---|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

## API Endpoints

### Authentication
- `POST /auth/login` — Get JWT token
- `POST /auth/refresh` — Refresh token
- `POST /auth/logout` — Logout user
- `GET /auth/me` — Current logged-in user info

### Users
- `GET /users` — List users
- `POST /users` — Create user
- `GET /users/{id}` — Get single user
- `PATCH /users/{id}` — Update user
- `DELETE /users/{id}` — Delete user

### User Sub-Tables (Students & Teachers)
- `GET /users/{user_id}/complaints` — Get user complaints
- `GET /users/{user_id}/teacher-history` — Get teacher assignment history for a student
- `GET /users/{user_id}/session-scores` — Get recitation session scores

## Current Implementation Status
The backend primarily handles Authentication and User/Role management right now. Some gamification fields exist in the database (points, articles_viewed, webinars_attended) but are not actively managed by their own endpoints yet. Other domain features present in the frontend CMS (like standalone dashboard metrics, subscriptions, and platform-wide complaints not tied to a specific user) do not have corresponding backend endpoints yet.
