# GOVO UI OS v1 — Phase 7B Secret Rotation + Pre-live Plan

Status: No live deploy in this phase.

## Hard blockers before live promotion

1. Rotate Telegram bot token
   - Do through BotFather.
   - Update production env only.
   - Never paste token into chat/screenshots.
   - Verify Telegram notify health after rotation.

2. Rotate SMS API key
   - Do through SMS provider dashboard.
   - Update production env only.
   - Never paste key into chat/screenshots.
   - Send one controlled test SMS only after confirmation.

3. Rotate admin PIN/session secrets
   - Use new strong PIN.
   - Update env/server secret source.
   - Verify old PIN no longer works.
   - Verify new PIN works.

4. Real DB mode smoke test
   - Run without GOVO_SKIP_DB=1.
   - Test request create, dispatch, assignment, tracking.
   - No schema changes during live promotion.

5. Mobile visual QA
   - Check homepage, app, service request, track, support, admin login.
   - Verify no broken layout on Android.

6. Production backup
   - Backup current live server.js/image/container metadata before promotion.
   - Keep rollback command ready.

## Live promotion rule

Do not promote new image to live port 8090 until:
- RC audit public routes pass.
- Auth admin routes pass.
- Secret rotation is complete.
- Real DB smoke test is complete.
- Mobile QA is complete.
- Rollback image/tag is known.
