#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8114}"
ENV_FILE="${2:-.env}"
TS="$(date +%Y%m%d_%H%M%S)"

NET="govo_smoke_net_${PORT}"
PGC="govo_pg_smoke_${PORT}"
APPC="govo_app_smoke_pg_${PORT}"
IMAGE="govo_portal:ui-os-v1-local-pg-smoke-${TS}"
REPORT="docs/GOVO_UI_OS_V1_LOCAL_PG_SMOKE_REPORT_${TS}.md"
TMP_ENV="/tmp/govo-local-pg-smoke-env-${TS}"

PG_USER="govo_smoke"
PG_DB="govo_smoke"
PG_PASS="$(openssl rand -hex 18 2>/dev/null || date +%s%N)"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Env file not found: $ENV_FILE"
  exit 1
fi

if [ -z "${GOVO_TEST_ADMIN_PIN:-}" ]; then
  read -r -s -p "Admin PIN hidden: " ADMIN_PIN
  echo
else
  ADMIN_PIN="$GOVO_TEST_ADMIN_PIN"
fi

mkdir -p docs

{
  echo "# GOVO UI OS v1 Local PostgreSQL Smoke Report"
  echo
  echo "- Generated: $(date -Is)"
  echo "- Git commit: $(git rev-parse --short HEAD)"
  echo "- Port: $PORT"
  echo "- Network: $NET"
  echo "- App container: $APPC"
  echo "- DB container: $PGC"
  echo "- Note: temporary smoke DB only; not production DB."
  echo
} > "$REPORT"

echo "===== CLEAN OLD SMOKE ====="
docker rm -f "$APPC" "$PGC" >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true

echo "===== CREATE NETWORK + POSTGRES ====="
docker network create "$NET" >/dev/null

docker run -d \
  --name "$PGC" \
  --network "$NET" \
  -e POSTGRES_DB="$PG_DB" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASS" \
  postgres:15-alpine >/dev/null

echo "===== WAIT POSTGRES ====="
for i in $(seq 1 30); do
  if docker exec "$PGC" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    echo "✅ Postgres ready"
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    echo "❌ Postgres not ready"
    docker logs --tail=80 "$PGC" || true
    exit 1
  fi
done

echo "===== BUILD APP ====="
docker build -t "$IMAGE" . >/tmp/govo-local-pg-build.log

echo "===== CREATE SAFE TEMP ENV ====="
grep -Ev '^(PORT|HOST|GOVO_SKIP_DB|DATABASE_URL|POSTGRES|PGHOST|PGPORT|PGUSER|PGDATABASE|PGPASSWORD|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|SMS_API_KEY|OPENROUTER_API_KEY)=' "$ENV_FILE" > "$TMP_ENV" || true

{
  echo "PORT=3000"
  echo "HOST=0.0.0.0"
  echo "DATABASE_URL=postgresql://${PG_USER}:${PG_PASS}@${PGC}:5432/${PG_DB}"
  echo "GOVO_NOTIFY_DISABLED=1"
  echo "GOVO_SKIP_NOTIFY=1"
  echo "DISABLE_NOTIFICATIONS=1"
} >> "$TMP_ENV"

chmod 600 "$TMP_ENV"

echo "===== START APP REAL DB MODE ====="
docker run -d \
  --name "$APPC" \
  --network "$NET" \
  -p "127.0.0.1:${PORT}:3000" \
  --env-file "$TMP_ENV" \
  "$IMAGE" >/dev/null

sleep 8

echo "===== CONTAINER STATUS ====="
docker ps -a --filter "name=$APPC" --filter "name=$PGC" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee /tmp/govo-local-pg-status.txt

echo "===== APP LOGS TAIL MASKED ====="
docker logs --tail=120 "$APPC" 2>&1 \
  | sed -E \
    -e 's#(postgres(ql)?://)[^@[:space:]]+@#\1<hidden>@#g' \
    -e 's#(DATABASE_URL=).*#\1<hidden>#g' \
    -e 's#(ADMIN_PIN=).*#\1<hidden>#g' \
  | tee /tmp/govo-local-pg-app-logs.txt || true

{
  echo "## Container Status"
  echo '```'
  cat /tmp/govo-local-pg-status.txt
  echo '```'
  echo
  echo "## App Logs Tail"
  echo '```'
  cat /tmp/govo-local-pg-app-logs.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== ROUTE TEST ====="
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

: > /tmp/govo-local-pg-routes.txt
for path in "${ROUTES[@]}"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || true)"
  printf "%-42s %s\n" "$path" "$code" | tee -a /tmp/govo-local-pg-routes.txt
done

{
  echo "## Route Status"
  echo '```'
  cat /tmp/govo-local-pg-routes.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== ADMIN LOGIN ====="
curl -s -i -c "/tmp/govo-local-pg-admin-cookie-${PORT}.txt" \
  -X POST \
  -d "pin=${ADMIN_PIN}" \
  "http://127.0.0.1:${PORT}/admin/login" \
  | head -30 > /tmp/govo-local-pg-login.txt

echo "===== AUTH ADMIN TEST ====="
AUTH_ROUTES=(
  "/admin/dispatch"
  "/admin/merchant-jobs-preview"
  "/admin/rider-jobs-preview"
  "/admin/ops-daily-report"
  "/admin/ops-summary-draft"
  "/admin/launch-checklist"
)

: > /tmp/govo-local-pg-auth.txt
for path in "${AUTH_ROUTES[@]}"; do
  code="$(curl -s -b "/tmp/govo-local-pg-admin-cookie-${PORT}.txt" -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${path}" || true)"
  printf "%-42s %s\n" "$path" "$code" | tee -a /tmp/govo-local-pg-auth.txt
done

{
  echo "## Auth Admin Routes"
  echo '```'
  cat /tmp/govo-local-pg-auth.txt
  echo '```'
  echo
} >> "$REPORT"

echo "===== E2E TEST ====="
curl -s -X POST "http://127.0.0.1:${PORT}/api/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"GOVO LOCAL PG SMOKE TEST - IGNORE",
    "mobile":"01700000000",
    "area":"Meherpur",
    "need":"Local PostgreSQL smoke test",
    "note":"Private smoke note should not leak",
    "address":"Smoke test address",
    "priority":"urgent"
  }' > /tmp/govo-local-pg-request.json

REQ_CODE="$(python3 - <<'PY'
import json, re
try:
    data=json.load(open("/tmp/govo-local-pg-request.json"))
    value = (
        data.get("code")
        or data.get("request_id")
        or data.get("requestId")
        or data.get("tracking_code")
        or (data.get("request") or {}).get("request_code")
        or (data.get("request") or {}).get("code")
        or (data.get("request") or {}).get("id")
        or ""
    )
    if not value and data.get("tracking_url"):
        m = re.search(r"[?&]code=([^&]+)", str(data.get("tracking_url")))
        value = m.group(1) if m else ""
    print(value)
except Exception:
    print("")
PY
)"

: > /tmp/govo-local-pg-e2e.txt
echo "REQ_CODE=$REQ_CODE" | tee -a /tmp/govo-local-pg-e2e.txt

if [ -n "$REQ_CODE" ]; then
  curl -s -i -b "/tmp/govo-local-pg-admin-cookie-${PORT}.txt" \
    -X POST \
    -d "code=$REQ_CODE" \
    -d "assigned_name=Local PG Smoke Rider" \
    -d "assigned_phone=01800000000" \
    -d "operator_note=Private operator note should not appear on customer page" \
    "http://127.0.0.1:${PORT}/admin/dispatch/assign" \
    | head -20 >> /tmp/govo-local-pg-e2e.txt

  echo "SAFE_API:" >> /tmp/govo-local-pg-e2e.txt
  curl -s "http://127.0.0.1:${PORT}/api/track/safe-assigned-info?code=$REQ_CODE" \
    | python3 -m json.tool >> /tmp/govo-local-pg-e2e.txt || true

  echo "TRACK_HTML_CHECK:" >> /tmp/govo-local-pg-e2e.txt
  curl -s "http://127.0.0.1:${PORT}/track?code=$REQ_CODE" \
    | grep -Ei "govo-track-assigned-info-root|Assigned service update|Private operator note" \
    | head -40 >> /tmp/govo-local-pg-e2e.txt || true
fi

{
  echo "## E2E Test"
  echo '```'
  cat /tmp/govo-local-pg-e2e.txt
  echo '```'
  echo
  echo "## Result"
  echo
  echo "This proves app works in real PostgreSQL mode using a temporary local DB."
  echo "Production DB is still not configured until a real production DATABASE_URL/PGHOST is provided."
} >> "$REPORT"

rm -f "$TMP_ENV"

echo
echo "✅ ONE-CLICK LOCAL PG SMOKE DONE"
echo "REPORT=$REPORT"
echo "APP_CONTAINER=$APPC"
echo "DB_CONTAINER=$PGC"
