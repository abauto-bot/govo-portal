# GOVO UI OS v1 — Phase 6A Notify Templates + Daily Report Preview

Scope:
- Add admin-only SMS/WhatsApp message template preview.
- Add admin-only daily ops report preview.
- Add JSON report endpoint for internal admin preview.
- No real SMS sending.
- No real WhatsApp sending.
- No API key usage.
- No secrets/env edits.
- No DB schema change.
- No live deploy.

Routes:
- /admin/notify-templates
- /admin/ops-daily-report
- /api/admin/ops-daily-report

Safety:
- Admin protected.
- noindex/noarchive.
- private no-store cache.
- Read-only data.
