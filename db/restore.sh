#!/bin/sh
# db/restore.sh — restore a database from a backup produced by backup.sh.
#
# Run inside the pg-backup container against a running postgres service:
#   docker compose exec pg-backup sh /backup/restore.sh /backups/<file>.sql.gz
#
# The target database is dropped and recreated before restoring, so this is
# destructive — intended for disaster recovery / spinning up a fresh
# environment from a known-good dump, not routine use.
set -eu

if [ $# -ne 1 ]; then
  echo "Usage: restore.sh <path-to-backup.sql.gz>" >&2
  exit 1
fi

DUMP_FILE="$1"
if [ ! -f "$DUMP_FILE" ]; then
  echo "Backup file not found: $DUMP_FILE" >&2
  exit 1
fi

echo "[pg-restore] Restoring $DUMP_FILE into ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
echo "[pg-restore] This will DROP and recreate ${POSTGRES_DB}. Ctrl+C within 5s to abort."
sleep 5

export PGPASSWORD="$POSTGRES_PASSWORD"

# DROP DATABASE refuses to run while any other session (e.g. backend's
# connection pool) is connected to it — confirmed directly against this
# stack's Postgres. Force-terminating those connections first means a
# manual `docker compose stop backend` is no longer required before running
# this script; backend's own pool reconnects on its next query once the
# restore finishes. Stopping backend first is still the cleanest way to
# avoid live requests erroring mid-restore, just no longer mandatory.
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" \
  -c "CREATE DATABASE \"${POSTGRES_DB}\";"

gunzip -c "$DUMP_FILE" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "[pg-restore] Restore complete."
