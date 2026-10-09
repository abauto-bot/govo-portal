# GOVO flow integration audit — 2026-10-09

Production data was not modified. Tests ran against a temporary PostgreSQL 15 clone restored from the verified logical backup.

## Route smoke
Customer routes `/app`, `/shops`, `/services`, `/order`, `/track`, `/support`, `/account`, `/more`, `/ai`, `/ride`, `/doctor`, `/agri`: HTTP 200.
Merchant routes `/merchant`, `/merchant/login`, `/merchant/account/create`, `/merchant/dashboard`, `/merchant/products`, `/merchant/support`: HTTP 200.
Rider routes `/rider`, `/rider/register`, `/rider/login`, `/rider/account/create`, `/rider/dashboard`, `/rider/jobs`, `/rider/active`, `/rider/history`, `/rider/support`: HTTP 200.

## API contract
- `/api/govo-flow/order-config`: 200 JSON
- `/api/govo-flow/shops`: 200 JSON, PostgreSQL-backed
- `/api/govo-flow/services`: 200 JSON
- `/api/requests` without code: 400 JSON
- `/api/track/safe-assigned-info` without code: 400 JSON

## Cloned-DB write flow
- Built-in transaction rollback system test: PASS
- Lifecycle exercised: phone_confirming -> confirmed -> assigned -> on_the_way -> working -> completed -> paid -> feedback
- Invalid direct jump to paid: correctly rejected
- Notifications: not sent
- Transaction: rolled back
- Customer unified request create: PASS
- Customer order lookup by phone: PASS
- Service request create: PASS

## Data-quality finding
One restored approved rider row contains a malformed phone value. This does not invalidate the flow test, but rider phone validation/data cleanup should be included in the next polish pass.
