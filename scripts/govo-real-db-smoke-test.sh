#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
PORT="${2:-8109}"
TS="$(date +%Y%m%d_%H%M%S)"
IMAGE_TAG="govo_portal:ui-os-v1-real-db-smoke-${TS}"
CONTAINER="govo_portal_real_db_smoke_${PORT}"
REPORT="docs/GOVO_UI_OS_V1_REAL_DB_SMOKE_REPORT_${TS}.md"
TMP_ENV="/tmp/govo-real-db-smoke-env-${TS}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Env file not found: $ENV_FILE"
  exit 1
fi

if [ -z "${GOVO_TEST_ADMIN_PIN:-}" ]; then
  read -r -s -p "Admin PIN for smoke login hidden: " ADMIN_PIN
  echo
else
  ADMIN_PIN="$GOVO_TEST_ADMIN_PIN"
fi

mkdir -p "$(dirname "$REPORT")"

echo "===== GOVO REAL DB SMOKE TEST ====="
echo "This does NOT deploy live."
echo "ENV_FILE=$ENV_FILE"
echo "PORT=$PORT"
echo "IMAGE_TAG=$IMAGE_TAG"
echo "REPORT=$REPORT"
echo

echo "===== CREATE SAFE TEMP ENV ====="
# Remove local/test flags and notification/API keys so DB can be tested without sending real messages.
grep -Ev '^(GOVO_SKIP_DB|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|SMS_API_KEY|OPENROUTER_API_KEY)=' "$ENV_FILE" > "$TMP_ENV" || true
{
  # Force container app to listen on internal Docker port 3000.
  # Real .env may contain PORT=8090/other, which causes host curl 000 in smoke tests.
  echo "PORT=3000"
  echo "HOST=0.0.0.0"
  echo "GOVO_NOTIFY_DISABLED=1"
  echo "GOVO_SKIP_NOTIFY=1"
  echo "DISABLE_NOTIFICATIONS=1"
} >> "$TMP_ENV"

chmod 600 "$TMP_ENV"

{
  echo "# GOVO UI OS v1 Real DB Smoke Report"
  echo
  echo "- Generated: $(date -Is)"
  echo "- Git branch: $(git branch --show-current)"
  echo "- Git commit: $(git rev-parse --short HEAD)"
  echo "- Test port: $PORT"
  echo "- Image tag: $IMAGE_TAG"
  echo "- Env file: $ENV_FILE"
  echo "- Notification/API keys stripped from temporary env."
  echo
} > "$REPORT"

echo "===== SYNTAX CHECK ====="
node --check server.js | tee /tmp/govo-real-db-node-check.txt

{
  echo "## Syntax Check"
  echo '```'
  cat /tmp/govo-real-db-node-check.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== DOCKER BUILD ====="
docker build -t "$IMAGE_TAG" . >/tmp/govo-real-db-docker-build.txt

echo "===== START REAL DB SMOKE CONTAINER ====="
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER" \
  -p "127.0.0.1:${PORT}:3000" \
  --env-file "$TMP_ENV" \
  "$IMAGE_TAG" >/tmp/govo-real-db-container-id.txt

sleep 7

echo "===== CONTAINER STATUS ====="
docker ps -a --filter "name=$CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee /tmp/govo-real-db-container-status.txt
docker logs --tail=80 "$CONTAINER" > /tmp/govo-real-db-container-logs.txt 2>&1 || true

{
  echo "## Container Status"
  echo '```'
  cat /tmp/govo-real-db-container-status.txt
  echo '```'
  echo
  echo "## Container Logs Tail"
  echo '```'
  cat /tmp/govo-real-db-container-logs.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== ROUTE STATUS ====="
ROUTES=(
  "/"
  "/app"
  "/service-request"
  "/track?code=SMOKE-NOT-FOUND"
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
)

: > /tmp/govo-real-db-routes.txt
for path in "${ROUTES[@]}"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || true)"
  printf "%-42s %s\n" "$path" "$code" | tee -a /tmp/govo-real-db-routes.txt
done

{
  echo "## Route Status"
  echo '```'
  cat /tmp/govo-real-db-routes.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== ADMIN LOGIN ====="
curl -s -i -c "/tmp/govo-real-db-admin-cookie-${PORT}.txt" \
  -X POST \
  -d "pin=${ADMIN_PIN}" \
  "http://127.0.0.1:${PORT}/admin/login" \
  | head -30 > /tmp/govo-real-db-admin-login.txt

echo "===== AUTH ADMIN ROUTES ====="
AUTH_ROUTES=(
  "/admin/dispatch"
  "/admin/merchant-jobs-preview"
  "/admin/rider-jobs-preview"
  "/admin/notify-templates"
  "/admin/ops-daily-report"
  "/admin/ops-summary-draft"
  "/admin/launch-checklist"
)

: > /tmp/govo-real-db-auth-routes.txt
for path in "${AUTH_ROUTES[@]}"; do
  code="$(curl -s -b "/tmp/govo-real-db-admin-cookie-${PORT}.txt" -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || true)"
  printf "%-42s %s\n" "$path" "$code" | tee -a /tmp/govo-real-db-auth-routes.txt
done

{
  echo "## Authenticated Admin Route Status"
  echo '```'
  cat /tmp/govo-real-db-auth-routes.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== REAL DB E2E SMOKE ====="
curl -s -X POST "http://127.0.0.1:${PORT}/api/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"GOVO REAL DB SMOKE TEST - IGNORE",
    "mobile":"01700000000",
    "area":"Meherpur",
    "need":"Real DB smoke test request",
    "note":"Smoke test record only. Do not serve.",
    "address":"Smoke test address",
    "priority":"urgent"
  }' > /tmp/govo-real-db-request.json

REQ_CODE="$(python3 - <<'PY'
import json
try:
    data=json.load(open("/tmp/govo-real-db-request.json"))
    print(data.get("code") or data.get("requestId") or data.get("id") or "")
except Exception:
    print("")
PY
)"

: > /tmp/govo-real-db-e2e.txt
echo "REQ_CODE=$REQ_CODE" | tee -a /tmp/govo-real-db-e2e.txt
echo "RAW_CREATE_RESPONSE_MASKED:" >> /tmp/govo-real-db-e2e.txt
python3 - <<'PY' >> /tmp/govo-real-db-e2e.txt
import json
try:
    data=json.load(open("/tmp/govo-real-db-request.json"))
    # Do not print phone/private note if echoed by app.
    for k in ["mobile","phone","customer_phone","note","address"]:
        data.pop(k, None)
    print(json.dumps(data, ensure_ascii=False, indent=2))
except Exception as e:
    print("Could not parse create response")
PY

if [ -n "$REQ_CODE" ]; then
  echo "ASSIGN_RESPONSE:" >> /tmp/govo-real-db-e2e.txt
  curl -s -i -b "/tmp/govo-real-db-admin-cookie-${PORT}.txt" \
    -X POST \
    -d "code=$REQ_CODE" \
    -d "assigned_name=Real DB Smoke Rider" \
    -d "assigned_phone=01800000000" \
    -d "operator_note=Internal smoke operator note should not appear on customer page" \
    "http://127.0.0.1:${PORT}/admin/dispatch/assign" \
    | head -20 >> /tmp/govo-real-db-e2e.txt

  echo "SAFE_ASSIGNED_API:" >> /tmp/govo-real-db-e2e.txt
  curl -s "http://127.0.0.1:${PORT}/api/track/safe-assigned-info?code=$REQ_CODE" \
    | python3 -m json.tool >> /tmp/govo-real-db-e2e.txt || true

  echo "TRACK_HTML_CHECK:" >> /tmp/govo-real-db-e2e.txt
  curl -s "http://127.0.0.1:${PORT}/track?code=$REQ_CODE" \
    | grep -Ei "govo-track-assigned-info-root|Assigned service update|Internal smoke operator note" \
    | head -40 >> /tmp/govo-real-db-e2e.txt || true

  echo "OPS_REPORT_STATUS:" >> /tmp/govo-real-db-e2e.txt
  curl -s -b "/tmp/govo-real-db-admin-cookie-${PORT}.txt" \
    -o /dev/null -w "%{http_code}\n" \
    "http://127.0.0.1:${PORT}/api/admin/ops-daily-report" \
    >> /tmp/govo-real-db-e2e.txt || true
fi

{
  echo "## Real DB E2E Smoke"
  echo '```'
  cat /tmp/govo-real-db-e2e.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== RESULT HINT ====="
{
  echo "## Result Rule"
  echo
  echo "PASS only if:"
  echo "- public routes are 200"
  echo "- admin routes are 302 unauthenticated"
  echo "- authenticated admin routes are 200"
  echo "- REQ_CODE is not empty"
  echo "- safe assigned API returns ok true"
  echo "- private/internal operator note does not appear in track HTML"
  echo
  echo "Container: $CONTAINER"
  echo "Report: $REPORT"
  echo "Temp env removed after script exits."
} >> "$REPORT"

rm -f "$TMP_ENV"

echo
echo "✅ Real DB smoke test finished"
echo "Report: $REPORT"
echo "Container: $CONTAINER"
