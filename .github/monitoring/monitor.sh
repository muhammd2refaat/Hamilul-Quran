#!/usr/bin/env bash
# External monitoring for Elhafazah Academy, run from GitHub Actions.
#
# PRIVACY: this repository is public, so Actions logs are public. This script
# must never print what it checked, which check failed, status codes, response
# bodies or timings. Failure details are collected in memory and sent only to
# the private Telegram channel (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID secrets).
# Public output is limited to "passed" or "failed".
#
# Usage: monitor.sh uptime|deep
set -uo pipefail

MODE="${1:-uptime}"
FAILS=()
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

SITE="https://elhafazah-academy.com"
ADMIN="https://admin.elhafazah-academy.com"
API="https://api.elhafazah-academy.com/api/v1"
STG_SITE="https://staging.elhafazah-academy.com"
STG_ADMIN="https://staging-admin.elhafazah-academy.com"
STG_API="https://staging-api.elhafazah-academy.com/api/v1"

fail() { FAILS+=("$1"); }

# http_check <label> <url> [needle...]
# Passes on HTTP 200 with every needle present in the body. Retries 3 times,
# 10s apart, so a single network blip doesn't raise an alert.
http_check() {
  local label="$1" url="$2"; shift 2
  local code="000" attempt needle ok
  for attempt in 1 2 3; do
    code="$(curl -s -o "$TMP" -w '%{http_code}' -m 15 "$url" 2>/dev/null || echo 000)"
    ok=1
    if [ "$code" = "200" ]; then
      for needle in "$@"; do grep -qF -- "$needle" "$TMP" || { ok=0; break; }; done
      [ "$ok" = 1 ] && return 0
    fi
    [ "$attempt" -lt 3 ] && sleep 10
  done
  if [ "$code" = "200" ]; then fail "$label — expected content missing"
  else fail "$label — HTTP $code"; fi
}

tls_check() {
  local host="$1" end days
  # curl's verbose TLS handshake output includes the leaf certificate's expiry.
  end="$(curl -sv -o /dev/null -m 15 "https://$host/" 2>&1 \
        | grep -i 'expire date' | head -1 | sed 's/.*expire date: //')"
  if [ -z "$end" ]; then fail "TLS $host — could not read certificate"; return; fi
  days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
  [ "$days" -lt 14 ] && fail "TLS $host — expires in $days days"
  return 0
}

dns_check() {
  local host="$1"
  [ -z "${EXPECTED_IP:-}" ] && return 0   # secret not set: skip rather than leak
  dig +short A "$host" @1.1.1.1 | grep -qxF "$EXPECTED_IP" \
    || fail "DNS $host — A record no longer points at the server"
}

run_uptime() {
  http_check "Site home"        "$SITE/"
  http_check "Privacy page"     "$SITE/privacy"
  http_check "Terms page"       "$SITE/terms"
  http_check "Admin panel"      "$ADMIN/"
  http_check "API health"       "$API/health" '"database":"ok"' '"redis":"ok"'
  http_check "Staging site"     "$STG_SITE/"
  http_check "Staging admin"    "$STG_ADMIN/"
  http_check "Staging API"      "$STG_API/health" '"database":"ok"' '"redis":"ok"'
}

run_deep() {
  local h loc
  for h in elhafazah-academy.com admin.elhafazah-academy.com api.elhafazah-academy.com \
           staging.elhafazah-academy.com staging-admin.elhafazah-academy.com staging-api.elhafazah-academy.com; do
    tls_check "$h"
    dns_check "$h"
  done

  # Google Search Console ownership: losing this record lapses OAuth verification.
  dig +short TXT elhafazah-academy.com @8.8.8.8 | grep -q 'google-site-verification=' \
    || fail "Google site-verification TXT record is missing"

  # Google sign-in must still redirect to Google with our own callback; a
  # regression here breaks every login. Sign-in deliberately requests only
  # non-sensitive scopes (openid email profile) — calendar.events is granted
  # separately by teachers via /auth/google/calendar/connect (commit 95cf612).
  loc="$(curl -s -o /dev/null -m 15 -w '%{redirect_url}' "$API/auth/google/login?intent=login" 2>/dev/null)"
  case "$loc" in
    https://accounts.google.com/*redirect_uri=https%3A%2F%2Fapi.elhafazah-academy.com*scope=openid*) ;;
    https://accounts.google.com/*scope=openid*redirect_uri=https%3A%2F%2Fapi.elhafazah-academy.com*) ;;
    *) fail "Google sign-in redirect is broken or misconfigured" ;;
  esac

  # The teacher Calendar-connect flow must exist AND refuse anonymous callers.
  # 401/403 = present and protected. Anything else is either missing (404) or,
  # worse, reachable without a login.
  local code
  code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$API/auth/google/calendar/connect" 2>/dev/null)"
  case "$code" in
    401|403) ;;
    404) fail "Calendar-connect endpoint is missing (HTTP 404)" ;;
    *)   fail "Calendar-connect endpoint answered an anonymous request (HTTP $code)" ;;
  esac

  # Required by Google's OAuth policy for the calendar.events scope.
  http_check "Privacy policy Limited Use disclosure" "$SITE/privacy" "Limited Use"
}

case "$MODE" in
  uptime) run_uptime ;;
  deep)   run_deep ;;
  *) echo "unknown mode"; exit 2 ;;
esac

# Manual drill: the workflow's "simulate_failure" input injects one fake
# failure so the alert path (red run, Telegram message, GitHub email) can be
# tested without breaking anything. Never set on scheduled runs.
if [ "${SIMULATE_FAILURE:-false}" = "true" ]; then
  fail "SIMULATED FAILURE — test drill, nothing is actually broken"
fi

if [ "${#FAILS[@]}" -eq 0 ]; then
  echo "Checks passed."
  exit 0
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  msg="🔴 Elhafazah monitoring ($MODE)"$'\n'
  for f in "${FAILS[@]}"; do msg+="• $f"$'\n'; done
  msg+="Run: ${GITHUB_SERVER_URL:-}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
  curl -s -o /dev/null -m 15 \
    --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
    --data-urlencode "text=$msg" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" 2>/dev/null || true
  echo "Checks failed. Details were sent to the private alert channel."
else
  echo "Checks failed. Details are withheld from this public log; set the TELEGRAM_* secrets to receive them."
fi
exit 1
