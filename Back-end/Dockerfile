# ─── Backend Dockerfile ─────────────────────────────────────────────────────────
# FastAPI + Uvicorn + Alembic migrations
# python:3.12-slim keeps the image small while matching the dev Python version.
# ─────────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# System dependencies needed by asyncpg (C extension) and qrcode (Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

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
RUN mkdir -p uploads/certificates uploads/receipts

# ─── Entrypoint ───────────────────────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
