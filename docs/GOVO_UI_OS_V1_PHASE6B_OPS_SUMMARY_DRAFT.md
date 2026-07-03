# GOVO UI OS v1 — Phase 6B Ops Summary Draft

Scope:
- Add admin-only Telegram/WhatsApp-safe daily ops summary draft.
- Add copy/export page.
- Add text export route.
- Add JSON endpoint.
- No real Telegram send.
- No real SMS send.
- No real WhatsApp send.
- No API key usage.
- No secrets/env edits.
- No DB schema change.
- No live deploy.

Routes:
- /admin/ops-summary-draft
- /admin/ops-summary-draft.txt
- /api/admin/ops-summary-draft

Safety:
- Admin protected.
- Read-only.
- noindex/noarchive.
- private no-store cache.
- Does not expose customer phone/private operator notes.
