# Deployment / Update Guide

Manual procedure for pulling new code onto the server and rolling it out via
Docker Compose. Written after the 2026-08-04 security/reliability fix batch
(authz gaps, exception-handler leaks, Alembic baseline drift, DB backups,
HttpOnly-cookie auth) — see `Back-end/PROGRESS.md` for what changed.

## Prerequisites

- SSH access to the server, with this repo checked out and `docker`/`docker
  compose` available.
- A real `.env.staging` file at the repo root (git-ignored — never commit
  it). Holds `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`,
  `ALLOWED_ORIGINS` (must list the exact frontend/admin origins — cookie
  auth requires an explicit origin list, not a wildcard), JWT secrets, etc.
- Docker Compose services: `traefik`, `postgres`, `redis`, `backend`,
  `frontend`, `admin`, `pg-backup`. Routed domains: `elhafazah-academy.com`
  (Frontend), `admin.elhafazah-academy.com` (Admin-CMS),
  `api.elhafazah-academy.com` (backend).

## Standard update procedure

1. **Pull the latest code**
   ```bash
   git fetch origin
   git checkout Staging-with-features   # or whichever branch is being deployed
   git pull
   ```

2. **Check what's running before you touch anything**
   ```bash
   docker ps -a
   docker compose --env-file .env.staging config --services
   ```
   Confirms the current containers and that `.env.staging` resolves cleanly.

3. **Rebuild only the services that changed.** Backend/Frontend/Admin-CMS
   each build from source; `postgres`/`redis`/`traefik`/`pg-backup` use
   stock images and don't need rebuilding for a code change.
   ```bash
   docker compose --env-file .env.staging build backend frontend admin
   ```

4. **Restart those services** (this recreates the containers with the new
   images; `postgres`/`redis` data volumes are untouched):
   ```bash
   docker compose --env-file .env.staging up -d backend frontend admin
   ```
   Database migrations run automatically on backend startup
   (`Back-end/entrypoint.sh` runs `alembic upgrade head` before starting
   Uvicorn) — no separate migration step needed.

5. **Verify.**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"   # all should be "healthy"
   docker logs hamilul-backend --tail 50                # check the migration step + no startup errors
   curl -sk -H "Host: api.elhafazah-academy.com" https://localhost/api/v1/health
   ```
   The health endpoint should return `{"status":"ok","services":{"database":"ok","redis":"ok"}}`.
   For a deeper check, exercise the real login flow with a throwaway test
   account (see "Smoke-testing auth" below) rather than trusting `/health`
   alone.

## First-time setup / disaster recovery (empty database)

If standing up a brand-new environment (empty `postgres` volume), bringing
the stack up is enough — `alembic upgrade head` now migrates a truly empty
database cleanly (this was the bug fixed 2026-08-04; previously it silently
relied on the dev DB already being `create_all()`'d and manually stamped).
```bash
docker compose --env-file .env.staging up -d --build
```
To seed initial data (admin account etc.), see whatever seed script
`Back-end/` provides (check `Back-end/PROGRESS.md` / `docs/` — not part of
this guide).

## Database backups

`pg-backup` runs a daily `pg_dump | gzip` into the `postgres_backups` named
volume (`db/backup.sh`), pruning anything older than `BACKUP_RETENTION_DAYS`
(default 14). It starts automatically with the rest of the stack; if it
isn't running:
```bash
docker compose --env-file .env.staging up -d pg-backup
```

**Trigger a manual backup right before a risky change** (e.g. before a
migration you're unsure about):
```bash
docker exec hamilul-pg-backup sh -c '. /backup/backup.sh; run_backup'
docker exec hamilul-pg-backup ls -la /backups
```

**Restore from a backup** (destructive — drops and recreates the target
database):
```bash
docker cp <path-to-backup>.sql.gz hamilul-pg-backup:/backups/   # if restoring from off-box
docker exec -it hamilul-pg-backup sh /backup/restore.sh /backups/<file>.sql.gz
```
`restore.sh` gives a 5-second window to Ctrl+C before it drops the database.

## Rollback

Since builds are tagged by service name (not by commit), rolling back means
rebuilding from an older commit, not swapping an image tag:
```bash
git log --oneline -10                 # find the last known-good commit
git checkout <previous-commit-or-tag>
docker compose --env-file .env.staging build backend frontend admin
docker compose --env-file .env.staging up -d backend frontend admin
```
If the bad deploy included a migration, you may also need to restore the
pre-migration database backup (see above) — check `alembic history` and
`Back-end/PROGRESS.md` before downgrading a migration in place.

## Smoke-testing auth after a deploy (cookie-based login)

Auth now runs on HttpOnly cookies (`access_token`/`refresh_token`), set with
`Secure; SameSite=Lax`. A quick end-to-end check with a cookie jar:
```bash
COOKIEJAR=$(mktemp)
curl -sk -c "$COOKIEJAR" -H "Host: api.elhafazah-academy.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-account-email>","password":"<test-account-password>"}' \
  https://localhost/api/v1/auth/login

curl -sk -b "$COOKIEJAR" -H "Host: api.elhafazah-academy.com" \
  https://localhost/api/v1/auth/me   # should return the user, no Authorization header sent

curl -sk -b "$COOKIEJAR" -c "$COOKIEJAR" -X POST -H "Host: api.elhafazah-academy.com" \
  https://localhost/api/v1/auth/logout   # 204

curl -sk -b "$COOKIEJAR" -H "Host: api.elhafazah-academy.com" \
  https://localhost/api/v1/auth/me   # should now 401
rm -f "$COOKIEJAR"
```
Never run this against a real user's credentials — use a disposable test
account (create one directly via the backend's DB session if needed, then
delete it afterward).
