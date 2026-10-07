# GOVO backend and Admin Android release — 2026-10-07

The existing shared backend now binds legacy merchant actions to the approved signed-in account. Orders are matched by merchant ID, with a nonempty phone fallback only for legacy records without IDs; shop names cannot grant access. Both rider update endpoints enforce assigned/ready → picked_up → on_the_way → delivered. Invalid values and stale or unauthorized actions are refused. Merchant status updates are written to the shared order-event history. Existing visual design and production notification integrations are preserved.

Live source checkpoint: server.js. Changes were applied to the active portal container and the future-build server source after guarded SHA-256 checks, syntax validation and backups. Production database schema/data was not migrated. Original and future-build source backups are retained on the VPS under /home/abu/govo-backend-admin-20261007/backup.

Validation: 38 assertions passed against a disposable isolated Postgres database running the active application source, with inherited production environment cleared and external network unavailable. The test fixtures exercise customer creation, merchant visibility and processing, admin dispatch, rider ownership and transitions, customer tracking, audit history, legacy endpoints and nine authenticated Admin pages. Test scripts explicitly target the disposable govo-backend-qa-db-20261007 container and must never be retargeted to production. No real SMS, payments or customer records were used.

Admin APK: ../../android/admin-1.0.0-20261007 (source/resources/build). Package com.govo.express.admin, version 1.0.0, Android 8+. Opens https://add.govoexpress.com/admin/os with the existing private HTTP Basic access and Admin PIN session gates. Credentials are requested at runtime, not bundled, logged, or persisted by the app. HTTP credentials are sent only to the trusted HTTPS Admin host; SSL errors are cancelled. APK signature, packaging and alignment were checked. Device-level installation, native login and physical hardware flows remain unverified because no Android device/emulator was connected.

Download: https://govoexpress.com/assets/GOVO-Admin-1.0.0.apk
SHA-256: bbd2c8ace4faec2170e53f3412e41d7bc1d29dcbc84d96423ce333303d0d04eb

Customer/merchant/rider all-in-one client remains version 1.1.1; this backend fix takes effect for those HTTPS clients without a new client release. Full market-readiness, payment/SMS production delivery and every business flow are not certified by these tests.
