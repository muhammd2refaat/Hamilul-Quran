# Staging — Separate Test Deployment

A second, fully isolated deployment of Hamilul-Quran for testing changes
before they reach production. Set up 2026-08-28. Companion to
`DEPLOYMENT.md` (production) and `DATABASE.md` (backup/restore detail).

## What it is

| | Production | Staging |
|---|---|---|
| Branch | `main` | `staging` |
| Domains | `elhafazah-academy.com`, `api.…`, `admin.…` | `staging.elhafazah-academy.com`, `staging-api.…`, `staging-admin.…` |
| Compose file | `docker-compose.yml` | `docker-compose.staging.yml` |
| Compose project name | `hamilul-quran` (inferred from directory) | `hamilul-staging` (pinned explicitly — see below) |
| Env file | `.env.staging` (yes, that's really production — legacy name, don't let it confuse you) | `.env.staging-instance` |
| Postgres | `hamilul-postgres`, `postgres_data` volume | `staging-postgres`, `staging_postgres_data` volume — **entirely separate database** |
| Redis | `hamilul-redis` | `staging-redis` — separate |
| Backups (`pg-backup`) | Yes, daily + monthly restore drill | **No** — staging data is disposable by design, not worth backing up |
| Traefik | Shared — one Traefik instance routes both by hostname |
| Google OAuth | Same client/credentials as production, with an additional authorized redirect URI for the staging callback | |
| Outbound email (SMTP) | Configured, sends real emails | **Disabled by default** (`SMTP_HOST` blank) — staging shouldn't email real inboxes while testing |

**Why this design:** the only thing staging shares with production is the
Traefik reverse proxy (for TLS + routing) — everything that could touch or
leak real data (database, Redis, secrets, uploads, email) is separate. See
"Isolation, honestly" below for the one nuance worth knowing.

## Where the code comes from

Staging builds from a **separate git worktree**, not the main checkout, so
you can have `staging` and whatever branch production/you are working on
checked out at the same time without fighting over one working directory:

```bash
# One-time setup (already done):
git worktree add /root/Hamilul-Quran-staging staging

# To update staging before redeploying:
cd /root/Hamilul-Quran-staging
git pull origin staging
```

`docker-compose.staging.yml` (kept in the main repo, alongside
`docker-compose.yml`) points its `build.context` at that worktree directory —
so building staging always uses whatever's currently checked out there,
independent of what branch the main `/root/Hamilul-Quran` checkout is on.

## Day-to-day workflow: test a change before it reaches production

1. Get your change onto the `staging` branch (commit directly, or merge a
   feature branch into it) and push.
2. Pull it into the staging worktree and redeploy just the services that
   changed:
   ```bash
   cd /root/Hamilul-Quran-staging && git pull origin staging
   cd /root/Hamilul-Quran
   docker compose -f docker-compose.staging.yml --env-file .env.staging-instance build staging-backend
   docker compose -f docker-compose.staging.yml --env-file .env.staging-instance up -d staging-backend
   ```
   (swap `staging-backend` for `staging-frontend`/`staging-admin`, or omit
   the service name to build/redeploy all three)
3. Test it live at `https://staging.elhafazah-academy.com` /
   `https://staging-admin.elhafazah-academy.com` — a real deployed instance,
   not a local dev server, so this catches Docker-build-specific and
   production-config-specific issues a local `npm run dev` never would.
4. **Production is completely unaffected the entire time** — different
   containers, different database, different domains. Nothing you do on
   staging can touch a real user's data or the live site.
5. Once verified, merge `staging` → `main`, then follow `DEPLOYMENT.md`'s
   standard procedure to rebuild/redeploy production from `main`.

## First-time-only setup still needed

- [ ] **DNS**: add A records for `staging.elhafazah-academy.com`,
  `staging-api.elhafazah-academy.com`, `staging-admin.elhafazah-academy.com`
  → this server's IP (`72.61.96.204`). Traefik will automatically obtain
  Let's Encrypt certificates once these resolve — no restart needed, it
  retries on its own.
- [ ] **Google OAuth**: add
  `https://staging-api.elhafazah-academy.com/api/v1/auth/google/callback`
  as an additional authorized redirect URI on the existing OAuth client
  (Google Cloud Console → Credentials → the client whose ID is in
  `.env.staging-instance`). Staging reuses production's client rather than
  a separate one — see `Back-end/docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md`
  for why a second client would mean a second verification process.

Everything else (containers, database, migrations, seed admin account) is
already up and running as of 2026-08-28.

## Staging admin login

```
Email:    admin@staging.elhafazah-academy.com
Password: (in .env.staging-instance, ADMIN_PASSWORD — never committed)
```
Seeded via `full_seed.py` against the fresh staging database — same seed
script production's own admin account originally came from, just pointed
at `staging-postgres` instead.

## Isolation, honestly

`staging-backend`/`staging-frontend`/`staging-admin` are joined to the same
Docker network production's containers are on (`hamilul-quran_hamilul-net`)
— that's *required* so the one shared Traefik instance can route to them.
This means `staging-backend` has *network* reachability to
`hamilul-postgres`/`hamilul-redis` (can resolve the names, could open a TCP
connection) — it just never does, because it's never configured with
production's credentials (`.env.staging-instance` has its own
`POSTGRES_PASSWORD`, entirely different from `.env.staging`'s). The real,
structural isolation is `staging-net` — a separate bridge network that
`staging-postgres`/`staging-redis` live on and production's containers are
never joined to at all. Worth knowing rather than assuming "separate
containers" automatically means "no possible network path between them."

## Resetting staging back to empty

Since staging data is disposable by design:
```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging-instance down -v
docker compose -f docker-compose.staging.yml --env-file .env.staging-instance up -d
# re-run full_seed.py (see "First-time-only setup" section's admin login) if you want the seed data back
```
`-v` also drops the named volumes (`staging_postgres_data`, etc.) — this
starts staging's database completely empty again, migrations re-run
automatically on `staging-backend`'s next startup. **This flag only exists
on the staging compose file's volumes — it cannot reach production's
volumes, which are defined in the separate `docker-compose.yml` under a
different Compose project name.**

## Project-name safety note

`docker-compose.staging.yml` pins `name: hamilul-staging` at the top
specifically so its containers/networks/volumes never share a Compose
"project" with production's (which is `hamilul-quran`, inferred from the
directory both compose files live in). Without this, running both compose
files from the same directory would make each one see the other's
containers as "orphans" — confirmed live when this was first set up (see
git history on this file's first commit). Do not remove that line.
