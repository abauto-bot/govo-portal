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


## 2026-10-03 — Customer Home/More 3x3 glossy update

- Larger polished carved raster glyphs and glass tiles in dark/light; nine Home shortcuts and nine popular categories in three columns. More exposes twelve services/options and the full categories list.
- Compact hero, explicit shops-search button, readable shop cards; removed fixed sample ratings/time and notification count on these pages.
- Twenty staged layouts, eight live browser views, twenty-three destination responses and two asset hash checks passed. AI/account rendering unchanged; live server/header hashes preserved.
- Durable image: govo_portal:home-3x3-glossy-20261003_2225. Source: /home/abu/govo-icon-polish-20261003/releases/home-3x3-20261004. Rollback: /home/abu/govo-home-3x3-20261004/backup-20261003T221750Z. Pending role-flow build includes the three home modules; its server/header unchanged.


### Home release follow-up — final complete-role-flow runtime

Concurrent role-flow deployment, rollback and redeployment replaced the portal during checks. Home/More patch reapplied to final govo_portal:role-flows-complete-20261003_220547 with its server/header preserved. Repeated twenty staged layouts, eight live browser views and twenty-five destination/asset checks. Durable image: govo_portal:home-3x3-roleflows-20261003_2224. Backup: /home/abu/govo-home-3x3-20261004/backup-20261003T222252Z. Pending role-flow Dockerfile now includes the three approved home modules.


## 2026-10-04 (Asia/Dhaka) — Transparent customer header and original-logo motion

- User-requested Home/More CSS only: removed header background gradient/shadow and logo drop shadow; original logo floats/tilts continuously in a 4.8s loop. Reduced-motion preference respected.
- Eight staged and eight live browser checks passed in mobile/desktop, dark/light; layout/links unchanged, 3x3 grids preserved, AI/account HTML unchanged, server/header and all other UI module hashes preserved.
- Backup: /home/abu/govo-header-motion-20261004/backup-20261003T223217Z. Rollback: restore its CSS to /app/govo_home_v30_css.js and restart only the portal. Durable image: govo_portal:home-transparent-motion-20261004. Future role-flow build CSS updated.


## 2026-10-04 (Asia/Dhaka) — Shared glossy pattern across GOVO pages

- Customer legacy/V20 and role shells now share transparent headers, original-logo motion, glossy green/cyan icons, dark/light surfaces and form/navigation styling. Approved Home/More markup preserved. Public stylesheet updated without changing its HTML/JS/actions.
- Missing customer features remain HTTP 404 with an honest branded unavailable page; business/auth/DB/payment methods preserved.
- Verified 118 staged app/role views + 6 public views; 116 final live app/role views + 6 public views, theme/menu interactions and five read-only API regressions. Production admin authentication wall remains 401; authenticated workflows not submitted.
- Backup: /home/abu/govo-all-pages-20261004/backup-20261003T233552Z. Rollback: python3 /home/abu/govo-all-pages-20261004/backup-20261003T233552Z/rollback.py. Durable image: govo_portal:all-pages-v32-20261004. Source commit: e5bd0e0. Future role-flow build context updated.


## 2026-10-04 (Asia/Dhaka) — Shops first, larger marketplace photos

- /shops now places approved shops immediately after a compact search and tab/filter toolbar. Advanced filters start collapsed; existing fields and destinations preserved. Stats moved after listings.
- Larger responsive photo cards: 180px mobile covers; 190-210px desktop/tablet, with honest missing-photo placeholders. Other browse renderers unchanged.
- Verified 14 staged and 8 live layouts in dark/light, 320-1280px; filters expand/apply correctly and View Shop navigation works. Only govo_v20_shops.js changed; server, Home/More, shared role UI and API hashes unchanged.
- Backup: /home/abu/govo-shops-first-20261004/backup-20261004T000725Z. Rollback: python3 /home/abu/govo-shops-first-20261004/backup-20261004T000725Z/rollback.py. Image: govo_portal:shops-first-20261004. Source commit: b122da2. Future role-flow build context updated.


## 2026-10-04 (Asia/Dhaka) — Merchant, rider and admin OS workspaces

- Shared role-only presentation: desktop sidebar, mobile drawer/dock, nine large glossy shortcuts, accessible navigation, matching dark/light cards, forms and scrollable tables. Prioritized merchant/rider orders and admin alerts. Custom admin dispatch, preview and report shells included.
- Preserved role auth, POST field/action contracts, DB/payment/notification logic and all protected customer/Home/More/shops modules. Rebased over the concurrent final role-flow cleanup before deployment.
- Verified 96 synthetic authenticated layouts, 16 selected-status layouts, 45 staged role/gate checks, 44 live role/gate checks, 10 final smoke checks and eight customer regression views. No production form submissions/messages; protected admin visual checks used synthetic fixtures.
- Files: govo_role_os_v34.js and server UI wrapper patch. Backup: /home/abu/govo-role-os-20261004/backup-20261004T003328Z. Rollback: python3 /home/abu/govo-role-os-20261004/backup-20261004T003328Z/rollback.py. Durable image: govo_portal:role-os-v34-20261004. Source commit: 41a609c. Future build context updated.


## 2026-10-06 — Public homepage role/header fix deployed

- Compact Customer/Merchant/Rider links with consistent SVG glyphs; contained original logo and 44px header controls. Existing destinations and theme/menu JavaScript preserved.
- Sixteen staged browser size/theme cases passed; original logo loaded, menu/theme interactions passed. Public HTML/CSS patch and deployment script checkpointed under public/releases/home-ui-20261006.
- User ran the prepared administrator command. Deployment verified: 8 live browser size/theme views, menu/theme interactions, both public domains, the CSS asset and all three role destinations passed. Backup: /home/abu/govo-home-ui-fix-20261006/backup-20261006T025738Z. Rollback: restore its index.html over /var/www/govo-main/index.html. No backend, database, nginx configuration or container change. Header contrast is protected over scrolled content in both themes.

## 2026-10-06 — Customer mobile accessibility deployed

- Rebased the initial GitHub candidate onto the actual October live module; preserved the approved 3x3 Home/More design and existing search submit button.
- Added active-page navigation semantics, search input types/keyboard hints, 16px inputs, 44px touch targets, keyboard focus, safe-area spacing and reduced-motion support. Only govo_v20_pages.js changed in runtime.
- Forty isolated browser cases, sixteen HTTPS mobile/theme views and four public/role HTTP gates passed. Docker image build/render passed; server/header/theme hashes unchanged. No business backend, database, nginx or payment edits.
- Initial verification used the documented legacy 8090 port and automatically restored the UI; confirmed actual live upstream 3000, redeployed and verified successfully.
- Backup: /home/abu/govo-mobile-ux-20261006/backup. Rollback: python3 /home/abu/govo-mobile-ux-20261006/rollback.py. Durable image: govo_portal:mobile-ux-deployed-20261006. Future build source updated.

## 2026-10-06 — Public header logo crop fix staged

- Confirmed lower symbol curve was clipped inside the raster source rather than by header CSS. Restored complete existing original artwork in the SVG wrapper.
- Eight staged size/theme browser checks and visual inspection passed; header layout retained.
- Logo asset, CSS pointer and stylesheet cache version prepared. Deploy blocked by public-file ownership and unavailable passwordless sudo. Command: sudo python3 /home/abu/govo-logo-crop-20261006/deploy.py. Backup: /home/abu/govo-logo-crop-20261006/backup.

### Public logo deployment verified

User ran the prepared sudo deploy command. Both public domains serve the new stylesheet version; the complete original SVG matches the staged asset. Eight live size/theme header checks passed. Backup retained at /home/abu/govo-logo-crop-20261006/backup.


## 2026-10-07 — Bengali public homepage prepared

- Existing UI and repaired complete logo retained. Bengali navigation, hero, services, mission/vision, request steps, local benefits, merchant/rider promotion, area aspirations and footer. No fabricated discounts, ratings, time or income guarantees. Service icons use canonical keys; translated theme label and accessible menu close behavior. Bengali network SVG labels.
- Ten staged browser cases passed at 320–1280px, dark/light: text, layout, images, seven icons, complete logo, search, menu and theme. JS/Python syntax checked; mobile visual reviewed.
- Awaiting administrator deployment: sudo python3 /home/abu/govo-home-bn-20261006/deploy.py. Hash guards and atomic index install; no backend/container/nginx/database changes.
- Backup: /home/abu/govo-home-bn-20261006/backup. Rollback: sudo python3 /home/abu/govo-home-bn-20261006/rollback.py. Local source checkpoint saved. GitHub commit/push blocked by automatic approval review pending explicit repository export authorization.

### Bengali homepage deployed and verified

User ran the administrator command; installed 2026-10-06T23:40:53Z. Ten live dark/light browser cases passed at 320–1280px. Both public domains and all four release files matched expected hashes (8 HTTPS checks). Previous index retained for rollback; complete referenced public-asset snapshot saved at /home/abu/govo-home-bn-20261006/public-homepage-deployed-20261007.tar.gz. User explicitly authorized GitHub backup.


## 2026-10-07 — GOVO all-in-one Android APK

- Reused prior role-client source and existing protected signing configuration to build one package com.govo.express v1.1.0 (Android 8+, target 35). Persistent customer/merchant/rider selector, existing role-specific HTTPS UI and cookies/auth retained; runtime permissions restricted to active trusted origin. No database/backend changes.
- Signed APK published to /assets/GOVO-Express-All-in-One-1.1.0.apk; both public domains returned exact expected hash. V2/V3 signature, package metadata, alignment and compiled role/switching code verified. 27 JVM navigation/security cases, 10 staged header/download layouts, 3 role browser pages and 10 read-only endpoints passed.
- Physical device/emulator install and authenticated transaction workflows remain unverified; no market-ready/no-bug guarantee.
- Homepage download links staged and hash guarded; public index requires administrator command: sudo python3 /home/abu/govo-all-in-one-20261007/deploy.py. Existing standalone role APKs retained. Source/APK/rollback index backed up under android/all-in-one-20261007. Signing keys/passwords remain outside Git.

- Guarded homepage rollback script retained: sudo python3 /home/abu/govo-all-in-one-20261007/rollback.py. Published APK retained on rollback so existing download links continue working.


## 2026-10-07 — All-in-one APK v1.1.1 UI repair

- Removed duplicate native brand toolbar. Role selector now joins the existing page header area and opens a GOVO dark/emerald rounded dialog with a bundled Noto Sans Bengali font; offline switching retained. Same package/signing certificate, incremented version code.
- Found rider entry page had login form but failed title-only auth detection, exposing workspace shortcuts and dashboard dock. Recognize role login form actions; omit workspace/dock for authentication pages. Authenticated dashboard navigation and form contracts preserved.
- Deployed only role presentation module; protected server/customer/header/shop hashes unchanged. Future build source updated. 24 staged + 24 live mobile/theme cases, auth/dashboard contracts, 27 JVM URL-policy cases, font/selector APK contents and same signer verified. Published v1.1.1 APK hash checked on both public domains. Native dialog appearance still requires physical-device verification.
- Backup/source checkpoint: android/ui-fix-1.1.1-20261007; local /home/abu/govo-apk-ui-fix-20261007/backup. Role rollback: python3 /home/abu/govo-apk-ui-fix-20261007/rollback-role.py. Homepage latest APK link staged; activate with sudo python3 /home/abu/govo-apk-ui-fix-20261007/deploy-home.py.


## 2026-10-07 — Shared backend ownership and Admin APK

Deployed session-bound legacy merchant actions, merchant-ID order matching, rider transition guards and merchant order audit events. Passed 42 isolated database-backed integration assertions, including atomic protection against existing Merchant/Rider password overwrite. Built/published signed GOVO Admin 1.0.0, preserving private HTTP Basic access and PIN login; native HTTP authentication prompts collect credentials only at runtime. Live/future-build source backups retained. Physical Android testing and production payment/SMS delivery remain unverified.
