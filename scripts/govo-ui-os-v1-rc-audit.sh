#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8108}"
ADMIN_PIN="${GOVO_TEST_ADMIN_PIN:-1234}"
TS="$(date +%Y%m%d_%H%M%S)"
IMAGE_TAG="govo_portal:ui-os-v1-rc-${TS}"
CONTAINER="govo_portal_ui_os_rc_${PORT}"
REPORT="docs/GOVO_UI_OS_V1_RC_AUDIT_REPORT_${TS}.md"

BACKUP_ROOT="${GOVO_RC_BACKUP_ROOT:-/opt/govo-backups}"
if ! mkdir -p "$BACKUP_ROOT" >/dev/null 2>&1; then
  BACKUP_ROOT="$HOME/govo-backups"
  mkdir -p "$BACKUP_ROOT"
fi

BACKUP_DIR="$BACKUP_ROOT/ui-os-v1-rc-${TS}"

mkdir -p "$(dirname "$REPORT")" "$BACKUP_DIR"

echo "===== GOVO UI OS v1 RC AUDIT ====="
echo "PORT=$PORT"
echo "IMAGE_TAG=$IMAGE_TAG"
echo "REPORT=$REPORT"
echo "BACKUP_DIR=$BACKUP_DIR"

{
  echo "# GOVO UI OS v1 RC Audit Report"
  echo
  echo "- Generated: $(date -Is)"
  echo "- Git branch: $(git branch --show-current)"
  echo "- Git commit: $(git rev-parse --short HEAD)"
  echo "- Test port: $PORT"
  echo "- Image tag: $IMAGE_TAG"
  echo
} > "$REPORT"

echo "===== BACKUP SNAPSHOT ====="
cp server.js "$BACKUP_DIR/server.js"
git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
git status --short > "$BACKUP_DIR/git-status.txt"

echo "===== SYNTAX CHECK ====="
node --check server.js | tee /tmp/govo-rc-node-check.txt
{
  echo "## Syntax Check"
  echo '```'
  cat /tmp/govo-rc-node-check.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== DOCKER BUILD ====="
docker build -t "$IMAGE_TAG" . | tee /tmp/govo-rc-docker-build.txt

echo "===== START TEST CONTAINER ====="
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER" \
  -p "127.0.0.1:${PORT}:3000" \
  -e GOVO_SKIP_DB=1 \
  "$IMAGE_TAG" >/tmp/govo-rc-container-id.txt

sleep 4

echo "===== PUBLIC + ADMIN ROUTE STATUS ====="
ROUTES=(
  "/"
  "/app"
  "/service-request"
  "/track?code=SRV-MOCK-123456"
  "/support"
  "/shops"
  "/services"
  "/merchant"
  "/rider"
  "/admin/login"
  "/admin/dispatch"
  "/admin/merchant-jobs-preview"
  "/admin/rider-jobs-preview"
  "/admin/notify-templates"
  "/admin/ops-daily-report"
  "/admin/ops-summary-draft"
  "/admin/launch-checklist"
  "/api/admin/launch-checklist"
)

: > /tmp/govo-rc-routes.txt
for path in "${ROUTES[@]}"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || true)"
  printf "%-38s %s\n" "$path" "$code" | tee -a /tmp/govo-rc-routes.txt
done

{
  echo "## Route Status"
  echo '```'
  cat /tmp/govo-rc-routes.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== ADMIN LOGIN TEST ====="
curl -s -i -c "/tmp/govo-admin-cookie-${PORT}.txt" \
  -X POST \
  -d "pin=${ADMIN_PIN}" \
  "http://127.0.0.1:${PORT}/admin/login" \
  | head -30 > /tmp/govo-rc-admin-login.txt

echo "===== AUTH ADMIN ROUTE TEST ====="
AUTH_ROUTES=(
  "/admin/dispatch"
  "/admin/merchant-jobs-preview"
  "/admin/rider-jobs-preview"
  "/admin/notify-templates"
  "/admin/ops-daily-report"
  "/admin/ops-summary-draft"
  "/admin/launch-checklist"
  "/api/admin/launch-checklist"
)

: > /tmp/govo-rc-auth-routes.txt
for path in "${AUTH_ROUTES[@]}"; do
  code="$(curl -s -b "/tmp/govo-admin-cookie-${PORT}.txt" -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || true)"
  printf "%-38s %s\n" "$path" "$code" | tee -a /tmp/govo-rc-auth-routes.txt
done

{
  echo "## Authenticated Admin Route Status"
  echo '```'
  cat /tmp/govo-rc-auth-routes.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== E2E REQUEST -> ASSIGN -> TRACK -> REPORT ====="
curl -s -X POST "http://127.0.0.1:${PORT}/api/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"RC Audit Test",
    "mobile":"01700000000",
    "area":"Meherpur",
    "need":"RC audit delivery test",
    "note":"RC audit private note should not leak",
    "address":"RC audit test address",
    "priority":"urgent"
  }' > /tmp/govo-rc-request.json

REQ_CODE="$(python3 - <<'PY'
import json
data=json.load(open("/tmp/govo-rc-request.json"))
print(data.get("code") or data.get("requestId") or data.get("id") or "")
PY
)"

echo "REQ_CODE=$REQ_CODE" | tee /tmp/govo-rc-e2e.txt

if [ -n "$REQ_CODE" ]; then
  curl -s -i -b "/tmp/govo-admin-cookie-${PORT}.txt" \
    -X POST \
    -d "code=$REQ_CODE" \
    -d "assigned_name=RC Audit Rider" \
    -d "assigned_phone=01800000000" \
    -d "operator_note=Private operator note should not appear on customer track page" \
    "http://127.0.0.1:${PORT}/admin/dispatch/assign" \
    | head -20 >> /tmp/govo-rc-e2e.txt

  echo "SAFE_API:" >> /tmp/govo-rc-e2e.txt
  curl -s "http://127.0.0.1:${PORT}/api/track/safe-assigned-info?code=$REQ_CODE" \
    | python3 -m json.tool >> /tmp/govo-rc-e2e.txt || true

  echo "TRACK_HTML_CHECK:" >> /tmp/govo-rc-e2e.txt
  curl -s "http://127.0.0.1:${PORT}/track?code=$REQ_CODE" \
    | grep -Ei "govo-track-assigned-info-root|Assigned service update|Private operator note" \
    | head -40 >> /tmp/govo-rc-e2e.txt || true

  echo "OPS_REPORT_JSON:" >> /tmp/govo-rc-e2e.txt
  curl -s -b "/tmp/govo-admin-cookie-${PORT}.txt" \
    "http://127.0.0.1:${PORT}/api/admin/ops-daily-report" \
    | python3 -m json.tool | head -80 >> /tmp/govo-rc-e2e.txt || true
fi

{
  echo "## E2E Test"
  echo '```'
  cat /tmp/govo-rc-e2e.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== FILENAME-ONLY SECRET SCAN ====="
grep -RIl \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=.govo-ai \
  --exclude-dir=backups \
  --exclude-dir=public \
  -E 'OPENROUTER_API_KEY|sk-or-|BOT_TOKEN|TELEGRAM_BOT_TOKEN|ADMIN_PIN|PGPASSWORD|POSTGRES_PASSWORD|PASSWORD=|SECRET=|API_KEY=|DATABASE_URL|SMS_API_KEY' . \
  > /tmp/govo-rc-secret-files.txt || true

{
  echo "## Filename-only Secret Scan"
  echo
  echo "Only filenames are shown below. Secret values are not printed."
  echo
  echo '```'
  cat /tmp/govo-rc-secret-files.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== FINAL SUMMARY ====="
{
  echo "## Live Deploy Blockers"
  echo
  echo "- Telegram bot token rotation pending."
  echo "- SMS API key rotation pending."
  echo "- Admin PIN/session secret rotation pending."
  echo "- Real DB mode smoke test pending."
  echo "- Mobile visual QA pending."
  echo "- Production backup/promotion plan pending."
  echo
  echo "## Audit Artifacts"
  echo
  echo "- Backup: $BACKUP_DIR"
  echo "- Report: $REPORT"
  echo "- Test container: $CONTAINER"
  echo "- Test image: $IMAGE_TAG"
  echo
} >> "$REPORT"

echo "✅ RC audit finished"
echo "Report: $REPORT"
echo "Backup: $BACKUP_DIR"
