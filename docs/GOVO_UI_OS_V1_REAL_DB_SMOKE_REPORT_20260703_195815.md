# GOVO UI OS v1 Real DB Smoke Report

- Generated: 2026-07-03T19:58:23+00:00
- Git branch: govo-ui-os-v1-20260702_195253
- Git commit: d2dc539
- Test port: 8112
- Image tag: govo_portal:ui-os-v1-real-db-smoke-20260703_195815
- Env file: /home/abu/govo-secure/env/govo_portal_live_env_20260703_195815.env
- Notification/API keys stripped from temporary env.

## Syntax Check
```
```

## Container Status
```
NAMES                            STATUS                     PORTS
govo_portal_real_db_smoke_8112   Exited (1) 6 seconds ago   
```

## Container Logs Tail
```

> govo-portal@1.0.0 start
> node server.js

✅ GOVO Local Premium Trust OS Phase 1 UI foundation mounted
Startup failed: Error: getaddrinfo ENOTFOUND govo_postgres
    at /app/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async ensureSchema (/app/server.js:1470:1) {
  errno: -3008,
  code: 'ENOTFOUND',
  syscall: 'getaddrinfo',
  hostname: 'govo_postgres'
}
npm notice
npm notice New major version of npm available! 10.8.2 -> 11.18.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.18.0
npm notice To update run: npm install -g npm@11.18.0
npm notice
```

## Route Status
```
/                                          000
/app                                       000
/service-request                           000
/track?code=SMOKE-NOT-FOUND                000
/support                                   000
/shops                                     000
/services                                  000
/merchant                                  000
/rider                                     000
/admin/login                               000
/admin/dispatch                            000
/admin/merchant-jobs-preview               000
/admin/rider-jobs-preview                  000
/admin/notify-templates                    000
/admin/ops-daily-report                    000
/admin/ops-summary-draft                   000
/admin/launch-checklist                    000
```

