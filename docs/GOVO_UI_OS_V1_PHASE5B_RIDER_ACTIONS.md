## 1. Files likely to change

Phase 5B should be limited to the protected admin rider preview area.

Likely files:

```txt
app/admin/rider-jobs-preview/page.tsx
```

Add rider/worker action buttons inside the existing admin-only rider jobs preview UI.

```txt
app/admin/rider-jobs-preview/actions.ts
```

Or equivalent route/action file depending on current project structure.

Use this for the POST action handler/server action.

Possible existing files to import from, but avoid changing unless absolutely necessary:

```txt
lib/dispatch/*
lib/jobs/*
lib/admin/*
lib/status/*
```

Use the existing dispatch/status update function already used elsewhere.

Do not change:

```txt
app/rider/*
pages/rider/*
app/public/*
.env*
prisma/schema.prisma
database migrations
```

No DB schema changes. No env/secrets changes.

---

## 2. Endpoint plan

### Add admin-only POST action

Recommended endpoint/action:

```txt
POST /admin/rider-jobs-preview/action
```

Or a colocated server action if the app already uses server actions.

The handler must:

1. Verify admin access using the same protection already used by `/admin/rider-jobs-preview`.
2. Read:
   - `jobId`
   - `action`
3. Validate `action` against an allowlist.
4. Map rider action to existing job status.
5. Update using existing status update logic.
6. Redirect back to:

```txt
/admin/rider-jobs-preview
```

### Action mapping

```ts
const RIDER_ACTION_TO_STATUS = {
  accept: "Assigned",
  reject: "Cancelled",
  start: "On the way",
  reached: "Working",
  working: "Working",
  completed: "Completed",
} as const;
```

### Runtime behavior

#### `GOVO_SKIP_DB=1`

Update the existing memory/in-memory preview store.

Example behavior:

```ts
if (process.env.GOVO_SKIP_DB === "1") {
  updatePreviewMemoryJobStatus(jobId, nextStatus);
}
```

Use the existing memory store/status helper if already present.

#### Real DB mode

Use only the existing status update function.

Example behavior:

```ts
await updateJobStatus(jobId, nextStatus);
```

Do not add direct raw DB mutation unless that is already the existing approved update function.

### UI buttons

Render buttons only inside:

```txt
/admin/rider-jobs-preview
```

Each job card/table row can include forms like:

```tsx
<form method="POST" action="/admin/rider-jobs-preview/action">
  <input type="hidden" name="jobId" value={job.id} />
  <input type="hidden" name="action" value="accept" />
  <button type="submit">Accept</button>
</form>
```

Buttons to add:

```txt
Accept     -> Assigned
Reject     -> Cancelled
Start      -> On the way
Reached    -> Working
Working    -> Working
Completed  -> Completed
```

Important:

- Do not add these controls to `/rider`.
- Do not add public APIs for rider actions.
- Do not expose action buttons outside the admin preview.
- The POST handler must also enforce admin access, not just the UI.

---

## 3. Test commands

### Install/build checks

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

If the project uses pnpm:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

### Confirm no public rider route changes

```bash
git diff -- app/rider pages/rider
```

Expected: no changes.

Also useful:

```bash
git diff --name-only
```

Expected changed files should be limited to admin preview/action files and possibly tests.

### Test memory mode

```bash
GOVO_SKIP_DB=1 npm run dev
```

Then open:

```txt
/admin/rider-jobs-preview
```

Manually verify:

1. Action buttons appear on admin rider preview.
2. Clicking `Accept` changes job status to `Assigned`.
3. Clicking `Reject` changes job status to `Cancelled`.
4. Clicking `Start` changes job status to `On the way`.
5. Clicking `Reached` changes job status to `Working`.
6. Clicking `Working` keeps/sets status to `Working`.
7. Clicking `Completed` changes job status to `Completed`.
8. Each action redirects back to `/admin/rider-jobs-preview`.

### Test real DB mode

Run normally without `GOVO_SKIP_DB=1`:

```bash
npm run dev
```

Verify the same action flow, ensuring updates go through the existing status update function.

### Access-control test

While logged out or without admin access, attempt direct POST:

```bash
curl -i -X POST http://localhost:3000/admin/rider-jobs-preview/action \
  -d "jobId=test-job-id" \
  -d "action=accept"
```

Expected:

```txt
401, 403, or redirect to admin login
```

Not expected:

```txt
200 with status update
```

### Invalid action test

```bash
curl -i -X POST http://localhost:3000/admin/rider-jobs-preview/action \
  -d "jobId=test-job-id" \
  -d "action=delete"
```

Expected:

```txt
400, 422, or safe redirect with no mutation
```

---

## 4. Risks

### Public exposure risk

Risk: action buttons or action endpoint could be exposed outside admin preview.

Mitigation:

- Only render buttons in `/admin/rider-jobs-preview`.
- Do not touch `/rider`.
- Add server-side admin guard to the POST handler.

### Unauthorized mutation risk

Risk: a user could manually POST to the action endpoint.

Mitigation:

- Enforce admin authentication/authorization in the handler itself.
- Do not rely on hidden buttons as protection.

### Status mismatch risk

Risk: new labels may not match the existing status enum/allowed values.

Mitigation:

- Use the exact existing status names already accepted by the current status update function.
- If existing statuses differ, map the display action to the existing canonical value.

### DB bypass risk

Risk: implementation may accidentally add new direct DB writes.

Mitigation:

- In real DB mode, call only the existing status update function.
- No new schema, no migrations, no raw SQL.

### Memory mode inconsistency risk

Risk: `GOVO_SKIP_DB=1` may update UI state differently than DB mode.

Mitigation:

- Use the existing memory preview store/update helper.
- Keep action mapping identical in both modes.

### Scope creep risk

Risk: implementing real rider authentication or public rider controls.

Mitigation:

- Phase 5B is admin-preview-only.
- Do not modify `/rider`.
- Do not add rider login/session logic.
