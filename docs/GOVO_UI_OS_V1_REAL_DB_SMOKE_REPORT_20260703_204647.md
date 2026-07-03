# GOVO UI OS v1 Real DB Smoke Report

- Generated: 2026-07-03T20:46:52+00:00
- Git branch: govo-ui-os-v1-20260702_195253
- Git commit: 17a0332
- Test port: 8122
- Internal port: 8122
- Docker network mode: host
- Image tag: govo_portal:ui-os-v1-real-db-smoke-20260703_204647
- Env file: .env
- Notification/API keys stripped from temporary env.

## Syntax Check
```
```

## Container Status
```
NAMES                            STATUS         PORTS
govo_portal_real_db_smoke_8122   Up 7 seconds   
```

## Container Logs Tail
```

> govo-portal@1.0.0 start
> node server.js

✅ GOVO Local Premium Trust OS Phase 1 UI foundation mounted
GOVO Express v1.0 clean running on 8122
```

## Route Status
```
/                                          200
/app                                       200
/service-request                           200
/track?code=SMOKE-NOT-FOUND                200
/support                                   200
/shops                                     200
/services                                  200
/merchant                                  200
/rider                                     200
/admin/login                               200
/admin/dispatch                            302
/admin/merchant-jobs-preview               302
/admin/rider-jobs-preview                  302
/admin/notify-templates                    302
/admin/ops-daily-report                    302
/admin/ops-summary-draft                   302
/admin/launch-checklist                    302
```

## Authenticated Admin Route Status
```
/admin/dispatch                            200
/admin/merchant-jobs-preview               200
/admin/rider-jobs-preview                  200
/admin/notify-templates                    200
/admin/ops-daily-report                    200
/admin/ops-summary-draft                   200
/admin/launch-checklist                    200
```

## Real DB E2E Smoke
```
REQ_CODE=SRV-20260703-0002
RAW_CREATE_RESPONSE_MASKED:
{
  "success": true,
  "request": {
    "id": 2,
    "request_code": "SRV-20260703-0002",
    "status": "new",
    "priority": "urgent",
    "customer_name": "GOVO REAL DB SMOKE TEST - IGNORE",
    "customer_phone": "01700000000",
    "customer_area": "Meherpur",
    "customer_address": "Smoke test address",
    "service_type": "Real DB smoke test request",
    "problem_details": "Real DB smoke test request",
    "note": "Smoke test record only. Do not serve."
  },
  "request_id": "SRV-20260703-0002",
  "status": "Phone Confirming",
  "tracking_url": "/track?code=SRV-20260703-0002",
  "support_url": "/support"
}
ASSIGN_RESPONSE:
HTTP/1.1 302 Found
X-Powered-By: Express
X-Robots-Tag: noindex, nofollow
Location: /admin/dispatch?assignment_saved=1
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 56
Date: Fri, 03 Jul 2026 20:47:02 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to /admin/dispatch?assignment_saved=1SAFE_ASSIGNED_API:
{
    "ok": true,
    "code": "SRV-20260703-0002",
    "status": "Assigned",
    "area": "",
    "address": "",
    "need": "Service request",
    "assignedName": "Real DB Smoke Rider",
    "assignedPhone": "01800000000"
}
TRACK_HTML_CHECK:
<div id="govo-track-assigned-info-root"></div>
      var root = document.getElementById('govo-track-assigned-info-root');
      title.textContent = 'Assigned service update';
OPS_REPORT_STATUS:
302
```

## Result Rule

PASS only if:
- public routes are 200
- admin routes are 302 unauthenticated
- authenticated admin routes are 200
- REQ_CODE is not empty
- safe assigned API returns ok true
- private/internal operator note does not appear in track HTML

Container: govo_portal_real_db_smoke_8122
Report: docs/GOVO_UI_OS_V1_REAL_DB_SMOKE_REPORT_20260703_204647.md
Temp env removed after script exits.
