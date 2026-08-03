#!/bin/sh
# entrypoint.sh — Backend container startup
# 1. Wait for PostgreSQL to accept connections
# 2. Run Alembic migrations
# 3. Start Uvicorn
set -e

# ─── Wait for Postgres ─────────────────────────────────────────────────────────
echo "[entrypoint] Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
until python -c "
import asyncio, asyncpg, os, sys
async def check():
    try:
        conn = await asyncpg.connect(
            host=os.environ['POSTGRES_HOST'],
            port=int(os.environ.get('POSTGRES_PORT', '5432')),
            user=os.environ['POSTGRES_USER'],
            password=os.environ['POSTGRES_PASSWORD'],
            database=os.environ['POSTGRES_DB'],
        )
        await conn.close()
    except Exception as e:
        sys.exit(1)
asyncio.run(check())
" 2>/dev/null; do
  echo "[entrypoint] Postgres not ready yet — retrying in 2s..."
  sleep 2
done

echo "[entrypoint] PostgreSQL is ready."

# ─── Run Alembic migrations ───────────────────────────────────────────────────
echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head
echo "[entrypoint] Migrations complete."

# ─── Start Uvicorn ─────────────────────────────────────────────────────────────
echo "[entrypoint] Starting Uvicorn..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${UVICORN_WORKERS:-2}" \
    --proxy-headers \
    --forwarded-allow-ips="*"
