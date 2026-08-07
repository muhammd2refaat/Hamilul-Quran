# Database — Backup & Restore, In Detail

Everything about how the Postgres database is backed up, how restore
actually works mechanically, what it costs in downtime, what happens to
existing data, and an honest evaluation of how solid this setup really is.
For the short operational command cheat-sheet, see `DEPLOYMENT.md`'s
"Database backups" section — this file is the full explanation behind
those commands.

**Live snapshot as of 2026-08-07:** 7 backups on disk, oldest from
2026-08-04, database itself ~9.7MB. Small now — re-read the numbers in this
doc's "Evaluation" section again once real user data accumulates; the
duration/size assumptions below will age.

---

## 1. Where everything lives

- **Live database**: `hamilul-postgres` container, Postgres 16, database
  name `hamilul_quran_db`, data in the `postgres_data` named Docker volume.
- **Backups**: `hamilul-pg-backup` container (same `postgres:16-alpine`
  image, so `pg_dump`/`psql` are always version-matched to the live
  server), writing into the `postgres_backups` named Docker volume — a
  **different** volume from the live data, but on the **same physical disk,
  same server** as the live database. That last point matters a lot; see
  Evaluation.
- **Scripts**: `db/backup.sh` (runs continuously inside `hamilul-pg-backup`)
  and `db/restore.sh` (run manually, on demand).
- Only the `backend` service ever connects to Postgres directly — Frontend
  and Admin-CMS both go through the backend's API. This is relevant below:
  when something needs to stop for a restore, it's `backend`, nothing else.

## 2. How backup works, and how often

`db/backup.sh` runs an infinite loop inside `hamilul-pg-backup`:

```sh
run_backup() {
  # pg_dump --no-owner --no-privileges > file.sql, then gzip
  # find ... -mtime +$RETENTION_DAYS -delete
}
while true; do
  run_backup
  sleep "$INTERVAL_SECONDS"
done
```

- **Interval**: `BACKUP_INTERVAL_SECONDS`, default **86400 (24 hours)**.
- **Retention**: `BACKUP_RETENTION_DAYS`, default **14 days** — anything
  older gets deleted automatically at the end of every run.
- **It also fires once immediately whenever the `pg-backup` container
  (re)starts**, before entering the sleep loop — not just on a fixed clock.
  That's why the real file list sometimes has two backups closer together
  than 24h (e.g. this host has one from 2026-08-04 12:28 and another at
  13:08, 40 minutes later — a container restart in between).
- **Format**: plain-text SQL from `pg_dump` (not the binary/custom `-Fc`
  format), gzip-compressed. `--no-owner --no-privileges` makes it portable —
  restoring doesn't fight over role ownership on a different environment.
  Filename: `hamilul_quran_db_<UTC-timestamp>.sql.gz`.
- **What's captured**: the *entire* database — every table, every row,
  schema included — as a single self-contained snapshot at that exact
  moment. Not incremental, no WAL/point-in-time recovery: each file stands
  alone and represents "the whole database, right then."
- **Failure handling**: if `pg_dump` itself fails, the script logs it and
  leaves prior backups untouched (`rm -f "$tmp_sql"`) — it never deletes an
  old, good backup because a new one failed to generate. But also: nothing
  pages anyone when this happens. See Evaluation.

### Does taking a backup require any downtime?

**No.** `pg_dump` runs against the live database using Postgres's normal
MVCC snapshot mechanism — it reads a consistent point-in-time view without
blocking reads or writes from the app. `backend` keeps serving real traffic
throughout. There is no scenario where taking a backup should ever require
stopping anything.

## 3. How restore actually works, mechanically

```bash
docker exec -it hamilul-pg-backup sh /backup/restore.sh /backups/<file>.sql.gz
```

`db/restore.sh`, step by step:

1. 5-second sleep — your last chance to Ctrl+C.
2. `DROP DATABASE IF EXISTS "hamilul_quran_db";`
3. `CREATE DATABASE "hamilul_quran_db";` — brand new, completely empty.
4. `gunzip -c <file> | psql ... -v ON_ERROR_STOP=1` — replays the entire
   dump into that fresh, empty database.

Every step runs with `set -eu` / `ON_ERROR_STOP=1` — the moment anything
errors, the script stops immediately rather than continuing with a
half-applied restore.

### Do I need to shut down the app first?

**Yes — specifically `backend`, and it's not optional.** I tested this
directly against a live Postgres 16 instance rather than assuming:

```
ERROR:  database "..." is being accessed by other users
DETAIL:  There is 1 other session using the database.
```

`DROP DATABASE` refuses to run while *any* other session holds a connection
to that database. `backend` keeps a live connection pool open the entire
time it's running (confirmed 4 active connections to `hamilul_quran_db`
from a normal idle state on this host) — so step 2 above will fail and
abort **before touching any data** if `backend` is still up.

**This is currently a manual step the operator has to know and do** — the
scripts don't automate it. Practical sequence:

```bash
docker compose --env-file .env.staging stop backend
docker exec -it hamilul-pg-backup sh /backup/restore.sh /backups/<file>.sql.gz
docker compose --env-file .env.staging up -d backend
```

`postgres`, `redis`, `traefik`, `frontend`, and `admin` do **not** need to
stop — only `backend` holds a Postgres connection. But since Frontend and
Admin-CMS both depend on `backend`'s API for everything, the *practical*
effect is the whole product is unusable to real visitors for the duration —
login fails, dashboards fail to load, etc. — even though those containers
are technically still running. Don't read "only backend needs to stop" as
"the site stays up."

**How long is that window?** Failing safely (aborting on the connection
error) is instant. An actual successful restore — drop, create, replay — is
proportional to database size; at the current ~9.7MB this is a few seconds.
It'll grow as real data accumulates; re-time it periodically rather than
assuming it stays this fast forever.

*(One more edge case worth knowing: `pg-backup` itself only holds a
connection for the few moments it's actively running `pg_dump`, then
disconnects — it isn't a standing blocker like `backend` is. There's a
narrow theoretical window where a scheduled backup running at the exact
moment you attempt a restore could also cause a transient "being accessed"
error; if that happens, just retry a few seconds later.)*

### Can I restore while production is "working," without touching anything else?

Backup: yes, always, zero impact, as covered above.

Restore: **no** — by definition, restoring wipes and replaces the live
database `backend` is actively reading and writing. There's no way to
restore "underneath" a running app without at minimum stopping the one
service connected to that database. This isn't a limitation you can route
around; it's what "restore" means for a database that other things are
actively connected to.

## 4. What happens to existing/current data

`DROP DATABASE` followed by `CREATE DATABASE` means the restore is a **full
destructive replacement, not a merge**. Concretely:

- Everything currently in `hamilul_quran_db` at the moment you run
  `restore.sh` — every user, allocation, complaint, receipt, request,
  session score, all of it — is gone the instant step 2 runs, before the
  backup's data has even started loading back in.
- What comes back is *exactly* what was in the database at the backup's
  timestamp — nothing more, nothing less.
- **Anything created, changed, or deleted between that backup and the
  moment you restore is permanently lost.** New student signups, new
  allocations, new payments, everything — if it happened after the backup
  you're restoring, it does not survive. This is the core trade-off: you
  get back what was deleted/broken, but you also lose everything legitimate
  that happened since. See the previous conversation turn's answer for the
  "just get one deleted row back without losing everything else" approach
  (restore into a scratch database, manually copy out just that row).

## 5. What if the restored data "duplicates" something already there?

**It can't, structurally — and that's worth understanding rather than just
taking on faith.** Because step 2 (`DROP DATABASE`) removes the entire
existing database *before* step 4 replays anything, there is nothing left
for the restored data to conflict or duplicate against. You're not
importing rows into a database that already has rows — you're populating a
database that is completely empty at that instant. Every row lands exactly
once, whatever the backup contains.

Duplication (or, more precisely, a hard failure) would only be a concern if
someone did something `restore.sh` deliberately does *not* do: `psql`-ing a
dump directly into the **already-populated live database** without
dropping it first. Every row this codebase creates uses a UUID primary key
(`Field(default_factory=uuid.uuid4, primary_key=True, ...)` throughout the
models) — replaying `INSERT`/`COPY` statements for rows whose primary keys
already exist would violate the primary-key uniqueness constraint and the
whole operation would error out (`duplicate key value violates unique
constraint`), not silently create duplicate/conflicting records. Postgres
doesn't allow two rows with the same primary key to coexist regardless of
how they got there — so "silent duplication" isn't something this system
can produce either way. `restore.sh`'s drop-first approach sidesteps the
question entirely rather than relying on that constraint to fail loudly.

## 6. Exploring a backup safely, and GUI access

Already covered in depth in `DEPLOYMENT.md`'s "Database backups" section —
short version: restore into a throwaway `hamilul_quran_explore` database
(`docker exec -e POSTGRES_DB=hamilul_quran_explore hamilul-pg-backup sh
/backup/restore.sh /backups/<file>.sql.gz`) rather than the live one when
you just want to look around, and Postgres is reachable at
`127.0.0.1:5433` (loopback-only) for an SSH-tunneled desktop GUI client.
Both of those operations are non-destructive to the live database and
don't require stopping `backend`.

## 7. Evaluation — how solid is this, honestly

**What's genuinely solid:**
- Backups are automated, running on schedule, and retention pruning is
  verified working (confirmed live: files correctly age out past 14 days).
- Same Postgres version for dump and restore — no version-skew surprises.
- `restore.sh` fails safe: `ON_ERROR_STOP=1` throughout means a bad restore
  aborts loudly instead of silently half-applying.
- Backups live in their own Docker volume, separate from the live data
  volume — an accidental `docker volume rm` on the data volume alone
  wouldn't also destroy the backups.
- The scratch-database explore pattern and loopback-only GUI access mean
  you can inspect real data without ever risking the live database.

**Real gaps, in rough order of how much they'd hurt:**

1. **No off-server copy.** Every backup lives on the exact same disk, same
   host, as the live database. If this server is lost — hardware failure,
   disk corruption, the hosting account itself being compromised or lost —
   the live database *and every single backup* are lost together. This is
   the single biggest risk in the current setup; a daily backup that dies
   with the server it's backing up isn't protecting against the scenario
   that matters most. Highest-value fix: ship backups off-box periodically
   (S3/Backblaze/rsync to a second host — anything not sharing a failure
   domain with this server).
2. **Restore needing `backend` stopped isn't automated or documented
   anywhere until this file** — someone's first real restore attempt would
   hit the `DROP DATABASE ... being accessed by other users` error cold,
   with no indication beforehand that they needed to stop a service first.
   `restore.sh` could be made to `SELECT pg_terminate_backend(pid) FROM
   pg_stat_activity WHERE datname = current_database() AND pid <>
   pg_backend_pid()` before dropping, removing the manual step entirely —
   flag if you'd like that added.
3. **24-hour granularity, no point-in-time recovery.** You can only roll
   back to whichever daily snapshot exists, never to "two minutes before
   the mistake." A WAL-archiving setup would close this gap but is real
   additional complexity — probably not worth it at current data volumes,
   worth revisiting as the platform grows.
4. **No automated restore drills.** Backups are created but, as far as
   this system goes, never automatically test-restored anywhere to confirm
   they're actually valid. A silently corrupt or truncated backup file
   would only be discovered at the worst possible moment — when you
   actually need it. A periodic (e.g. monthly) scripted restore into a
   scratch database plus a basic row-count/integrity check would catch
   this early.
5. **No alerting on backup failure.** `backup.sh` logs a failure to the
   container's stdout and moves on — nothing pages anyone. Combined with
   #4, a broken backup pipeline could go unnoticed for weeks. A free
   healthchecks.io-style "ping on success, alert if no ping received in
   25 hours" hook would close this cheaply.
6. **14-day retention, single tier.** Fine for "I broke something this
   week," useless for "I need data from two months ago." Not urgent at
   current scale, but worth a longer-retention weekly/monthly tier once
   there's real user data worth protecting that long.

None of these are "this system is broken" — daily backups with verified
retention pruning and a safe, fail-closed restore script is a real, working
safety net, better than a lot of small production setups have. The gap
that actually matters is #1 (single point of failure on this one server);
the rest are refinements on top of a fundamentally sound base.
