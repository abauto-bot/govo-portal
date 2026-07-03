# GOVO UI OS v1 — Phase 5C Merchant Actions

Scope:
- Add merchant action buttons only inside protected admin merchant preview.
- Route: /admin/merchant-jobs-preview
- Action endpoint: /admin/merchant-jobs-preview/action
- Do not touch public /merchant.
- Do not expose controls publicly.
- Do not change DB schema.
- Reuse existing dispatch/status update logic.

Action mapping:
- Accept -> Confirmed
- Prepare -> Working
- Ready -> Completed
- Completed -> Completed
- Cancelled -> Cancelled

Safety:
- Admin protected.
- No assignment writes.
- No secrets/env edits.
- No live deploy.
