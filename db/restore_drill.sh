#!/bin/sh
# db/restore_drill.sh — periodic restore verification.
#
# Restores the most recent backup into a throwaway scratch database
# (never the live one), replays it, does a basic sanity check, then drops
# the scratch database. Intended to run on a schedule (see the host
# crontab entry set up alongside this script) so a silently broken or
# truncated backup gets caught within a month instead of during a real
# emergency, when it's too late to do anything about it.
#
# Run manually any time with:
#   docker exec hamilul-pg-backup sh /backup/restore_drill.sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DRILL_DB="${DRILL_DB:-hamilul_quran_drill}"
# Same optional healthchecks.io-style ping as backup.sh — empty = disabled.
HEALTHCHECK_PING_URL="${RESTORE_DRILL_HEALTHCHECK_PING_URL:-}"

ping_healthcheck() {
  [ -n "$HEALTHCHECK_PING_URL" ] || return 0
  wget -q -T 10 -t 3 -O /dev/null "${HEALTHCHECK_PING_URL}${1}" >/dev/null 2>&1 || true
}

fail() {
  echo "[restore-drill] $(date -u +%FT%TZ) FAILED — $1" >&2
  ping_healthcheck "/fail"
  exit 1
}

latest="$(find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -type f | sort | tail -1)"
[ -n "$latest" ] || fail "no backup files found in $BACKUP_DIR"

echo "[restore-drill] $(date -u +%FT%TZ) restoring $latest into $DRILL_DB for verification"

export PGPASSWORD="$POSTGRES_PASSWORD"

psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${DRILL_DB}\";" \
  -c "CREATE DATABASE \"${DRILL_DB}\";" \
  >/dev/null || fail "could not create scratch database $DRILL_DB"

if ! gunzip -c "$latest" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
    -d "$DRILL_DB" -v ON_ERROR_STOP=1 -q; then
  psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS \"${DRILL_DB}\";" >/dev/null 2>&1 || true
  fail "dump did not replay cleanly: $latest"
fi

# Crude but effective smoke test: a truncated/corrupt dump either fails the
# replay above outright, or leaves the schema present but empty of tables
# it should have. Confirms neither happened.
table_count="$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$DRILL_DB" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"

psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${DRILL_DB}\";" >/dev/null

if [ "$table_count" -lt 1 ]; then
  fail "restored database had no tables: $latest"
fi

echo "[restore-drill] $(date -u +%FT%TZ) OK — $latest restored cleanly, $table_count tables present"
ping_healthcheck ""
