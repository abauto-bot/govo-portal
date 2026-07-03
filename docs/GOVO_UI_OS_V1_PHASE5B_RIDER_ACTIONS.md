# GOVO UI OS v1 — Phase 5B Rider Actions

Scope:
- Add rider/worker action buttons only inside protected admin rider preview.
- Route: /admin/rider-jobs-preview
- Action endpoint: /admin/rider-jobs-preview/action
- Do not touch public /rider.
- Do not expose controls publicly.
- Do not change DB schema.
- Reuse existing dispatch/status update logic.

Action mapping:
- Accept -> Assigned
- Reject -> Cancelled
- Start -> On the way
- Reached -> Working
- Working -> Working
- Completed -> Completed

Safety:
- Admin protected.
- No assignment writes.
- No secrets/env edits.
- No live deploy.
