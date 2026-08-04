#!/bin/sh
# db/backup.sh — periodic pg_dump backups for the pg-backup service.
#
# Runs in a loop inside a plain postgres:16-alpine container (matches the
# server version, so pg_dump/pg_restore are always compatible): dump, gzip,
# prune anything older than BACKUP_RETENTION_DAYS, sleep, repeat.
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"

mkdir -p "$BACKUP_DIR"

run_backup() {
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  out_file="$BACKUP_DIR/${POSTGRES_DB}_${timestamp}.sql.gz"
  tmp_sql="${out_file}.tmp"

  echo "[pg-backup] $(date -u +%FT%TZ) starting dump -> $out_file"
  # Dump to a plain file first and check pg_dump's own exit code — piping
  # straight into gzip would hide a pg_dump failure, since plain /bin/sh
  # (no pipefail) only reports the last command in a pipeline's status.
  if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
      -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      --no-owner --no-privileges > "$tmp_sql"; then
    gzip -f "$tmp_sql"
    mv "${tmp_sql}.gz" "$out_file"
    echo "[pg-backup] $(date -u +%FT%TZ) completed: $(du -h "$out_file" | cut -f1)"
  else
    echo "[pg-backup] $(date -u +%FT%TZ) FAILED — leaving prior backups untouched" >&2
    rm -f "$tmp_sql"
  fi

  find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
}

while true; do
  run_backup
  sleep "$INTERVAL_SECONDS"
done
