# GOVO AI Handoff

Project: GOVO Express / Meherpur Super App
Path: /opt/govo-portal
Live container: govo_portal
Test container: govo_portal_test
Live port: 127.0.0.1:8090 -> 3000
Test port: 127.0.0.1:8091 -> 3000
Env file: /opt/govo-portal/.env.clean
Uploads volume: /opt/govo-portal/uploads:/app/uploads

Domains:
- https://govoexpress.com
- https://merchant.govoexpress.com
- https://rider.govoexpress.com
- https://admin.govoexpress.com
- https://portal.govoexpress.com

Workflow:
1. Codex only edits code.
2. Codex must not deploy, restart docker, touch nginx, or delete data.
3. Normal terminal runs test container on 8091.
4. If test passes, live deploy to 8090.
5. Backup with govo backup after every live deploy.
6. Never expose ADMIN_PIN in screenshots.
7. Admin uses /admin login cookie security.

Current completed modules:
- GOVO clean phase1
- Product/Menu Manager v2
- Product Image Upload v1
- Super App Category Hub v1
- Service Provider System v1
- Admin OS v3
- Trust & Verified Badge System v1
- Profile Image Upload + Trust Control Polish v1
- Customer App UX v2
- Main Domain Customer Entry v1
- Tracking UX v2
- Order Flow UX v2
- Service Request UX v2
- Rider Dispatch UX v2
- Admin Security Lock v1
- Operations Control Batch v3 in progress/live depending latest deploy

Senior rule:
Build only features that improve real usage:
customer order/request -> merchant/provider action -> admin control -> rider dispatch -> customer tracking.
