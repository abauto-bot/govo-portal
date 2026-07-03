## Phase 4B Implementation Plan — GOVO `/admin/dispatch` Status Actions

Scope is limited to adding admin-only status update controls to the existing protected `/admin/dispatch` request cards, reusing the Phase 3B status update path and existing memory/DB logic.

No DB schema changes. No assignment name/phone writes. No public UI changes. No deploy.

---

## 1. Existing status endpoint/function found

Use repo search before editing:

```bash
grep -R "status" -n app pages src lib server | grep -i "service-request\|request" | head -50
grep -R "GOVO_SKIP_DB" -n app pages src lib server
grep -R "redirect" -n app pages src lib server | grep "service-requests"
```

Expected Phase 3B target should be one of these patterns:

### Likely App Router server action

Example:

```ts
updateServiceRequestStatus(...)
```

Usually located in one of:

```txt
app/admin/service-requests/actions.ts
app/admin/service-requests/_actions.ts
src/app/admin/service-requests/actions.ts
lib/serviceRequests.ts
lib/service-requests.ts
```

### Or existing POST route

Example:

```txt
app/api/admin/service-requests/[id]/status/route.ts
app/api/service-requests/[id]/status/route.ts
pages/api/admin/service-requests/[id]/status.ts
```

### Requirement for Phase 4B

Reuse the existing Phase 3B status update flow exactly.

The only acceptable addition to that existing flow is a safe redirect target back to:

```txt
/admin/dispatch
```

If the Phase 3B status endpoint/action currently redirects only to `/admin/service-requests`, update it to accept a constrained `redirectTo` value and allow only known internal admin pages:

```ts
const allowedRedirects = new Set([
  "/admin/service-requests",
  "/admin/dispatch",
]);

const redirectTo =
  typeof formData.get("redirectTo") === "string" &&
  allowedRedirects.has(String(formData.get("redirectTo")))
    ? String(formData.get("redirectTo"))
    : "/admin/service-requests";
```

Then:

```ts
redirect(redirectTo);
```

Do not accept arbitrary URLs.

---

## 2. Exact files changed

Expected minimal file changes:

```txt
app/admin/dispatch/page.tsx
```

And only if the existing Phase 3B status action has a hardcoded redirect:

```txt
app/admin/service-requests/actions.ts
```

or the actual existing Phase 3B route/action file discovered by grep, for example:

```txt
app/api/admin/service-requests/[id]/status/route.ts
```

No other files should be changed.

Do not change:

```txt
.env
.env.local
prisma/schema.prisma
migrations/*
package.json
/admin/service-requests replacement files
public UI files
auth config files
```

---

## Implementation details

### A. Add allowed status list inside `/admin/dispatch` card UI

In the existing request card render inside:

```txt
app/admin/dispatch/page.tsx
```

add the Phase 4B statuses:

```ts
const DISPATCH_STATUS_OPTIONS = [
  "Phone Confirming",
  "Confirmed",
  "Assigned",
  "On the way",
  "Working",
  "Completed",
  "Paid",
  "Feedback",
  "Cancelled",
] as const;
```

Place this near the top of the file or inside the page module.

---

### B. Add forms/buttons inside each dispatch request card

Inside each existing request card, add admin-only controls that post to the existing Phase 3B status action.

If the existing Phase 3B implementation uses a server action, use that same imported action:

```tsx
import { updateServiceRequestStatus } from "../service-requests/actions";
```

Then inside each card:

```tsx
<div className="mt-4 border-t pt-3">
  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
    Update status
  </div>

  <div className="flex flex-wrap gap-2">
    {DISPATCH_STATUS_OPTIONS.map((nextStatus) => (
      <form key={nextStatus} action={updateServiceRequestStatus}>
        <input type="hidden" name="id" value={request.id} />
        <input type="hidden" name="status" value={nextStatus} />
        <input type="hidden" name="redirectTo" value="/admin/dispatch" />

        <button
          type="submit"
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={request.status === nextStatus}
        >
          {nextStatus}
        </button>
      </form>
    ))}
  </div>
</div>
```

Use the project’s existing button/card classes if available.

Do not add fields for:

```txt
assignedName
assignedPhone
driverName
providerPhone
assignmentName
assignmentPhone
```

This phase is status-only.

---

### C. If the Phase 3B endpoint is an API route instead of a server action

If the existing status update endpoint is something like:

```txt
POST /api/admin/service-requests/:id/status
```

then each card should submit to that existing endpoint:

```tsx
<form
  key={nextStatus}
  method="POST"
  action={`/api/admin/service-requests/${request.id}/status`}
>
  <input type="hidden" name="status" value={nextStatus} />
  <input type="hidden" name="redirectTo" value="/admin/dispatch" />

  <button
    type="submit"
    className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
    disabled={request.status === nextStatus}
  >
    {nextStatus}
  </button>
</form>
```

The existing endpoint should then redirect to `/admin/dispatch` after success.

If it currently returns JSON only, do not create a new DB path. Add small form-post compatibility only if it still uses the same existing update function.

---

### D. Safe redirect handling in existing Phase 3B action/endpoint

If needed, add this helper inside the existing status action file:

```ts
function getSafeAdminRedirect(formData: FormData) {
  const raw = formData.get("redirectTo");

  if (raw === "/admin/dispatch") {
    return "/admin/dispatch";
  }

  if (raw === "/admin/service-requests") {
    return "/admin/service-requests";
  }

  return "/admin/service-requests";
}
```

Then after the existing status update succeeds:

```ts
redirect(getSafeAdminRedirect(formData));
```

For route handlers, use:

```ts
return NextResponse.redirect(new URL(getSafeAdminRedirect(formData), request.url));
```

Important: do not redirect to arbitrary user-provided URLs.

---

### E. Status validation

If the existing Phase 3B function already validates statuses, add these labels to that existing allowlist only if missing:

```ts
const ALLOWED_STATUSES = new Set([
  "Phone Confirming",
  "Confirmed",
  "Assigned",
  "On the way",
  "Working",
  "Completed",
  "Paid",
  "Feedback",
  "Cancelled",
]);
```

Do not introduce a new status table.

Do not add a DB migration.

If the existing DB stores statuses as strings, write the labels exactly as listed.

If the existing system stores normalized status keys, map only in the existing Phase 3B function, not in `/admin/dispatch`.

Example:

```ts
const STATUS_LABEL_TO_KEY: Record<string, string> = {
  "Phone Confirming": "phone_confirming",
  Confirmed: "confirmed",
  Assigned: "assigned",
  "On the way": "on_the_way",
  Working: "working",
  Completed: "completed",
  Paid: "paid",
  Feedback: "feedback",
  Cancelled: "cancelled",
};
```

Only use this if Phase 3B already uses normalized keys.

---

## 3. Test instructions on 8098

Use a local branch:

```bash
git checkout -b phase-4b-dispatch-status-actions
```

Install/build only if needed:

```bash
npm install
npm run lint
npm run build
```

Run locally on port `8098`.

### A. Test with memory mode

```bash
GOVO_SKIP_DB=1 PORT=8098 npm run dev
```

Open:

```txt
http://localhost:8098/admin/dispatch
```

Confirm:

1. Unauthenticated user is blocked or redirected by existing admin auth.
2. Authenticated admin can see dispatch cards.
3. Each card displays status buttons:
   - Phone Confirming
   - Confirmed
   - Assigned
   - On the way
   - Working
   - Completed
   - Paid
   - Feedback
   - Cancelled
4. Click each status on a test request.
5. Browser redirects back to:

```txt
/admin/dispatch
```

6. The card shows the updated status after redirect.
7. Refresh page and confirm memory-mode behavior matches the existing Phase 3B memory store behavior.

### B. Test existing `/admin/service-requests` still works

Open:

```txt
http://localhost:8098/admin/service-requests
```

Confirm:

1. Existing page still loads.
2. Existing Phase 3B status updates still work.
3. Existing status update redirects still go where they previously went unless `redirectTo=/admin/dispatch` is explicitly posted.

### C. Test real DB mode locally/staging only

Do not deploy live.

Run using the existing local DB setup only:

```bash
PORT=8098 npm run dev
```

Confirm:

1. No migrations are generated.
2. No schema files are changed.
3. Status update uses existing Phase 3B DB update function/table logic.
4. Status update redirects back to:

```txt
/admin/dispatch
```

5. No assignment name/phone values are written.

### D. Check changed files

```bash
git status --short
```

Expected:

```txt
M app/admin/dispatch/page.tsx
```

And maybe one existing Phase 3B action/route file, only if redirect handling needed:

```txt
M app/admin/service-requests/actions.ts
```

or:

```txt
M app/api/admin/service-requests/[id]/status/route.ts
```

Confirm no secret/schema changes:

```bash
git diff -- . ':!*.env' ':!*.env.local'
git diff -- prisma/schema.prisma migrations package.json
```

Expected for schema/package/migrations:

```txt
no changes
```

---

## 4. Risks

### Risk 1: Existing status endpoint hardcodes `/admin/service-requests`

Mitigation: add a constrained `redirectTo` field that allows only:

```txt
/admin/service-requests
/admin/dispatch
```

Do not allow external redirect URLs.

---

### Risk 2: Status naming mismatch

The UI labels may not match the existing Phase 3B storage values.

Mitigation: use the existing Phase 3B validation/mapping logic. Do not create a new mapping path in `/admin/dispatch` unless the existing action already requires labels.

---

### Risk 3: Duplicate admin controls exposed publicly

Mitigation: only edit `/admin/dispatch`, which is already protected by existing admin auth. Do not add these controls to public request pages or customer-facing cards.

---

### Risk 4: Memory mode and DB mode divergence

Mitigation: the dispatch form must call the same Phase 3B status update action/endpoint used by `/admin/service-requests`. That keeps `GOVO_SKIP_DB=1` memory behavior and real DB behavior aligned.

---

### Risk 5: Accidental expansion into assignment workflow

Mitigation: Phase 4B is status-only. Do not add or write assignment name, assignment phone, provider, driver, or staff fields.

---

### Risk 6: Schema drift

Mitigation: no Prisma/schema/migration changes. Status must be written through the existing Phase 3B status column/table logic only.
