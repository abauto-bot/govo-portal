# GOVO Express — Change Log

This log records meaningful project changes made by ABU AI or other coding agents.

Do not include secrets, tokens, passwords or private customer data.

---

## 2026-07-18 — GOVO v16: multilingual customer UX + unified request flows finalized

### Added

- Customer app v16 (`govo_app_v16.html`): centralized i18n with English (default), বাংলা and Banglish (183 keys each, zero gaps, English fallback), persisted via localStorage across routes and refreshes.
- Centralized theme tokens: Dark (brand default), Light, System with persistence; locked dark-green identity preserved as the dark theme.
- One-tap order (3-step wizard with review/confirm), Voice order (MediaRecorder, 60s cap, replay/delete/re-record, permission-denied guidance), Image order (camera/gallery, canvas compression, max 3, preview/remove).
- Unified backend `POST /api/govo-flow/requests` (`govo_flow_api_v16.js`): JSON or multipart; every source (`standard_form`, `one_tap`, `voice`, `image`, `shop`, `service`) enters the same `govo_orders` pipeline at `phone_confirming`. MIME/size validation, orphaned-upload cleanup on failure.
- `GET /api/govo-flow/order-config` public client config (areas, categories, limits).
- Additive schema: `govo_orders.source`, `govo_orders.voice_file`, `govo_orders.image_files` (no data touched).

### Fixed

- Public homepage: injected skin no longer forces dark headings onto dark hero/contact surfaces (scoped white-heading rules + controlled overlay); hero rewritten to English-first hierarchy (badge/heading/supporting text/CTAs); all mixed Banglish copy replaced with clean English.
- Broken links: `/merchant` `/rider` `/more` `/delivery` `/track` `/doctor` `/agri` `/ai` now route to correct hosts and real app routes.
- Customer app: previously dead language/theme toggles are functional; `/service-request` 404 trap removed; menu links go to correct role hosts.

### Verified

- Isolated test lane on 127.0.0.1:18091: JSON + multipart unified requests, validation errors (400 JSON), 8MB oversize rejection, wrong-MIME rejection, upload serving, tracking with media, shops/services regression — all passed; test rows removed.
- Production HTTPS: same checks passed (SYSTEM_TEST rows cleaned); all app routes 200; merchant/rider 200; admin 401 auth gate intact.

### Backup / Rollback

- Full backup: `/home/abu/govo-backups/finalize-v16-20260718-152318` (www, nginx confs, container server.js, .env, pre-schema DB dump)
- Container rollback image: `govo_portal:pre-flow-hotfix-20260718`
- Git checkpoint before work: `5a420e4`

### Remaining limitations

- Voice transcription not enabled (optional per spec; voice works as audio attachment).
- Uploaded request media is stored on the container filesystem (same pre-existing behavior as product images); move to a volume or object storage later.
- Merchant/rider/admin panels not yet migrated to the v16 i18n/theme system (customer app + public site done).

---

## 2026-07-18 — Shops/Services flow API JSON restored

### Diagnosis

- Customer app Shops/Services pages failed: `GET /api/govo-flow/shops` and `/api/govo-flow/services` returned Express HTML 404 instead of JSON.
- Nginx proxying and SSL certificates were verified healthy (rider/merchant/admin share one valid multi-SAN cert); the failure was inside the `govo_portal` container.
- Root cause: live container ran an older `server.js` that never registered `govo_flow_api_v15.js` (module file absent in container).

### Fixed (UI unchanged)

- Copied repo `govo_flow_api_v15.js` into `govo_portal:/app/` and registered it in the live `server.js` with the same one-line call as repo `server.js:7928`, inserted after the `/admin/onboarding` route and before the admin 404 catch-all.
- Verified first in an isolated test container on `127.0.0.1:18090` (same image, same env, real DB): registry, shops list/detail, services list/detail, JSON 404/400 error shapes all returned `application/json`; `/health`, `/merchant`, `/rider` regression-checked.
- Deployed only `govo_portal` after approval; production HTTPS endpoints verified on `app.govoexpress.com`; all role hosts re-checked healthy.

### Backup / Rollback

- File backup: `/home/abu/govo-backups/flow-api-hotfix-20260718/server.live.before-flow.js`
- Rollback image: `govo_portal:pre-flow-hotfix-20260718`
- Rollback: `docker cp /home/abu/govo-backups/flow-api-hotfix-20260718/server.live.before-flow.js govo_portal:/app/server.js && docker restart govo_portal`

### Remaining

- Service list currently uses the canonical-category fallback until approved providers exist in `govo_service_providers` (by design).
- Shop records with empty names render as "Unnamed Shop" — data-quality cleanup belongs to the merchant-data task, not this hotfix.

---

## 2026-07-16 — Docker runtime packaging repaired

### Fixed

- Added the required GOVO flow API module to repository-built application images
- Replaced the broken live rider-submission renderer with the existing GOVO success page
- Verified the repository image and surgical production hotfix in isolated test containers
- Deployed only `govo_portal` after approval and preserved the previous container for rollback

### Backup

- `/home/abu/govo-backups/docker-runtime-fix-20260716/Dockerfile`
- `/home/abu/govo-backups/docker-runtime-fix-20260716/server.live.before.js`
- Container: `govo_portal_before_rider_hotfix_20260716_101517`

---

## 2026-07-13 — Project brain initialized

### Added

- `AGENTS.md`
- `docs/GOVO_CONTEXT.md`
- `docs/PROJECT_STATE.json`
- `docs/CHANGELOG.md`

### Purpose

Created persistent project context for AI agents so GOVO work can continue without repeatedly re-explaining:

- locked UI rules
- host ownership
- role boundaries
- customer and operational flow
- safety rules
- completed work
- pending work
- backup references

---

## 2026-07-12 — Host and role mapping stabilized

### Completed

- Public, customer, merchant, rider and admin hosts isolated
- Merchant deep-route mapping added
- Rider deep-route mapping added
- Admin deep-route mapping added
- Nginx validation passed
- Only the affected GOVO application container was restarted

### Preserved

- DNS
- SSL
- Cloudflare
- MongoDB / PostgreSQL
- Kasm
- Nextcloud
- n8n
- public and customer host ownership

---

## 2026-07-12 — GOVO progress checkpoint

### Backup

- Git branch: `backup/govo-progress-20260712-224627`
- Commit: `6d24028`
- Local backup: `/home/abu/govo-backups/govo-progress-20260712-224627`

### Status

- Working tree was clean after backup
- Remote Git backup confirmed
