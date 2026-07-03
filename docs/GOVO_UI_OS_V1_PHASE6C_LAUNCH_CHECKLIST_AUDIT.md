# GOVO UI OS v1 — Phase 6C Launch Checklist + Pre-Live Audit

Scope:
- Add admin-only launch checklist page.
- Add JSON checklist endpoint.
- Run pre-live audit before any production deploy.
- No live deploy.
- No secrets/env edits.
- No real notification sending.
- No DB schema change.

Routes:
- /admin/launch-checklist
- /api/admin/launch-checklist

Hard pre-live blockers:
- rotate leaked/old Telegram token
- rotate SMS API key
- rotate admin PIN/session secrets
- verify DB mode separately
- visual QA on mobile
- backup before live promotion
