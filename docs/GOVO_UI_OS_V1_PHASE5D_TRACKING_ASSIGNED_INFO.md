# GOVO UI OS v1 — Phase 5D Tracking Assigned Info

Scope:
- Improve customer tracking page to show safe assigned rider/merchant/worker info.
- Do not expose admin/operator controls.
- Do not expose private internal notes.
- Do not change DB schema.
- Do not edit secrets/env.
- Do not deploy live.

Customer-safe tracking info:
- current status
- assigned name if available
- assigned phone only if intended as customer-callable
- area/address summary
- tracking timeline
- support link

Safety:
- no admin action buttons on tracking
- no hidden operator note unless sanitized/customer-safe
- no request list exposure
