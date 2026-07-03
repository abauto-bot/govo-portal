# Implementation Brief: GOVO Express Local Premium Trust OS v1 (Phase 3B)

**Role**: Senior Product Strategist, UX Architect, and Safe Implementation Planner  
**Target Audience**: Coding Agent (Cursor / GitHub Copilot / Codex)  
**Objective**: Connect the customer tracking timeline to real-time status updates, build a secure operator/admin interface to manage request states, and support both PostgreSQL and an in-memory fallback (`GOVO_SKIP_DB=1`) seamlessly.

---

## 1. Existing Request/Status Flow Understanding

Currently, the system operates as follows:
1. **Customer Submission**: The customer fills out a service request form.
2. **API Processing**: The form POSTs to `/api/requests` (or `/service-request` endpoint).
3. **Response**: The API returns a JSON payload containing:
   - `requestId` / `code` (e.g., `REQ-1002`)
   - Initial status (e.g., `Phone Confirming`)
   - Tracking URL (e.g., `/track?code=REQ-1002`)
   - Support URL
4. **Notification**: A Telegram notification is dispatched to operators containing the request details and tracking link.
5. **Tracking Page**: The customer is redirected to `/track?code=REQ-1002`, which currently renders a static or mock 9-step GOVO timeline.

---

## 2. Files Likely to Change

To implement Phase 3B without breaking existing functionality, the following files will be created or modified:

```text
go-express/
├── src/
│   ├── lib/
│   │   └── store.ts                 <-- NEW: Unified state manager (In-Memory vs DB)
│   ├── app/
│   │   ├── api/
│   │   │   ├── requests/
│   │   │   │   └── route.ts         <-- MODIFY: Support GET by code, write to unified store
│   │   │   └── admin/
│   │   │       └── update-status/
│   │   │           └── route.ts     <-- NEW: Secure status update endpoint
│   │   ├── track/
│   │   │   └── page.tsx             <-- MODIFY: Dynamic fetching of status & history
│   │   └── admin/
│   │       └── requests/
│   │           └── page.tsx         <-- NEW: Simple Operator Dashboard (PIN-protected)
```

---

## 3. API & Status Endpoint Plan

We will introduce/enhance two primary API patterns:

### A. Fetch Request Status (`GET /api/requests?code=REQ_ID`)
- **Publicly Accessible**: Safe to expose to customers.
- **Payload**: Returns only non-sensitive tracking information:
  ```json
  {
    "success": true,
    "data": {
      "code": "REQ-1002",
      "status": "on_the_way",
      "updatedAt": "2023-10-27T10:14:00Z",
      "timeline": [
        { "status": "submitted", "label": "Request Submitted", "timestamp": "2023-10-27T10:00:00Z", "completed": true },
        { "status": "phone_confirming", "label": "Phone Confirming", "timestamp": "2023-10-27T10:02:00Z", "completed": true },
        { "status": "confirmed", "label": "Confirmed", "timestamp": "2023-10-27T10:05:00Z", "completed": true },
        { "status": "assigned", "label": "Operator Assigned", "timestamp": "2023-10-27T10:10:00Z", "completed": true },
        { "status": "on_the_way", "label": "On the Way", "timestamp": "2023-10-27T10:14:00Z", "completed": true },
        { "status": "working", "label": "Working", "timestamp": null, "completed": false },
        { "status": "completed", "label": "Completed", "timestamp": null, "completed": false },
        { "status": "paid", "label": "Paid", "timestamp": null, "completed": false },
        { "status": "feedback", "label": "Feedback Received", "timestamp": null, "completed": false }
      ]
    }
  }
  ```

### B. Update Request Status (`POST /api/admin/update-status`)
- **Protected**: Requires a simple header-based or payload-based PIN verification (`x-admin-pin` or `adminPin`).
- **Payload**:
  ```json
  {
    "code": "REQ-1002",
    "status": "working",
    "adminPin": "1234" 
  }
  ```
- **Behavior**: Updates the current status, appends an entry to the status history, and triggers an optional Telegram notification to the operator channel alerting them of the state transition.

---

## 4. Operator/Admin UI Plan

To keep implementation clean and fast, we will build a lightweight, mobile-responsive Operator Control Panel at `/admin/requests`.

### Key Features:
1. **PIN Entry Gate**: A simple password/PIN field at the top of the page (persisted in `localStorage` for convenience) to authorize actions.
2. **Request List**: Displays active requests with their current status.
3. **Quick-Action Status Selector**: A dropdown or button group containing the 9 sequential states:
   - `submitted` (Submitted)
   - `phone_confirming` (Phone Confirming)
   - `confirmed` (Confirmed)
   - `assigned` (Assigned)
   - `on_the_way` (On the Way)
   - `working` (Working)
   - `completed` (Completed)
   - `paid` (Paid)
   - `feedback` (Feedback)
4. **History Log**: Displays a mini-audit trail of when each status was updated.

---

## 5. Customer Tracking Timeline Plan

The customer tracking page `/track?code=REQ_ID` will be updated from static mock states to dynamic polling:

1. **Polling / Fetching**: On mount, fetch `/api/requests?code=REQ_ID` every 10 seconds.
2. **9-Step Visualizer**:
   - Map the current status to an index (0 to 8).
   - Render a vertical or horizontal timeline.
   - Steps up to the current status index are marked as **Completed** (Green/Active).
   - The current step is marked as **In Progress** (Pulsing/Active).
   - Future steps are marked as **Pending** (Gray/Muted).
3. **No Admin Leakage**: Ensure no administrative details (such as internal notes, operator PINs, or raw database IDs) are exposed in the client-side payload.

---

## 6. In-Memory Test Mode Plan (`GOVO_SKIP_DB=1`)

To allow robust local testing and rapid prototyping without requiring a local PostgreSQL instance:

1. **Global Store Singleton**: Implement a safe global store in `src/lib/store.ts` that persists across hot-reloads in Next.js development mode.
   ```typescript
   // src/lib/store.ts
   import { Request } from './types'; // or define inline

   declare global {
     var govoInMemoryStore: Map<string, any> | undefined;
   }

   const store = globalThis.govoInMemoryStore ?? new Map<string, any>();
   if (process.env.NODE_ENV !== 'production') {
     globalThis.govoInMemoryStore = store;
   }

   export { store as inMemoryStore };
   ```
2. **Fallback Logic**:
   - If `process.env.GOVO_SKIP_DB === '1'`, write and read directly from `inMemoryStore`.
   - Seed the store with a default mock request (e.g., `REQ-TEST-99`) on initialization so developers can test `/track?code=REQ-TEST-99` immediately.

---

## 7. DB-Safe Persistence Plan

If `GOVO_SKIP_DB` is not active, we interact with PostgreSQL:

1. **Schema Preservation**: Do not force a complex migration. 
2. **Graceful Column Check**:
   - If the `requests` table already has a `status` column, update it.
   - If a `status_history` column does not exist, store history as a JSONB array inside a new column, or fall back to a lightweight, dynamically created table.
   - If any database query fails due to missing columns, log a warning and gracefully fall back to the in-memory store for that request session rather than crashing the application.

---

## 8. Test Checklist

- [ ] **Submit Request**: Verify a new request is successfully created and assigned a unique tracking code.
- [ ] **In-Memory Verification**: Run with `GOVO_SKIP_DB=1`. Verify that status updates persist across page navigation.
- [ ] **Admin PIN Security**: Verify that status updates fail with an incorrect PIN and succeed with the correct PIN.
- [ ] **Timeline Progression**: Update a request status to `on_the_way` via the Admin UI and verify the customer `/track` page updates in real-time (or upon manual refresh).
- [ ] **Telegram Notification**: Verify that status transitions trigger the appropriate Telegram notifications (if configured) without blocking the HTTP response.

---

## 9. Rollback Checklist

- [ ] **Code Reversion**: Keep all Phase 3B changes isolated to the specified files. To roll back, run `git checkout main -- src/` and delete the newly created admin routes.
- [ ] **Database Safety**: Since no destructive database migrations are executed, rolling back the application code will immediately restore the previous database behavior.

---

## 10. Codex / Cursor Coding Prompt

```markdown
You are an expert Next.js, TypeScript, and Tailwind CSS engineer. Implement Phase 3B of the GOVO Express Local Premium Trust OS v1.

### Requirements:

1. **Unified Store (`src/lib/store.ts`)**:
   - Create a unified data access layer.
   - If `process.env.GOVO_SKIP_DB === '1'`, use a global in-memory Map (`globalThis.govoInMemoryStore`) to store and retrieve requests. Seed it with a mock request `REQ-TEST-99` with status `phone_confirming` and some initial history.
   - If `GOVO_SKIP_DB` is not '1', interface with the existing PostgreSQL database. Ensure queries are safe and do not crash if optional columns (like `status_history`) are missing.

2. **API Updates**:
   - Update `GET /api/requests`:
     - Accept a `code` query parameter (e.g., `/api/requests?code=REQ-1002`).
     - Return the request status, updated timestamp, and a structured 9-step timeline array showing which steps are completed based on the current status.
   - Create `POST /api/admin/update-status`:
     - Accept `code`, `status`, and `adminPin` in the JSON body.
     - Verify `adminPin` matches `process.env.ADMIN_PIN` (fallback to "1234" if not set). Return 401 if invalid.
     - Update the request status and append to its history log.
     - Return the updated request.

3. **Operator/Admin UI (`src/app/admin/requests/page.tsx`)**:
   - Build a clean, secure, mobile-friendly dashboard.
   - Include a PIN input field at the top (saved to localStorage).
   - List all active requests.
   - For each request, display a dropdown or button group representing the 9 timeline states:
     `submitted` -> `phone_confirming` -> `confirmed` -> `assigned` -> `on_the_way` -> `working` -> `completed` -> `paid` -> `feedback`.
   - Clicking a state should call `POST /api/admin/update-status` with the entered PIN. Show success/error toast notifications.

4. **Customer Tracking Page (`src/app/track/page.tsx`)**:
   - Read the `code` query parameter from the URL.
   - Fetch tracking data from `/api/requests?code=...` on mount and poll every 10 seconds.
   - Render the 9-step timeline dynamically:
     - Completed steps: Green/Active.
     - Current step: Pulsing/Active.
     - Future steps: Gray/Muted.
   - Display a simple history log (e.g., "Request Confirmed at 10:05 AM").

5. **Safety & Robustness**:
   - Do not modify `.env` or delete existing routes.
   - Ensure all database operations are wrapped in try/catch blocks to prevent crashes.
   - Keep the UI clean, modern, and aligned with the GOVO Express premium local service aesthetic.
```
