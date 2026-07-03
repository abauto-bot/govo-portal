# GOVO UI OS v1 — Phase 7A Release Candidate Audit

Scope:
- Full release candidate audit before any live deploy.
- Build local-only Docker RC image.
- Test public/customer/admin routes.
- Test request creation, assignment, tracking, report/checklist routes.
- Create backup snapshot.
- Run filename-only secret scan.
- No live deploy.
- No secret values printed.
- No credential rotation inside this phase.

Hard live blockers:
- Rotate Telegram bot token.
- Rotate SMS API key.
- Rotate admin PIN/session secrets.
- Verify real DB mode separately.
- Confirm mobile visual QA.
- Backup before live promotion.
