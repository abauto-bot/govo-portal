# GOVO flow polish release — 2026-10-09

Scope: tracking consistency, merchant/rider validation, onboarding status UX, rider profile session hardening, dashboard tracking-link consistency.

## Changes
- Canonical customer tracking URL is `/track?code=<code>` across API responses and dashboard links.
- Merchant and rider registration normalize Bangladesh mobile numbers and reject malformed values.
- Merchant/rider duplicate applications are rejected with HTTP 409 and existing application status/code when available.
- NID input accepts only 10, 13 or 17 digits when supplied.
- Direct merchant/rider registration creates an application code and status page.
- Public `/join-status` shows under-review/approved/rejected state and role-correct account links.
- API join rows remain DB `pending` so existing admin pending queues continue to include them; public response remains submitted/under_review.
- Rider profile update is bound to the authenticated rider session rather than a posted phone value.
- Merchant/rider profile WhatsApp validation blocks malformed Bangladesh numbers.

## Validation
Tests ran against a temporary PostgreSQL clone restored from the verified production logical backup. Production data was not modified.

- Node syntax checks: PASS
- Unified request create: PASS
- Tracking URL canonicalization: PASS
- Tracking page renders created code: PASS
- Invalid merchant/rider NID: blocked with HTTP 400
- Rider profile update without session: blocked with HTTP 403
- Merchant duplicate API join: HTTP 409
- Rider duplicate API join: HTTP 409
- Merchant/rider application DB status: pending (admin-queue compatible)
- Public join status under_review/approved rendering: PASS
- Absolute merchant/rider account links: PASS
- Transactional lifecycle rollback test: PASS
- Invalid lifecycle jump rejected: PASS
- Test transaction rolled back; notifications not sent

Account password/login credential exercise was not run by the remote command harness because credential-like form bodies were blocked by tool safety controls. Existing authentication implementation was not removed or bypassed.
