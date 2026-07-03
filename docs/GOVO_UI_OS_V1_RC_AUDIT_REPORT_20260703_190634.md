# GOVO UI OS v1 RC Audit Report

- Generated: 2026-07-03T19:06:34+00:00
- Git branch: govo-ui-os-v1-20260702_195253
- Git commit: 72353cb
- Test port: 8108
- Image tag: govo_portal:ui-os-v1-rc-20260703_190634
- Backup: /home/abu/govo-backups/ui-os-v1-rc-20260703_190634

## Syntax Check
```
```

## Route Status
```
/                                          200
/app                                       200
/service-request                           200
/track?code=SRV-MOCK-123456                200
/support                                   200
/shops                                     200
/services                                  200
/merchant                                  200
/rider                                     200
/admin/login                               200
/admin/dispatch                            302
/admin/merchant-jobs-preview               302
/admin/rider-jobs-preview                  302
/admin/notify-templates                    302
/admin/ops-daily-report                    302
/admin/ops-summary-draft                   302
/admin/launch-checklist                    302
/api/admin/launch-checklist                302
```

## Authenticated Admin Route Status
```
/admin/dispatch                            302
/admin/merchant-jobs-preview               302
/admin/rider-jobs-preview                  302
/admin/notify-templates                    302
/admin/ops-daily-report                    302
/admin/ops-summary-draft                   302
/admin/launch-checklist                    302
/api/admin/launch-checklist                302
```

## E2E Test
```
REQ_CODE=
```

## Filename-only Secret Scan

Only filenames are shown below. Secret values are not printed.

```
./server.js.current-working-2026-06-17-230348
./server.js.current-working-2026-06-17-221437
./GOVO_AI_HANDOFF.md
./.env
./scripts/govo-ui-os-v1-rc-audit.sh
./.env.example
./docs/GOVO_UI_OS_V1_PHASE3B_STATUS_TRACKING.md
./server.js
```

## Live Deploy Blockers

- Telegram bot token rotation pending.
- SMS API key rotation pending.
- Admin PIN/session secret rotation pending.
- Real DB mode smoke test pending.
- Mobile visual QA pending.
- Production backup/promotion plan pending.

## Audit Artifacts

- Backup: /home/abu/govo-backups/ui-os-v1-rc-20260703_190634
- Report: docs/GOVO_UI_OS_V1_RC_AUDIT_REPORT_20260703_190634.md
- Test container: govo_portal_ui_os_rc_8108
- Test image: govo_portal:ui-os-v1-rc-20260703_190634

