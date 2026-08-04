# ─── Backend Dockerfile ─────────────────────────────────────────────────────────
# FastAPI + Uvicorn + Alembic migrations
# python:3.12-slim keeps the image small while matching the dev Python version.
# ─────────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# System dependencies needed by asyncpg (C extension) and qrcode (Pillow).
# gosu lets the entrypoint start as root (to fix uploads/ volume ownership),
# then drop to an unprivileged user for the actual long-running server
# process — the thing that handles all untrusted network input.
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        gosu \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 --gid 1001 --home /app --no-create-home appuser

WORKDIR /app

# ─── Install Python dependencies ─────────────────────────────────────────────
# Copied first so Docker can cache this layer independently of app code changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ─── Copy application source ──────────────────────────────────────────────────
COPY . .

# ─── Ensure uploads directory exists inside the container ─────────────────────
# The real data lives in the Docker named volume; this just pre-creates the path.
RUN mkdir -p uploads/certificates uploads/receipts \
    && chown -R appuser:appuser /app

# ─── Entrypoint ───────────────────────────────────────────────────────────────
# Stays root (see USER note below) so it can fix /app/uploads ownership on a
# volume that predates this non-root change, then execs Uvicorn as appuser.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
