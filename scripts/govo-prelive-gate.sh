#!/usr/bin/env bash
set -euo pipefail

echo "===== GOVO PRE-LIVE GATE ====="
echo "This script does NOT deploy."
echo

FAIL=0

check_flag() {
  local name="$1"
  local label="$2"
  local value="${!name:-NO}"

  if [ "$value" = "YES" ]; then
    echo "✅ $label"
  else
    echo "❌ $label"
    echo "   Set $name=YES only after this is truly completed."
    FAIL=1
  fi
}

echo "===== REQUIRED HUMAN CONFIRMATIONS ====="
check_flag "GOVO_ROTATED_TELEGRAM" "Telegram bot token rotated"
check_flag "GOVO_ROTATED_SMS" "SMS API key rotated"
check_flag "GOVO_ROTATED_ADMIN_SECRET" "Admin PIN/session secret rotated"
check_flag "GOVO_REAL_DB_SMOKE_OK" "Real DB smoke test passed"
check_flag "GOVO_MOBILE_QA_OK" "Mobile visual QA passed"
check_flag "GOVO_ROLLBACK_READY" "Rollback image/backup ready"

echo
echo "===== GIT / SYNTAX ====="
git status --short
node --check server.js

echo
echo "===== FILENAME-ONLY SECRET SCAN ====="
grep -RIl \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=.govo-ai \
  --exclude-dir=backups \
  --exclude-dir=public \
  -E 'OPENROUTER_API_KEY|sk-or-|BOT_TOKEN|TELEGRAM_BOT_TOKEN|ADMIN_PIN|PGPASSWORD|POSTGRES_PASSWORD|PASSWORD=|SECRET=|API_KEY=|DATABASE_URL|SMS_API_KEY' . || true

echo
if [ "$FAIL" -eq 0 ]; then
  echo "✅ PRE-LIVE GATE PASS"
  echo "You may proceed to controlled pre-live promotion planning."
else
  echo "⛔ PRE-LIVE GATE BLOCKED"
  echo "Do not live deploy yet."
  exit 1
fi
