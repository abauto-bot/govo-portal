# GOVO UI OS v1 — Phase 7D Real DB Smoke Test

Status: No live deploy in this phase.

Purpose:
- Run a local-only Docker container with real DB environment.
- Verify request create, admin dispatch, assignment, tracking, and admin reports.
- Do not use GOVO_SKIP_DB=1.
- Do not send real SMS/Telegram/WhatsApp from the smoke container.

Safety:
- Local-only port.
- Temporary env file removes notify/API keys.
- Secret values are not printed.
- One test request may be written to real DB:
  GOVO REAL DB SMOKE TEST - IGNORE

Pass condition:
- Public routes return 200.
- Admin protected routes return 302 unauthenticated.
- Admin authenticated routes return 200.
- /api/requests creates a code.
- /admin/dispatch/assign works.
- /api/track/safe-assigned-info returns JSON.
- /track page loads assigned info injection safely.
- Report endpoints work.

Fail condition:
- Any 500 on critical public/admin routes.
- DB connection failure.
- Request creation fails.
- Assignment/tracking fails.
