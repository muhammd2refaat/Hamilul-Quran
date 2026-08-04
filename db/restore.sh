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

psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" \
  -c "CREATE DATABASE \"${POSTGRES_DB}\";"

gunzip -c "$DUMP_FILE" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "[pg-restore] Restore complete."
