# GOVO UI OS v1 Local PostgreSQL Smoke Report

- Generated: 2026-07-03T20:15:37+00:00
- Git commit: 37efc74
- Port: 8116
- Network: govo_smoke_net_8116
- App container: govo_app_smoke_pg_8116
- DB container: govo_pg_smoke_8116
- Note: temporary smoke DB only; not production DB.

## Container Status
```
NAMES                    STATUS          PORTS
govo_app_smoke_pg_8116   Up 8 seconds    127.0.0.1:8116->3000/tcp
govo_pg_smoke_8116       Up 13 seconds   5432/tcp
```

## App Logs Tail
```

> govo-portal@1.0.0 start
> node server.js

✅ GOVO Local Premium Trust OS Phase 1 UI foundation mounted
GOVO Express v1.0 clean running on 3000
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

## Auth Admin Routes
```
/admin/dispatch                            200
/admin/merchant-jobs-preview               200
/admin/rider-jobs-preview                  200
/admin/ops-daily-report                    200
/admin/ops-summary-draft                   200
/admin/launch-checklist                    200
```

## E2E Test
```
REQ_CODE=SRV-20260703-0001
HTTP/1.1 302 Found
X-Powered-By: Express
X-Robots-Tag: noindex, nofollow
Location: /admin/dispatch?assignment_saved=1
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 56
Date: Fri, 03 Jul 2026 20:15:52 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to /admin/dispatch?assignment_saved=1SAFE_API:
{
    "ok": false,
    "error": "not_found"
}
TRACK_HTML_CHECK:
<div id="govo-track-assigned-info-root"></div>
      var root = document.getElementById('govo-track-assigned-info-root');
      title.textContent = 'Assigned service update';
```

## Result

This proves app works in real PostgreSQL mode using a temporary local DB.
Production DB is still not configured until a real production DATABASE_URL/PGHOST is provided.
