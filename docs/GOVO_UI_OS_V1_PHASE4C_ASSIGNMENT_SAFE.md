## 1. Assignment persistence method

Phase 4C should store assignment data without any DB schema change.

### Fields added to protected `/admin/dispatch` cards

Each dispatch card gets an admin-only assignment form with:

- `assignedName`
- `assignedPhone`
- `operatorNote`

Submit action:

- Saves assignment safely.
- Redirects back to `/admin/dispatch`.
- Does not expose controls outside the protected admin dispatch page.

### Storage behavior

#### `GOVO_SKIP_DB=1`

Use an in-memory assignment store keyed by dispatch/request/order id.

Example shape:

```ts
{
  assignedName: string;
  assignedPhone: string;
  operatorNote: string;
  updatedAt: string;
}
```

This is intentionally non-durable and rollback-safe. It should live in a server-side module only, for local/dev/test use.

#### Real DB mode

Do **not** add columns or migrations.

If the existing dispatch status/note update path exists, reuse it by storing assignment as sanitized operator note/meta text.

Recommended serialized note block:

```txt
[GOVO_ASSIGNMENT]
Assigned Name: Jane Driver
Assigned Phone: 5551234567
Operator Note: Pickup with insulated bag.
Updated At: 2026-07-03T00:00:00.000Z
[/GOVO_ASSIGNMENT]
```

If there is already an operator note, append or replace only the GOVO assignment block, preserving unrelated existing notes.

Sanitization rules:

- Trim whitespace.
- Strip HTML/control characters.
- Cap lengths:
  - assigned name: 80 chars
  - assigned phone: 40 chars
  - operator note: 500 chars
- Normalize newlines.
- Never render as raw HTML.
- Treat as admin-only operational metadata.

Redirect after save:

```ts
redirect('/admin/dispatch');
```

---

## 2. Files changed

Recommended minimal, rollback-friendly file set.

### Add

#### `lib/admin/dispatchAssignment.ts`

New helper for:

- sanitizing assignment fields
- serializing assignment into an operator-note/meta block
- parsing assignment block back out
- replacing an existing assignment block safely

Responsibilities:

```ts
export type DispatchAssignment = {
  assignedName: string;
  assignedPhone: string;
  operatorNote: string;
  updatedAt?: string;
};

export function sanitizeAssignment(input: unknown): DispatchAssignment;

export function serializeAssignmentNote(
  assignment: DispatchAssignment
): string;

export function parseAssignmentFromNote(
  note?: string | null
): DispatchAssignment | null;

export function upsertAssignmentBlock(
  existingNote: string | null | undefined,
  assignment: DispatchAssignment
): string;
```

### Add

#### `lib/admin/dispatchAssignmentMemoryStore.ts`

Only used when `process.env.GOVO_SKIP_DB === '1'`.

Example behavior:

```ts
const assignmentStore = new Map<string, DispatchAssignment>();

export function getMemoryAssignment(id: string) {
  return assignmentStore.get(id) ?? null;
}

export function setMemoryAssignment(id: string, assignment: DispatchAssignment) {
  assignmentStore.set(id, {
    ...assignment,
    updatedAt: new Date().toISOString(),
  });
}
```

No secrets. No persistence. No schema coupling.

### Modify

#### Existing protected admin dispatch page

Likely one of:

```txt
app/admin/dispatch/page.tsx
app/admin/dispatch/DispatchCard.tsx
components/admin/DispatchCard.tsx
```

Add assignment fields inside each protected admin dispatch card.

Example UI pattern:

```tsx
<form action={saveDispatchAssignmentAction}>
  <input type="hidden" name="dispatchId" value={dispatch.id} />

  <label>
    Assigned Name
    <input
      name="assignedName"
      defaultValue={assignment?.assignedName ?? ''}
      maxLength={80}
      autoComplete="off"
    />
  </label>

  <label>
    Assigned Phone
    <input
      name="assignedPhone"
      defaultValue={assignment?.assignedPhone ?? ''}
      maxLength={40}
      inputMode="tel"
      autoComplete="off"
    />
  </label>

  <label>
    Operator Note
    <textarea
      name="operatorNote"
      defaultValue={assignment?.operatorNote ?? ''}
      maxLength={500}
    />
  </label>

  <button type="submit">
    Save assignment
  </button>
</form>
```

Important:

- Render only under protected `/admin/dispatch`.
- Do not add to public order/status/customer views.
- Do not use `dangerouslySetInnerHTML`.

### Modify or add

#### Existing dispatch admin action file

Likely one of:

```txt
app/admin/dispatch/actions.ts
app/admin/dispatch/statusActions.ts
server/admin/dispatchActions.ts
```

Add one server-side action:

```ts
'use server';

import { redirect } from 'next/navigation';
import {
  sanitizeAssignment,
  upsertAssignmentBlock,
} from '@/lib/admin/dispatchAssignment';
import {
  setMemoryAssignment,
} from '@/lib/admin/dispatchAssignmentMemoryStore';

export async function saveDispatchAssignmentAction(formData: FormData) {
  // 1. Require existing admin protection.
  // Use the same guard as Phase 4A/4B.
  await requireAdmin();

  const dispatchId = String(formData.get('dispatchId') ?? '').trim();

  if (!dispatchId) {
    redirect('/admin/dispatch');
  }

  const assignment = sanitizeAssignment({
    assignedName: formData.get('assignedName'),
    assignedPhone: formData.get('assignedPhone'),
    operatorNote: formData.get('operatorNote'),
  });

  if (process.env.GOVO_SKIP_DB === '1') {
    setMemoryAssignment(dispatchId, assignment);
    redirect('/admin/dispatch');
  }

  // Real DB mode:
  // Reuse existing note/status update path.
  // Do not change schema.
  const existing = await getDispatchById(dispatchId);
  const nextOperatorNote = upsertAssignmentBlock(
    existing?.operatorNote ?? existing?.note ?? '',
    assignment
  );

  await updateDispatchOperatorNote(dispatchId, nextOperatorNote);

  redirect('/admin/dispatch');
}
```

Use existing project functions for:

```ts
requireAdmin()
getDispatchById()
updateDispatchOperatorNote()
```

Do not introduce a new DB table or migration.

### Optional modify

#### Dispatch loading/mapping helper

Where dispatch cards are prepared, derive assignment display state from either:

1. memory store if `GOVO_SKIP_DB=1`
2. parsed operator note/meta block in real DB mode

Example:

```ts
const assignment =
  process.env.GOVO_SKIP_DB === '1'
    ? getMemoryAssignment(dispatch.id)
    : parseAssignmentFromNote(dispatch.operatorNote ?? dispatch.note);
```

---

## 3. Test commands

Run from a clean branch, for example:

```bash
git checkout -b phase-4c-dispatch-assignment-fields
```

### Static checks

```bash
npm run lint
npm run typecheck
npm run build
```

If the repo does not have `typecheck`:

```bash
npx tsc --noEmit
```

### Local skip-DB test

```bash
GOVO_SKIP_DB=1 npm run dev
```

Manual test:

1. Visit `/admin/dispatch`.
2. Confirm admin protection still applies.
3. Confirm each dispatch card has:
   - assigned name
   - assigned phone
   - operator note
4. Enter assignment data.
5. Save.
6. Confirm redirect back to `/admin/dispatch`.
7. Confirm values remain visible while the server process stays alive.
8. Restart dev server.
9. Confirm memory data is gone, as expected.

### Real DB mode test

With normal local DB config already present:

```bash
npm run dev
```

Manual test:

1. Visit `/admin/dispatch`.
2. Save assignment on an existing dispatch item.
3. Confirm redirect to `/admin/dispatch`.
4. Confirm no migration was required.
5. Confirm assignment appears on reload.
6. Confirm existing unrelated operator notes are preserved.
7. Confirm updating assignment replaces the previous assignment block instead of duplicating it.
8. Confirm public/customer pages do not show assignment fields or admin notes.

### Security regression checks

```bash
grep -R "assignedName\|assignedPhone\|operatorNote" app components lib server
```

Confirm assignment controls are only rendered in protected admin dispatch UI.

Also verify no secret files changed:

```bash
git diff -- . ':!package-lock.json' ':!pnpm-lock.yaml' | less
git status --short
```

Ensure no edits to:

```txt
.env
.env.local
.env.production
```

---

## 4. Risks

### Memory store is not durable

In `GOVO_SKIP_DB=1`, assignment data is process memory only.

Expected behavior:

- survives page reload
- does not survive server restart
- may not survive serverless cold starts

This is acceptable for skip-DB mode.

### Operator note storage is semi-structured

Because Phase 4C avoids DB schema changes, assignment data is stored as sanitized operator note/meta text.

Risk:

- future note editing could accidentally remove the assignment block

Mitigation:

- use a clear `[GOVO_ASSIGNMENT]` block
- replace only that block on assignment saves
- preserve unrelated note content

### PII handling

Assigned phone/name are operational data and should remain admin-only.

Mitigation:

- render only under protected `/admin/dispatch`
- require server-side admin auth in the save action
- do not expose assignment data in public APIs or customer views

### Existing note field compatibility

Different environments may use `note`, `operatorNote`, `adminNote`, or a status-update function.

Mitigation:

- reuse the existing Phase 4B dispatch update function if available
- do not add columns
- keep helper isolated for easy rollback

### Rollback

Rollback is simple:

1. Remove assignment form from dispatch cards.
2. Remove `saveDispatchAssignmentAction`.
3. Remove assignment helper/store files.
4. No DB rollback required because no schema changed.
