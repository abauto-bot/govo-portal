## Phase 4B Implementation Plan — Status Actions in `/admin/dispatch`

### 1. Existing status endpoint/function found

Use the existing Phase 3B status update path/function only.

Before editing, confirm with:

```bash
grep -R "status" -n app pages routes src server | grep -i "service"
grep -R "update.*status\|status.*update" -n app pages routes src server
grep -R "service-requests" -n app pages routes src server
```

Expected existing Phase 3B logic should already do something equivalent to:

```ts
updateServiceRequestStatus(requestId, status)
```

or an existing route/action such as:

```txt
POST /admin/service-requests/:id/status
POST /admin/service-requests/[id]/status
```

Phase 4B should reuse that existing handler.  
No new persistence function, no new table logic, and no schema change.

If the existing endpoint currently redirects only to `/admin/service-requests`, make the smallest safe adjustment to allow an admin-only return path of `/admin/dispatch`.

Allowed redirect handling:

```ts
const returnTo = req.body.returnTo === "/admin/dispatch"
  ? "/admin/dispatch"
  : "/admin/service-requests";
```

Do not allow arbitrary redirect URLs.

---

### 2. Exact files changed

Keep the PR small. The expected changed files should be limited to:

#### Required

```txt
/admin/dispatch page/view file
```

Examples depending on repo structure:

```txt
app/admin/dispatch/page.tsx
```

or

```txt
pages/admin/dispatch.tsx
```

or

```txt
views/admin/dispatch.ejs
```

or

```txt
src/routes/admin/dispatch.*
```

Change: add status update buttons/forms inside each existing request card.

#### Only if needed

```txt
existing Phase 3B service request status endpoint/action file
```

Examples:

```txt
app/admin/service-requests/[id]/status/route.ts
```

or

```txt
src/routes/admin/serviceRequests.ts
```

or

```txt
server/routes/admin/service-requests.js
```

Change: support a safe `returnTo` value so successful status updates can redirect back to `/admin/dispatch`.

#### Do not change

```txt
.env
.env.local
.env.production
secrets files
admin PIN/config files
database migrations
schema files
public customer UI files
/admin/service-requests replacement code
```

---

## Dispatch Card UI Change

Inside each `/admin/dispatch` request card, add compact admin-only status controls.

Statuses to include exactly:

```txt
Phone Confirming
Confirmed
Assigned
On the way
Working
Completed
Paid
Feedback
Cancelled
```

Recommended form pattern:

```html
<form method="POST" action="/admin/service-requests/{{request.id}}/status">
  <input type="hidden" name="status" value="Phone Confirming" />
  <input type="hidden" name="returnTo" value="/admin/dispatch" />
  <button type="submit">Phone Confirming</button>
</form>
```

Repeat for each status.

If the existing endpoint expects a different field name, reuse the existing name. For example:

```html
<input type="hidden" name="nextStatus" value="Confirmed" />
```

or

```html
<input type="hidden" name="newStatus" value="Confirmed" />
```

Do not create a new API shape if Phase 3B already has one.

---

## Safer JSX/React-style Example

If `/admin/dispatch` is React/Next-based:

```tsx
const dispatchStatuses = [
  "Phone Confirming",
  "Confirmed",
  "Assigned",
  "On the way",
  "Working",
  "Completed",
  "Paid",
  "Feedback",
  "Cancelled",
];

function DispatchStatusActions({ requestId }: { requestId: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {dispatchStatuses.map((status) => (
        <form
          key={status}
          method="POST"
          action={`/admin/service-requests/${requestId}/status`}
        >
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="returnTo" value="/admin/dispatch" />
          <button
            type="submit"
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
          >
            {status}
          </button>
        </form>
      ))}
    </div>
  );
}
```

Then inside the existing dispatch request card:

```tsx
<DispatchStatusActions requestId={request.id} />
```

Make sure this is only rendered on `/admin/dispatch`, which is already protected by existing admin auth.

---

## Safe Redirect Adjustment

If the existing Phase 3B status endpoint currently does:

```ts
redirect("/admin/service-requests");
```

change only to:

```ts
const safeReturnTo =
  formData.get("returnTo") === "/admin/dispatch"
    ? "/admin/dispatch"
    : "/admin/service-requests";

redirect(safeReturnTo);
```

Or Express-style:

```js
const safeReturnTo =
  req.body.returnTo === "/admin/dispatch"
    ? "/admin/dispatch"
    : "/admin/service-requests";

return res.redirect(safeReturnTo);
```

This keeps `/admin/service-requests` intact and allows dispatch to return to itself.

Do not use:

```js
res.redirect(req.body.returnTo)
```

because that creates an open redirect risk.

---

## Memory Store Requirement

In `GOVO_SKIP_DB=1` mode, do not add new logic unless required.

The existing Phase 3B status update function should already branch between:

```txt
memory store mode
real DB mode
```

Phase 4B should call the same function/endpoint so both modes continue working.

Do not introduce a second memory update path inside `/admin/dispatch`.

Correct approach:

```txt
/admin/dispatch form
  -> existing Phase 3B status endpoint
    -> existing status update function
      -> existing memory store if GOVO_SKIP_DB=1
      -> existing DB status update logic otherwise
```

---

# Test instructions on 8098

Run locally only. Do not deploy.

## 1. Start with memory mode

```bash
GOVO_SKIP_DB=1 PORT=8098 npm run dev
```

or, if the repo uses another command:

```bash
GOVO_SKIP_DB=1 PORT=8098 npm start
```

Open:

```txt
http://localhost:8098/admin/dispatch
```

Verify:

- Admin auth still protects the page.
- Unauthenticated users cannot access dispatch controls.
- Request cards render as before.
- Each request card now shows buttons:
  - Phone Confirming
  - Confirmed
  - Assigned
  - On the way
  - Working
  - Completed
  - Paid
  - Feedback
  - Cancelled

Submit each status on a test request.

Expected:

```txt
POST succeeds
status changes in existing memory store
browser redirects back to /admin/dispatch
updated status appears on dispatch card
```

## 2. Confirm public UI is unaffected

Open public/customer pages on:

```txt
http://localhost:8098/
```

Verify:

- No dispatch controls are visible.
- No admin status buttons are exposed.
- Public request flow still works.

## 3. Confirm `/admin/service-requests` is not replaced

Open:

```txt
http://localhost:8098/admin/service-requests
```

Verify:

- Page still exists.
- Existing Phase 3B status update controls still work.
- Any status update from this page still redirects to `/admin/service-requests`.

## 4. Test real DB mode locally/staging only

Do not change schema.

Run without `GOVO_SKIP_DB=1` using existing local DB config only:

```bash
PORT=8098 npm run dev
```

Open:

```txt
http://localhost:8098/admin/dispatch
```

Update a test request status.

Expected:

```txt
existing DB status update logic is used
no new columns are required
no migration runs
redirect returns to /admin/dispatch
```

## 5. Regression checks

Run:

```bash
npm run lint
npm test
```

If available:

```bash
npm run typecheck
npm run build
```

---

# Risks

## 1. Existing endpoint may not support dispatch redirect

Risk: Phase 3B endpoint may always redirect to `/admin/service-requests`.

Mitigation: Add only a safe allowlisted `returnTo` option accepting `/admin/dispatch`. Fall back to `/admin/service-requests`.

## 2. Status value mismatch

Risk: Existing DB/status logic may expect normalized enum values instead of display labels.

Mitigation: Reuse the existing Phase 3B accepted values. If normalization is already used, map labels to existing values without changing schema.

Example:

```ts
const statuses = [
  "Phone Confirming",
  "Confirmed",
  "Assigned",
  "On the way",
  "Working",
  "Completed",
  "Paid",
  "Feedback",
  "Cancelled",
];
```

Do not add DB enum migration in this phase.

## 3. Open redirect vulnerability

Risk: Accepting arbitrary `returnTo` can redirect admins to unsafe external URLs.

Mitigation: Only allow:

```txt
/admin/dispatch
/admin/service-requests
```

Default to `/admin/service-requests`.

## 4. Duplicate update logic

Risk: Adding a new dispatch-only status update route could diverge from Phase 3B memory/DB behavior.

Mitigation: Dispatch forms must post to the existing Phase 3B endpoint/action.

## 5. Public exposure

Risk: Status buttons could accidentally appear in public request cards.

Mitigation: Only edit `/admin/dispatch` admin view. Do not touch public UI components unless they are admin-only shared components.

## 6. Assignment data leakage

Risk: This phase might accidentally add assignment name/phone fields.

Mitigation: Do not add assignment inputs, assignment display fields, or writes. This phase is status-only.

## 7. Schema drift

Risk: Adding statuses may tempt a DB enum/schema migration.

Mitigation: No migrations, no new columns. Use existing status storage/table logic only.
