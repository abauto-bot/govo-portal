## 1. Data source plan — Phase 5A only

### Goal

Add **read-only assigned jobs preview pages** for merchant and rider:

- `/merchant/jobs`
- `/rider/jobs`

These must be **protected preview routes**, not public onboarding pages, and must not replace existing:

- `/merchant`
- `/rider`

No job actions yet.

No DB schema changes.

No secrets/env edits.

No live deploy.

---

### Access/protection plan

Because proper merchant/rider auth does not exist yet, treat these as **protected internal preview pages**.

Recommended safe approach:

1. Reuse the existing protected/admin/operator guard already used for dispatch, if available.
2. If dispatch uses middleware/session/basic guard, apply the same guard to:
   - `/merchant/jobs`
   - `/rider/jobs`
3. Do **not** expose these links in public/customer navigation.
4. Optional internal-only link placement:
   - Dispatch/admin internal dashboard only, if such nav exists.
   - Otherwise no nav link; routes are manually accessible for testing.

Do not introduce merchant/rider login assumptions in Phase 5A.

---

### Data reading plan

Use existing request/status/assignment data only.

#### In `GOVO_SKIP_DB=1`

Read from the existing in-memory request store.

Expected data source:

- Existing request memory store used by customer request/tracking/dispatch.
- Filter for requests/orders that have assignment fields or status relevant to merchant/rider jobs.

Example filtering logic:

##### Merchant jobs

Show requests where one or more of these exist:

- `assignedName`
- `assignedPhone`
- `assignedTo`
- `assignedMerchant`
- `operatorNote`
- status indicates assigned/processing/dispatched

##### Rider jobs

Show requests where one or more of these exist:

- `assignedName`
- `assignedPhone`
- `assignedRider`
- `riderName`
- `riderPhone`
- `operatorNote`
- delivery/dispatch-related status

Since Phase 4 has “safe assignment name/phone/operator note”, Phase 5A should reuse those fields instead of introducing new fields.

---

#### In real DB mode

Use existing read-only request/order tables.

No schema change.

No migrations.

No writes.

Recommended query behavior:

- Fetch recent requests/orders.
- Include existing assignment/status/operator note fields.
- Sort newest first.
- Limit results for preview safety, for example 50–100 rows.
- Do not expose sensitive/internal-only fields.

Possible read model:

```ts
{
  id,
  code,
  customerArea,
  customerAddress,
  need,
  category,
  status,
  assignedName,
  assignedPhone,
  operatorNote,
  createdAt
}
```

If existing DB table names differ, adapt to current Phase 4 request/order repository layer instead of adding new DB access patterns.

---

### Route behavior

#### `/merchant/jobs`

Protected read-only page.

Bangla-first title examples:

- `মার্চেন্ট জবস`
- `অ্যাসাইন করা কাজ`
- Empty state: `এখনো কোনো অ্যাসাইন করা কাজ নেই`

Merchant card should show:

- Request code
- Customer area
- Need/category
- Status
- Assigned name/phone if relevant
- Tracking link
- Operator note

No buttons for:

- Accept
- Reject
- Start
- Complete
- Cancel
- Edit

Only safe links:

- Tracking link
- Optional phone display/call link only if already considered safe in existing Phase 4 assignment model

---

#### `/rider/jobs`

Protected read-only page.

Bangla-first title examples:

- `রাইডার জবস`
- `ডেলিভারি/পিকআপ কাজ`
- Empty state: `এখনো কোনো রাইডার কাজ নেই`

Rider card should show:

- Job/request code
- Area/address
- Need/category
- Safe call link if available
- Current status
- Note
- Tracking link

No buttons for:

- Accept
- Reject
- Start pickup
- Start delivery
- Complete
- Failed
- Call customer if unsafe/private number is not already approved for display

---

### UI plan

Mobile-first, simple, readable.

Suggested visual system:

- Background: ivory/off-white
- Cards: white or soft ivory
- Primary text: charcoal
- Accent: deep emerald
- Minor highlight: subtle gold
- Borders/shadows: soft, low contrast

Card hierarchy:

1. Code/status row
2. Area/address
3. Need/category
4. Assigned person or phone if available
5. Operator note
6. Tracking link

Example Bangla-first labels:

```txt
রিকোয়েস্ট কোড
এলাকা
ঠিকানা
প্রয়োজন
ক্যাটাগরি
বর্তমান অবস্থা
অ্যাসাইন করা
ফোন
অপারেটর নোট
ট্র্যাকিং
```

Status display can reuse existing status labels from dispatch/customer tracking if available.

---

### Public navigation rule

Do not add `/merchant/jobs` or `/rider/jobs` to:

- Public homepage navigation
- Customer request flow
- Public merchant onboarding page
- Public rider onboarding page
- Header/footer used by unauthenticated visitors

Keep `/merchant` and `/rider` unchanged as onboarding/public pages.

---

## 2. Files likely to change

Exact paths depend on the current app structure, but likely changes are below.

### If GOVO is using Next.js App Router

Likely files:

```txt
app/merchant/jobs/page.tsx
app/rider/jobs/page.tsx
```

Shared UI:

```txt
components/jobs/AssignedJobCard.tsx
components/jobs/JobsEmptyState.tsx
components/jobs/StatusBadge.tsx
```

Or existing component area:

```txt
components/merchant/MerchantJobsPreview.tsx
components/rider/RiderJobsPreview.tsx
```

Data access layer:

```txt
lib/requests/readAssignedJobs.ts
lib/requests/requestStore.ts
lib/db/requests.ts
```

Protection/middleware:

```txt
middleware.ts
lib/auth/requireProtectedPreview.ts
lib/auth/requireDispatchAuth.ts
```

Only if existing protected route logic is centralized.

Types:

```txt
types/request.ts
types/jobs.ts
```

Only if needed. Avoid changing schema-level types in a way that implies new DB columns.

---

### If GOVO is using Next.js Pages Router

Likely files:

```txt
pages/merchant/jobs.tsx
pages/rider/jobs.tsx
```

Data/API:

```txt
lib/requests/readAssignedJobs.ts
lib/requestStore.ts
lib/db/requests.ts
```

Auth/protection:

```txt
lib/auth.ts
middleware.ts
```

---

### If there is already a dispatch data loader

Prefer extending/read-wrapping existing read-only code:

```txt
lib/dispatch/getRequests.ts
lib/dispatch/requestRepository.ts
```

Add a safe read-only selector rather than creating duplicate DB logic:

```ts
getAssignedJobsPreview({
  role: "merchant" | "rider"
})
```

This keeps Phase 5A close to Phase 4 and reduces risk.

---

### Files that should not change

Avoid changing:

```txt
.env
.env.local
.env.production
prisma/schema.prisma
drizzle schema files
database migration files
public/customer nav files unless only verifying no change
live deployment config
```

Also avoid replacing:

```txt
app/merchant/page.tsx
app/rider/page.tsx
pages/merchant.tsx
pages/rider.tsx
```

Existing public onboarding pages should remain intact.

---

## 3. Test commands

Use local-only test flow. Do not deploy.

### Install/check

```bash
npm install
```

or if already installed:

```bash
npm ci
```

---

### Type check

```bash
npm run typecheck
```

If no typecheck script exists:

```bash
npx tsc --noEmit
```

---

### Lint

```bash
npm run lint
```

---

### Build check

```bash
npm run build
```

---

### Local dev with memory store

```bash
GOVO_SKIP_DB=1 npm run dev
```

Then verify:

```txt
/merchant
/rider
/merchant/jobs
/rider/jobs
```

Expected:

- `/merchant` remains public onboarding.
- `/rider` remains public onboarding.
- `/merchant/jobs` is protected.
- `/rider/jobs` is protected.
- No accept/reject/start/complete actions appear.
- Cards render from memory request data.
- Empty state works if no assigned jobs exist.

---

### Local dev with real DB mode

Without changing env/secrets:

```bash
npm run dev
```

Verify:

```txt
/merchant/jobs
/rider/jobs
```

Expected:

- Uses existing request/order data.
- Read-only only.
- No schema migration required.
- No DB writes generated by page load.

---

### Optional route protection checks

If protected routes redirect unauthenticated users:

```bash
curl -I http://localhost:3000/merchant/jobs
curl -I http://localhost:3000/rider/jobs
```

Expected one of:

```txt
302 redirect to login/protected gate
401 unauthorized
403 forbidden
```

Authenticated/internal preview session should render `200`.

---

### Public nav regression check

Manually verify:

- Homepage does not advertise `/merchant/jobs` or `/rider/jobs`.
- Customer tracking/request flow does not link to these preview pages.
- Public merchant/rider onboarding routes still work.

---

### Suggested manual QA checklist

#### Merchant jobs page

- [ ] Bangla-first page title.
- [ ] Mobile layout works at 360px width.
- [ ] Large readable cards.
- [ ] Request code visible.
- [ ] Customer area visible.
- [ ] Need/category visible.
- [ ] Status visible.
- [ ] Assigned name/phone visible only if present.
- [ ] Tracking link works.
- [ ] Operator note visible if present.
- [ ] No action buttons.

#### Rider jobs page

- [ ] Bangla-first page title.
- [ ] Mobile layout works at 360px width.
- [ ] Job/request code visible.
- [ ] Area/address visible.
- [ ] Need/category visible.
- [ ] Safe call link appears only when allowed data exists.
- [ ] Current status visible.
- [ ] Note visible if present.
- [ ] Tracking link works.
- [ ] No action buttons.

---

## 4. Risks

### 1. Accidental public exposure

Risk: `/merchant/jobs` and `/rider/jobs` could expose operational/customer data if not protected.

Mitigation:

- Reuse existing dispatch/admin protection.
- Do not add public nav links.
- Add middleware guard tests/manual checks.
- Treat routes as internal preview until proper role auth exists.

---

### 2. Confusing public onboarding routes

Risk: Existing `/merchant` and `/rider` public onboarding pages may accidentally be replaced.

Mitigation:

- Only add nested `/merchant/jobs` and `/rider/jobs`.
- Do not edit existing onboarding page unless absolutely necessary.
- Regression test `/merchant` and `/rider`.

---

### 3. Data shape inconsistency between memory and DB modes

Risk: Memory store and DB records may use slightly different field names for assignment/status/note.

Mitigation:

- Create a small normalization function:

```ts
normalizeAssignedJob(request): AssignedJobPreview
```

- Use same normalized shape for both merchant and rider pages.
- Fallback gracefully when optional fields are missing.

---

### 4. Revealing unsafe phone/address data

Risk: Rider/merchant preview may show more customer data than intended.

Mitigation:

- Only use existing Phase 4 safe assignment/request fields.
- For call links, only show `tel:` when the existing phone field is already intended for operational display.
- Avoid exposing hidden/internal/customer-private fields.
- Prefer customer area over full address on merchant page unless full address is already shown in dispatch/tracking context.

---

### 5. Accidentally creating workflow actions

Risk: UI may invite operations like accept/reject/complete too early.

Mitigation:

- No action buttons.
- No mutation APIs.
- No forms.
- No status update calls from merchant/rider pages.
- Tracking link only.

---

### 6. DB writes on page load

Risk: Existing repository functions may update timestamps/status during fetch.

Mitigation:

- Use strictly read-only query methods.
- Avoid dispatch mutation handlers.
- Confirm page load does not trigger status changes.

---

### 7. Route protection mismatch

Risk: Existing auth guard may be admin-only, not merchant/rider-role ready.

Mitigation:

- That is acceptable for Phase 5A.
- Label internally as “protected preview”.
- Do not create fake merchant/rider auth yet.
- Later phase can replace guard with proper role-based auth.

---

### 8. Mobile usability issues

Risk: Cards may become dense with code, area, address, phone, note, and tracking.

Mitigation:

- Use large spacing.
- Use short Bangla labels.
- Collapse absent values.
- Put note in a muted section.
- Keep primary code/status visible at top.

---

### Recommended implementation branch

```bash
git checkout -b phase-5a-merchant-rider-readonly-jobs
```

Commit scope should stay narrow:

```txt
feat: add protected merchant and rider readonly jobs previews
```

No deploy from this branch until reviewed.
