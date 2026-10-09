# GOVO backend source authority — 2026-10-09

## Production authority
Current production API traffic is served by the GOVO portal runtime and its PostgreSQL-backed `/api/*` routes. The governed source is pinned on branch `gov/production-source-of-truth-20261009` with tag `prod-source-20261009`.

## Legacy repository status
`govo-web/govo-api` is not the active production backend. The authenticated `abauto-bot` identity has read-only access there and push attempts return HTTP 403. That repository must not be treated as the production source of truth until ownership/access and a deliberate migration are completed.

## Runtime mapping
- Customer/merchant/rider production runtime: `govo_portal_v20_live`
- Current application listener: `127.0.0.1:3000`
- API gateway hostname: `api.govoexpress.com`
- Production database-backed API examples: `/api/govo-flow/order-config`, `/api/govo-flow/shops`, `/api/govo-flow/services`

## Rule
Future production backend changes must originate from the governed production branch/tag (or a reviewed successor branch) and be verified against the runtime manifest before deploy. Do not deploy from the legacy builder API repository by assumption.
