# Phase 4A Implementation Brief: Read-Only Hidden Operator/Admin Dispatch Inbox

This document outlines the safe, low-risk implementation plan for **Phase 4A** of the GOVO Express Local Premium Trust OS v1. This phase introduces a read-only, hidden operator/admin dispatch inbox to monitor incoming requests in real-time without introducing write risks, database schema modifications, or public-facing navigation changes.

---

## 1. Existing Route Understanding

To ensure zero disruption to the existing system, we map the new route relative to the current Phase 3B architecture:

*   **Public/Customer Routes (Unchanged):**
    *   `/` (Request creation / landing)
    *   `/track/[id]` or `/request/status/[id]` (Phase 3B tracking page)
*   **Existing Admin Routes (Unchanged & Untouched):**
    *   `/admin/login` or `/admin/auth` (Existing PIN/cookie verification)
    *   `/admin/service-requests` (Existing management view - *do not modify or replace*)
*   **New Route (Phase 4A):**
    *   `/admin/dispatch` (Hidden, read-only operator console)
    *   *Access Control:* Must check the existing admin cookie/session or PIN state. If unauthorized, redirect to the existing admin login page.

---

## 2. Files Likely to Change

To keep the blast radius minimal, we will only **create** new files or make **additive, non-breaking** changes to existing routing/middleware.

### New Files to Create:
1.  `src/app/admin/dispatch/page.tsx` (or `pages/admin/dispatch.tsx` depending on your Next.js directory structure): The main read-only dashboard view.
2.  `src/components/admin/DispatchCard.tsx`: A high-density, read-only UI component representing a single service request.

### Existing Files to Modify (Additive Only):
1.  `src/middleware.ts` (or your route protection file): Ensure `/admin/dispatch` is included in the admin authentication/cookie check path.
2.  `src/lib/store.ts` (or your in-memory database file): Export a read-only getter (e.g., `getInMemoryRequests()`) if not already exposed, to support `GOVO_SKIP_DB=1` mode.

---

## 3. Exact Safe UI Plan

The `/admin/dispatch` page is designed for high-density operator monitoring. It must look professional, clean, and operate purely as a read-only dashboard.

```
+------------------------------------------------------------------------------------+
| GOVO Express | OPERATOR DISPATCH CONSOLE (READ-ONLY)               [Logged In]     |
+------------------------------------------------------------------------------------+
| Filters: [ All ] [ Urgent ] [ Pending ] [ Active ]               Search: [_______] |
+------------------------------------------------------------------------------------+
| +-----------------------------------------+ +------------------------------------+ |
| | REQ-9821-XM               [ URGENT ]    | | REQ-9820-AA             [ NORMAL ] | |
| | Status: Pending                         | | Status: In-Progress                  | |
| | Customer: Jane Doe (555-0199)           | | Customer: John Smith (555-0144)      | |
| | Area: Downtown                          | | Area: West End                       | |
| | Category: Premium Courier               | | Category: Document Delivery          | |
| | Note: "Deliver medical docs by 4 PM"    | | Note: "Leave at front desk"          | |
| | Address: 123 Main St, Apt 4B            | | Address: 789 Oak Ave                 | |
| | Created: 10 mins ago                    | | Created: 45 mins ago                 | |
| |                                         | |                                      | |
| | [ View Live Customer Tracking Page ] -> | | [ View Live Customer Tracking Page ]->| |
| +-----------------------------------------+ +------------------------------------+ |
+------------------------------------------------------------------------------------+
```

### UI Specifications:
*   **Layout:** Responsive CSS Grid / Flexbox. High-density cards.
*   **Visual Indicators:**
    *   `Urgent` priority marked with a soft red/amber badge.
    *   `Normal` priority marked with a neutral gray/blue badge.
*   **No Action Buttons:** No "Assign Driver", "Change Status", or "Delete" buttons are rendered in this phase.
*   **Tracking Link:** A direct link that opens the customer-facing tracking page (`/track/[id]`) in a new tab, allowing operators to see exactly what the customer sees.

---

## 4. Test Checklist

### Test Environment 1: `GOVO_SKIP_DB=1` (In-Memory Mode)
- [ ] Start the application with `GOVO_SKIP_DB=1`.
- [ ] Create 2-3 mock service requests via the customer landing page.
- [ ] Navigate to `/admin/dispatch` without logging in. Verify you are redirected to the admin login/PIN page.
- [ ] Log in as an admin, then navigate to `/admin/dispatch`.
- [ ] Verify all created mock requests appear in the dispatch console with correct details (ID, Name, Mobile, Area, Category, Note, Address, Priority, Status, Created Time).
- [ ] Click the "View Live Customer Tracking Page" link and verify it opens the correct tracking view in a new tab.
- [ ] Verify there are no interactive buttons that attempt to write to the store.

### Test Environment 2: Real DB Mode (`GOVO_SKIP_DB=0` or undefined)
- [ ] Start the application connected to the staging database.
- [ ] Verify `/admin/dispatch` queries the database using the existing read-only Prisma/ORM queries.
- [ ] Verify no write operations, migrations, or schema updates are triggered.

---

## 5. Rollback Checklist

If any issues arise during deployment or testing, execute these rollback steps:

1.  **Revert Code Changes:**
    ```bash
    git checkout main
    git checkout -b rollback-phase-4a
    # Remove the newly created files
    git rm -rf src/app/admin/dispatch
    git rm -f src/components/admin/DispatchCard.tsx
    # Revert modifications to middleware or store files
    git checkout HEAD -- src/middleware.ts src/lib/store.ts
    git commit -m "revert: rollback Phase 4A dispatch inbox"
    git push origin rollback-phase-4a
    ```
2.  **Verify Zero DB Impact:** Since Phase 4A contains **no database writes or schema migrations**, rolling back the code immediately restores the system to its exact Phase 3B state with zero risk of data corruption or orphaned records.

---

## 6. Exact Codex / Cursor Prompt

Copy and paste the following prompt into your AI assistant/Cursor to generate the implementation safely:

```markdown
You are an expert software engineer working on GOVO Express Local Premium Trust OS v1.
We are implementing Phase 4A: a read-only, hidden operator/admin dispatch inbox.

Strict Safety Rules:
1. Do NOT modify, write to, or migrate the database.
2. Do NOT add any write operations, status updates, or assignment logic.
3. Do NOT modify or replace existing admin routes like `/admin/service-requests`.
4. Do NOT modify `.env`, secrets, or API keys.
5. Keep `GOVO_SKIP_DB` test mode fully intact.

Instructions:
1. Create a new Next.js page at `src/app/admin/dispatch/page.tsx` (or the equivalent path for your project structure).
2. Protect this route using the existing admin authentication/cookie check. If unauthorized, redirect to the existing admin login page.
3. This page must fetch and display all active service requests.
   - If `GOVO_SKIP_DB=1`, read directly from the existing in-memory request store.
   - If in real DB mode, use the existing read-only query logic to fetch requests.
4. Render a high-density, clean dashboard of request cards. Each card must display:
   - Request ID/code
   - Customer name
   - Mobile number
   - Area / Neighborhood
   - Need / Category
   - Note / Voice transcription text
   - Full address
   - Priority (Urgent vs Normal)
   - Current status
   - Created timestamp
   - A link to the customer-facing tracking page (e.g., `/track/[id]` or `/request/status/[id]`) opening in a new tab.
5. Do NOT include any buttons or controls that modify data (no "Assign", "Complete", "Delete", or "Edit" buttons).
6. Ensure this route is completely hidden from public navigation headers and footers.

Generate the clean, production-ready code for the new page and components.
```
