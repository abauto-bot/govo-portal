# GOVO UI OS v1 — Phase 5D Tracking Assigned Info

Scope:
- Improve customer tracking page with customer-safe assigned rider/worker/merchant info.
- Do not expose admin/operator controls.
- Do not expose private operator notes.
- Do not change DB schema.
- Do not edit secrets/env.
- Do not deploy live.

Customer-safe fields:
- request code
- current status
- assigned name if available
- assigned phone if customer-callable
- area/address summary
- service/need summary

Implementation:
- Add a public code-based safe API for tracking assigned info.
- Inject a small customer-safe card into the existing /track HTML response.
- Existing /track route remains intact.
