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
# Optional healthchecks.io-style ping URL — "ping on success, alert if no
# ping arrives within the check's configured grace period" (see the check's
# own dashboard, not this script, for that timeout). Empty = disabled, same
# no-op-until-configured pattern as SMTP_HOST elsewhere in this stack.
# Failure pings hit "$HEALTHCHECK_PING_URL/fail" (healthchecks.io convention).
HEALTHCHECK_PING_URL="${HEALTHCHECK_PING_URL:-}"

mkdir -p "$BACKUP_DIR"

ping_healthcheck() {
  # $1: "" for success, "/fail" for failure. Never let a monitoring blip
  # break the backup itself — ping failures here are swallowed. wget, not
  # curl: this image (postgres:16-alpine) doesn't ship curl, but does ship
  # BusyBox's wget.
  [ -n "$HEALTHCHECK_PING_URL" ] || return 0
  wget -q -T 10 -t 3 -O /dev/null "${HEALTHCHECK_PING_URL}${1}" >/dev/null 2>&1 || true
}

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
    ping_healthcheck ""
  else
    echo "[pg-backup] $(date -u +%FT%TZ) FAILED — leaving prior backups untouched" >&2
    rm -f "$tmp_sql"
    ping_healthcheck "/fail"
  fi

  find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
}

while true; do
  run_backup
  sleep "$INTERVAL_SECONDS"
done
