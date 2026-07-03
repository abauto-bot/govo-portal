## 1. Data source plan

### Goal

Phase 5A should add **read-only assigned jobs views** for:

- `/merchant`
- `/merchant/dashboard`
- `/rider`

No job actions yet. No accept/reject/start/completed buttons. No DB schema changes.

---

### A. Create/extend one read-only jobs adapter

Use one normalized server/helper layer so merchant and rider pages do not directly depend on DB/memory differences.

Recommended shape:

```ts
type FulfillmentJobCard = {
  id: string;
  code: string;
  trackingUrl: string;

  area?: string;
  address?: string;
  need?: string;
  category?: string;
  status?: string;

  assignedName?: string;
  assignedPhone?: string;
  operatorNote?: string;
  customerPhone?: string;
  operatorPhone?: string;

  createdAt?: string;
  updatedAt?: string;
};
```

Create read-only functions such as:

```ts
getMerchantAssignedJobs()
getRiderAssignedJobs()
```

or one shared function:

```ts
getAssignedFulfillmentJobs({ view: "merchant" | "rider" })
```

Important:

- Only read existing request/order/status/assignment data.
- Normalize missing values safely.
- Sort newest first or status-priority first.
- Do not mutate status.
- Do not assign jobs.
- Do not create records.

---

### B. `GOVO_SKIP_DB=1` behavior

When `GOVO_SKIP_DB=1`, read from the existing in-memory request store already used by customer/dispatch flow.

Expected source:

- Existing request memory array/store.
- Existing assignment fields.
- Existing status fields.
- Existing operator note fields.

Filtering:

- Merchant view: show requests with merchant/vendor/shop assignment if such fields exist.
- Rider view: show requests with rider/worker/runner assignment if such fields exist.
- If the current data model only has generic assignment fields, still show assigned jobs read-only using available assignment data, but label conservatively.

Example logic:

```ts
const requests = getMemoryRequests();

return requests
  .filter(request => hasAnyAssignment(request))
  .map(normalizeRequestToFulfillmentJob);
```

If there is already role-specific assignment data:

```ts
merchantAssignedToName
merchantAssignedToPhone
riderAssignedToName
riderAssignedToPhone
```

then use those separately.

---

### C. Real DB mode behavior

When `GOVO_SKIP_DB` is not enabled:

- Use existing read-only request/order tables.
- Use existing status/assignment fields or joins.
- Do not run migrations.
- Do not add columns.
- Do not add new enum values.
- Do not edit env/secrets.

Recommended query behavior:

```ts
where: {
  OR: [
    { assignedName: { not: null } },
    { assignedPhone: { not: null } },
    { operatorNote: { not: null } }
  ]
}
```

If the schema has merchant/rider specific fields:

```ts
merchant view:
where merchantAssignedId/name/phone exists

rider view:
where riderAssignedId/name/phone exists
```

If the DB uses an `orders` table instead of a `requests` table, keep the adapter flexible but read-only.

---

### D. Tracking link

Use existing customer tracking route, for example:

```ts
/tracking/[code]
```

or whatever current tracking route exists.

Card should render a clear CTA:

Bangla:

```txt
ট্র্যাকিং দেখুন
```

The link must be public/customer-safe and should not expose internal IDs if request code is already the public tracking token.

---

### E. Phone/call links

For rider cards:

- If customer/operator phone is available and already allowed in existing data, render a safe `tel:` link.
- Sanitize phone before placing in `href`.
- Prefer masking visible phone number while still offering a call button if the product already permits it.

Example:

```txt
কল করুন
```

instead of displaying full number.

Do not reveal secrets or internal operator credentials.

---

### F. Empty/error states

Use Bangla-first empty states.

Merchant empty:

```txt
এখন কোনো অ্যাসাইন করা কাজ নেই।
```

Rider empty:

```txt
এখন কোনো ডেলিভারি/কাজ অ্যাসাইন নেই।
```

Error fallback:

```txt
তথ্য লোড করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।
```

Do not expose stack traces or DB details in UI.

---

## 2. Files likely to change

Exact filenames may vary, but likely changes should stay limited to these areas.

### A. Merchant pages

Likely:

```txt
app/merchant/page.tsx
app/merchant/dashboard/page.tsx
```

or if using Pages Router:

```txt
pages/merchant/index.tsx
pages/merchant/dashboard.tsx
```

Changes:

- Replace placeholder/static dashboard content with read-only assigned jobs list.
- Reuse the same card component/data loader.
- Keep merchant UI simple and mobile-first.
- Do not add workflow buttons.

Merchant card fields:

```txt
রিকোয়েস্ট কোড
এলাকা
প্রয়োজন/ক্যাটাগরি
স্ট্যাটাস
অ্যাসাইনড নাম/ফোন, if relevant
অপারেটর নোট
ট্র্যাকিং লিংক
```

---

### B. Rider page

Likely:

```txt
app/rider/page.tsx
```

or:

```txt
pages/rider.tsx
```

Changes:

- Show assigned rider/worker jobs read-only.
- Use large mobile cards.
- Add safe call link if allowed/available.
- No start/completed/action buttons.

Rider card fields:

```txt
জব কোড
এলাকা/ঠিকানা
প্রয়োজন/ক্যাটাগরি
কাস্টমার/অপারেটর কল লিংক, if available
বর্তমান স্ট্যাটাস
নোট
ট্র্যাকিং লিংক
```

---

### C. Shared data helper

Likely new or extended:

```txt
lib/assigned-jobs.ts
lib/requests.ts
lib/dispatch.ts
lib/data/assignedJobs.ts
src/lib/assigned-jobs.ts
```

Purpose:

- Hide memory-vs-DB differences.
- Normalize request/order records into UI-friendly cards.
- Keep reads server-side where possible.
- Keep strict read-only semantics.

Suggested functions:

```ts
export async function getMerchantAssignedJobs(): Promise<FulfillmentJobCard[]> {}

export async function getRiderAssignedJobs(): Promise<FulfillmentJobCard[]> {}
```

or:

```ts
export async function getAssignedFulfillmentJobs(
  view: "merchant" | "rider"
): Promise<FulfillmentJobCard[]> {}
```

---

### D. Shared UI component

Likely new:

```txt
components/AssignedJobCard.tsx
components/fulfillment/AssignedJobCard.tsx
components/merchant/MerchantAssignedJobs.tsx
components/rider/RiderAssignedJobs.tsx
```

Recommended:

- One generic `AssignedJobCard`.
- Optional `variant="merchant" | "rider"`.
- Avoid duplicating style logic.

Visual style:

- Deep emerald background or accents.
- Charcoal text.
- Ivory card background.
- Subtle gold highlight for code/status.
- Large touch-friendly spacing.
- Bangla labels first.

Example visual tokens if Tailwind is used:

```txt
bg-emerald-950
text-stone-950
bg-[#FFFDF5] / ivory
border-amber-300/40
text-amber-700
rounded-2xl
shadow-sm
p-4
```

---

### E. Navigation/layout

Likely:

```txt
components/Nav.tsx
components/Header.tsx
app/layout.tsx
```

Only change if necessary.

Requirement:

- Keep public/customer navigation clean.
- Do not add merchant/rider links to primary customer nav unless they already exist as staff/internal links.
- If there is an internal nav area, merchant/rider links can stay there.

---

### F. Tests, if present

Likely:

```txt
__tests__/assigned-jobs.test.ts
tests/assigned-jobs.test.ts
tests/merchant.spec.ts
tests/rider.spec.ts
```

Recommended test coverage:

- Memory mode returns assigned request cards.
- Merchant page renders assigned job card.
- Rider page renders assigned job card.
- Empty state renders safely.
- No action buttons are present.

Avoid tests that require real secrets or live DB.

---

## 3. Test commands

Use local/staged only. Do not deploy.

### A. Install/check

```bash
npm install
```

or if lockfile requires:

```bash
npm ci
```

---

### B. Lint/type/build

```bash
npm run lint
npm run build
```

If TypeScript check is separate:

```bash
npm run typecheck
```

---

### C. Unit tests

```bash
npm test
```

or:

```bash
npm run test
```

---

### D. Local memory mode manual test

Run without DB:

```bash
GOVO_SKIP_DB=1 npm run dev
```

Then check:

```txt
http://localhost:3000/merchant
http://localhost:3000/merchant/dashboard
http://localhost:3000/rider
```

Verify:

- Cards load from memory request store.
- No DB connection required.
- Empty states are Bangla and clean.
- Tracking links work.
- No accept/reject/start/completed buttons exist.

---

### E. Optional curl checks

```bash
curl -I http://localhost:3000/merchant
curl -I http://localhost:3000/merchant/dashboard
curl -I http://localhost:3000/rider
```

Expected:

```txt
HTTP 200
```

or expected auth redirect if these routes are protected.

---

### F. Real DB read-only local test

Only if local non-production DB is already configured.

```bash
npm run dev
```

Then verify the same pages.

Important:

- Do not edit `.env`.
- Do not use production DB.
- Do not run migrations.
- Do not deploy.

---

### G. Regression checks

Search for forbidden action labels/buttons:

```bash
grep -R "Accept\|Reject\|Start\|Complete\|Completed\|গ্রহণ\|বাতিল\|শুরু\|সম্পন্ন" app components pages src || true
```

Manual confirmation:

- Merchant/rider cards are read-only.
- Dispatch Phase 4 still works.
- Customer request flow still works.
- Customer tracking flow still works.
- Public/customer nav remains uncluttered.

---

## 4. Risks

### A. Data model ambiguity

Risk:

- Existing request/order schema may not clearly separate merchant assignment from rider assignment.

Mitigation:

- Use a normalization helper.
- Prefer role-specific assignment fields if they exist.
- If only generic assignment exists, show generic assigned fulfillment jobs read-only and keep labels neutral.

---

### B. Privacy exposure

Risk:

- Rider card phone links could expose customer/operator numbers.

Mitigation:

- Only use phone fields already available and intended for fulfillment.
- Sanitize `tel:` href.
- Prefer button text like `কল করুন` instead of printing full phone.
- Do not expose secrets, internal notes beyond allowed operator note, or admin-only metadata.

---

### C. Accidentally adding workflow actions

Risk:

- Users may expect accept/start/complete buttons.

Mitigation:

- Phase 5A must be read-only.
- No mutation endpoints.
- No forms for status change.
- No action buttons except tracking/call links.
- Save accept/reject/start/completed for a later phase.

---

### D. DB coupling

Risk:

- Pages could directly import DB logic and break memory mode.

Mitigation:

- Put all data access behind `getAssignedFulfillmentJobs`.
- Ensure `GOVO_SKIP_DB=1` never imports or initializes DB client if current architecture requires that separation.

---

### E. Public navigation clutter

Risk:

- Merchant/rider links added to customer-facing nav could confuse customers.

Mitigation:

- Do not add merchant/rider to public nav.
- Keep these as direct/internal routes or in existing staff navigation only.

---

### F. Empty states mistaken for errors

Risk:

- If no assigned jobs exist, merchant/rider may think system is broken.

Mitigation:

- Clear Bangla empty copy.
- Optional helper text:

```txt
ডিসপ্যাচ থেকে কাজ অ্যাসাইন হলে এখানে দেখা যাবে।
```

---

### G. Live system safety

Risk:

- Testing against live DB or deploying incomplete phase.

Mitigation:

- Work on feature branch only, for example:

```bash
git checkout -b phase-5a-readonly-assigned-jobs
```

- No env/secrets changes.
- No migrations.
- No production deploy.
- Open PR with screenshots and test results.
