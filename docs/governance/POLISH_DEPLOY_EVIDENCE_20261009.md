# GOVO polish deployment evidence — 2026-10-09

## Release
- Source commit: `b622872`
- Runtime: `govo_portal_v20_live`
- API gateway upstream: `127.0.0.1:3000`
- Pre-deploy backup: `/home/abu/govo-readiness-20261009/polish-deploy-20261009-142344`

## Live source hashes
- `server.js`: `8136dfac85ef61ee4ac0368f9516898ff4eb46feae124b129d0962104ea07850`
- `govo_flow_api_v17.js`: `6ba0639422b8cc821cf3c8204b7d1b33bee6b8f2813dd9f9a5d67a983d07de7e`
- approved Home/More module remained `8eeb4cc06bf488618f012d1443d210e8ae622e6c16f76320fbac82249aa153e0`
- approved Home CSS remained `544f6f05e7d74365944c47838e9ffa66af447991f3d7e7e8fe64fb93ab236715`

## Production smoke
- main: 200 / TLS valid
- app: 200 / TLS valid
- track: 200
- join-status: 200
- merchant registration/login pages: 200
- rider registration/login pages: 200
- API health/config/shops/services: 200 JSON
- malformed merchant phone POST: 400, no DB write
- malformed rider phone POST: 400, no DB write
- rider profile update without session: 403, no DB write
- approved theme Green `#39E75F`, Cyan `#19CFF0`, 3x3 grid: present
- GOVO and payment PostgreSQL: accepting connections
- health monitor: PASS

## Monitoring
The 10-minute monitor now checks public routes, tracking/join-status, API health/config/not-found behavior, theme markers, PostgreSQL health, and exact live backend source hashes.

## Rollback point
If rollback is required, restore the two `.before` files from the pre-deploy backup to `/app/server.js` and `/app/govo_flow_api_v17.js` inside `govo_portal_v20_live`, then restart only that container and rerun health monitoring. No rollback was executed because production smoke passed.

Android real-device validation remains intentionally deferred by user instruction; it is not marked PASS.
