# Phase 4A Implementation Brief: Read-Only Hidden Operator/Admin Dispatch Inbox

This document outlines the implementation plan for Phase 4A of the GOVO Express Local Premium Trust OS v1. This phase introduces a read-only, hidden operator/admin dispatch inbox designed to give operators real-time visibility into incoming service requests without introducing database write risks or altering existing admin workflows.

---

## 1. Existing Route Understanding

To ensure zero disruption to the live system, we map the new route relative to the existing architecture:

*   **Existing Admin Route:** `/admin/service-requests` (or similar legacy admin views). This remains completely untouched.
*   **New Route:** `/admin/dispatch` (or `/admin/dispatch/page.tsx` in Next.js App Router). This is a brand-new, isolated route.
*   **Authentication/Authorization:** The route must hook into the existing admin authentication mechanism (e.g., checking for an admin session cookie, JWT, or PIN verification state). If the user is not authenticated as an admin, they are redirected to the existing admin login page.
*   **Data Source:** 
    *   **`GOVO_SKIP_DB=1` (Mock Mode):** Reads directly from the in-memory request/status store established in Phase 3B.
    *   **Real DB Mode:** Reuses existing read-only Prisma/SQL queries or API endpoints that fetch active service requests, without executing any update, insert, or delete operations.

---

## 2. Files Likely to Change

To maintain a strict "no-blast-radius" policy, we only create new files or make additive, non-breaking modifications:

### New Files (Safe Isolation)
1.  **`app/admin/dispatch/page.tsx`** (or `pages/admin/dispatch.tsx` depending on framework structure): The main React component for the read-only dispatch inbox.
2.  **`app/api/admin/dispatch/route.ts`** (or equivalent API endpoint): A read-only API route that fetches the list of requests.

### Existing Files (Additive/Refactoring Only)
3.  **`middleware.ts`** (or your routing/auth guard file): Ensure the `/admin/dispatch` path is covered by the same auth guards as `/admin/service-requests`.
4.  **`src/lib/store.ts`** (or your Phase 3B in-memory store file): Expose a read-only getter function (e.g., `getRequests()`) if not already public.

---

## 3. Exact Safe UI Plan

The UI is designed for high-density, rapid-scanning operator workflows. It is completely read-only—no buttons to assign, edit, or delete are rendered.

```
+------------------------------------------------------------------------------------+
| [GOVO Operator Dispatch] (Read-Only)               [Auto-Refresh: ON (10s)] [Sync] |
+------------------------------------------------------------------------------------+
| Filters: [ All ] [ Urgent Only ] [ Pending ] [ In-Progress ]                       |
+------------------------------------------------------------------------------------+
| +--------------------------------------------------------------------------------+ |
| | REQ-9821 | URGENT | Status: PENDING | Created: 2 mins ago                      | |
| | Customer: Jane Doe (+1 555-0199)                                               | |
| | Area: Downtown Core | Address: 456 Maple St, Apt 4B                            | |
| | Need: Emergency Plumbing                                                       | |
| | Note: "Water pipe burst in kitchen, need immediate assistance."                | |
| | [Copy Tracking Link]                                                           | |
| +--------------------------------------------------------------------------------+ |
| +--------------------------------------------------------------------------------+ |
| | REQ-9820 | NORMAL | Status: ASSIGNED | Created: 15 mins ago                    | |
| | Customer: John Smith (+1 555-0142)                                             | |
| | Area: West End | Address: 789 Oak Rd                                           | |
| | Need: Electrical Inspection                                                    | |
| | Note: "Flickering lights in hallway."                                          | |
| | [Copy Tracking Link]                                                           | |
| +--------------------------------------------------------------------------------+ |
+------------------------------------------------------------------------------------+
```

### UI Specifications:
*   **High-Contrast Status Badges:** 
    *   `URGENT`: Red background, white text.
    *   `NORMAL`: Gray background, dark text.
    *   `PENDING`: Yellow badge.
    *   `ASSIGNED` / `IN-PROGRESS`: Blue badge.
*   **Information Density:** Compact padding, clear typography, and structured key-value pairs for rapid reading.
*   **Interactive Utilities:**
    *   **Copy Tracking Link Button:** Copies the public tracking URL (from Phase 3B) to the operator's clipboard with a temporary "Copied!" visual confirmation.
    *   **Search/Filter Bar:** Client-side filtering by Customer Name, Phone, Area, or Category.
    *   **Auto-Refresh Indicator:** A visual indicator showing a countdown to the next auto-fetch (default: 15 seconds) to keep the screen fresh without manual intervention.

---

## 4. Test Checklist

Before declaring Phase 4A complete, verify the following behaviors:

- [ ] **Access Control:** Navigating to `/admin/dispatch` without an active admin session/cookie redirects to the admin login page.
- [ ] **Hidden Navigation:** Verify that no public-facing header, footer, or customer dashboard links to `/admin/dispatch`.
- [ ] **Mock Mode Verification:** Set `GOVO_SKIP_DB=1`. Submit a request via the customer flow (Phase 3A/B) and verify it immediately appears in the `/admin/dispatch` inbox.
- [ ] **Real DB Mode Verification:** Set `GOVO_SKIP_DB=0`. Verify that the page loads existing requests from the database without throwing schema or connection errors.
- [ ] **Read-Only Enforcement:** Confirm there are absolutely no input fields, dropdowns, or buttons that trigger `POST`, `PUT`, `PATCH`, or `DELETE` requests to update status, assign providers, or modify request details.
- [ ] **Clipboard Action:** Clicking "Copy Tracking Link" successfully copies the correct URL format (e.g., `/track/[id]`) to the clipboard.

---

## 5. Rollback Checklist

If any unexpected issues arise during deployment or testing, execute these rollback steps:

1.  **Route Deletion:** Delete the `app/admin/dispatch` directory (or rename it to `_dispatch` to disable routing).
2.  **API Deletion:** Delete the `app/api/admin/dispatch` directory.
3.  **Middleware Reversion:** Revert any changes made to `middleware.ts` or auth wrappers.
4.  **Verification:** Confirm that navigating to `/admin/dispatch` returns a `404 Not Found` and that the core customer request flow remains fully functional.

---

## 6. Exact Codex / Cursor Prompt

Copy and paste the following prompt into your AI coding assistant to generate the implementation:

```markdown
You are implementing Phase 4A: Read-Only Hidden Operator/Admin Dispatch Inbox for GOVO Express.

Strict Safety Rules:
1. Do not write to any database. No updates, no inserts, no deletes.
2. Do not modify or delete existing admin routes (e.g., /admin/service-requests).
3. Do not modify .env, secrets, or database schemas.
4. Keep GOVO_SKIP_DB test mode fully intact.

Task Instructions:

1. Create a new Next.js route at `app/admin/dispatch/page.tsx` (or the equivalent path for your project structure).
2. Protect this route using the existing admin authentication system (check for admin cookies/session). If unauthorized, redirect to the existing admin login page.
3. Create a read-only API endpoint at `app/api/admin/dispatch/route.ts` that:
   - Checks admin authentication.
   - If GOVO_SKIP_DB=1, reads requests from the existing in-memory store created in Phase 3B.
   - If GOVO_SKIP_DB=0, queries the database using existing read-only queries to fetch active service requests.
4. Build a high-density, clean UI for the dispatch inbox displaying request cards with the following fields:
   - Request ID/Code
   - Customer Name
   - Mobile Number
   - Area
   - Need/Category
   - Note/Voice text transcription
   - Address
   - Priority (Urgent vs Normal)
   - Current Status
   - Created Time (formatted relative to now, e.g., "3 mins ago")
   - A "Copy Tracking Link" button that copies the public tracking URL (e.g., `/track/[id]`) to the clipboard.
5. Add client-side filtering/sorting:
   - Filter by Priority (All, Urgent)
   - Filter by Status
   - Search by Customer Name, Phone, or Area
   - Sort by Created Time (newest first)
6. Add a safe client-side polling mechanism (every 15 seconds) to auto-refresh the list without page reloads.
7. Ensure there are absolutely no interactive elements that allow changing status, assigning providers, or editing data.

Double-check that no public navigation links point to this route. It must remain hidden and accessible only via direct URL entry for authorized admins.
```
