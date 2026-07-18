# GOVO Express — Change Log

This log records meaningful project changes made by ABU AI or other coding agents.

Do not include secrets, tokens, passwords or private customer data.

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
