# Phase 3A Implementation Brief: Connecting Customer UI to Premium Trust Flow

This document outlines the precise implementation plan to connect the newly designed Phase 2 Customer UI (`/service-request`) to the existing backend request processing engine. This integration establishes the core transactional loop of the **GOVO Express Local Premium Trust OS v1** without breaking legacy routes, database schemas, or notification integrations.

---

## 1. Existing Request Flow Understanding

The current GOVO Express backend processes service requests through a lightweight, highly reliable pipeline designed to handle both persistent database storage and a zero-dependency mock mode (`GOVO_SKIP_DB=true`).

```
[Customer UI Form] 
       │
       ▼ (POST /api/requests)
┌────────────────────────────────────────────────────────┐
│ Backend Controller (requestController.js)              │
│  1. Validate Input Fields                              │
│  2. Check GOVO_SKIP_DB                                 │
│     ├─ TRUE: Generate Mock ID (e.g., "govo-req-XXXX")  │
│     └─ FALSE: Insert into PostgreSQL/SQLite DB         │
│  3. Trigger Telegram Admin Bot Notification            │
│  4. Return JSON Response { success: true, request }    │
└────────────────────────────────────────────────────────┘
```

### Key Constraints Preserved:
*   **Telegram Notifications:** The admin/operator notification payload must not be broken. Any new fields (like urgency or voice notes) must be appended gracefully to the notification text block.
*   **Database Safety:** No structural schema migrations are executed in this phase. Unmapped fields are safely serialized into existing text or JSON metadata columns.

---

## 2. Files Likely to Change

Depending on your repository layout, the following files are the primary targets for modification:

### Frontend (UI & Routing)
*   `src/pages/ServiceRequest.jsx` (or `src/components/ServiceRequestForm.jsx`): The customer-facing request form.
*   `src/pages/TrackRequest.jsx` (or `src/components/TrackRequest.jsx`): The request tracking shell.
*   `src/routes.jsx` (or `src/App.jsx`): Router configuration to handle `/service-request` and `/track/:id` (or `/track?id=...`).

### Backend (API & Controllers)
*   `server/controllers/requestController.js` (or equivalent): Handles incoming POST requests.
*   `server/routes/requestRoutes.js` (or equivalent): API endpoint definitions.
*   `server/services/telegramService.js` (or equivalent): Formats and sends Telegram notifications to operators.

---

## 3. Exact Implementation Steps

### Step 1: Form Submission & State Management
*   Update the `/service-request` form to capture all required fields in its local state.
*   Implement a loading state (`isSubmitting`) to disable the submit button and prevent double-submissions.
*   On submit, dispatch a `POST` request to `/api/requests` with the payload mapped exactly as defined in the **Data Mapping Plan** (Section 4).

### Step 2: Graceful Backend Field Processing
*   In the backend controller, extract the new fields (`urgency`, `voice_note_url`, `area`).
*   If the database schema does not support `urgency` or `area` as native columns, serialize them into the `note` or `metadata` field before saving (see Section 4).
*   Ensure that if `GOVO_SKIP_DB=true` is enabled, the backend still returns a fully populated mock request object with a generated ID.

### Step 3: Success Screen Transition
*   Upon a successful API response (`201 Created` or `200 OK`), transition the UI to a success state.
*   **Do not perform a hard redirect immediately.** Show an inline success card or a dedicated success view containing:
    *   The generated **Request ID** (e.g., `GOVO-6829-TX`).
    *   The initial status: **"Phone Confirming"** (or **"Received"**).
    *   A prominent **Tracking Link** pointing to `/track?id=...` or `/track/:id`.
    *   An **Operator Call/Support Link** utilizing the configured safe operator phone number.

### Step 4: 9-Step Status Timeline Implementation
*   Update the `/track` page to read the `id` from the URL path or query parameters.
*   Fetch the request status from `/api/requests/:id`.
*   Render a vertical or horizontal **9-Step Premium Trust Timeline** mapping the lifecycle of a high-touch local service:
    1.  **Submitted:** Request logged in system.
    2.  **Verifying:** Operator reviewing details / preparing callback.
    3.  **Confirmed:** Phone confirmation complete, details locked.
    4.  **Matching:** Selecting the optimal premium specialist.
    5.  **Assigned:** Specialist secured, contact details provided.
    6.  **En Route:** Specialist traveling to your location.
    7.  **In Progress:** Service being executed on-site.
    8.  **Quality Check:** Quality assurance review by operator.
    9.  **Settled:** Service completed, trust rating collected.
*   Highlight the active step based on the backend status value. Map legacy backend statuses to these 9 steps gracefully (e.g., `pending` maps to Step 2, `active` maps to Step 7).

### Step 5: Safe Environment Configuration
*   Define a fallback operator phone number in the frontend configuration (e.g., `process.env.REACT_APP_OPERATOR_PHONE` or a safe default like `+66-XX-XXX-XXXX` for local staging).
*   Never hardcode real personal phone numbers or admin credentials in the source code.

---

## 4. Data Mapping Plan

To avoid database schema breakages, use the following mapping strategy:

| Frontend Form Field | Backend Payload Key | Database Column (Standard) | Fallback Strategy (If Column Missing) |
| :--- | :--- | :--- | :--- |
| **Name** | `name` | `name` (VARCHAR) | N/A (Required) |
| **Mobile** | `mobile` | `mobile` (VARCHAR) | N/A (Required) |
| **Area** | `area` | `area` (VARCHAR) | Prepend to `address`: `"[Area: South] Address..."` |
| **Need / Service Type** | `service_type` | `service_type` (VARCHAR) | Map to `title` or `category` |
| **Voice / Note** | `note` | `note` (TEXT) | Map to `description` |
| **Address / Location** | `address` | `address` (TEXT) | Map to `location` |
| **Urgent / Normal** | `urgency` | `urgency` (VARCHAR) | Prepend to `note`: `"[URGENT] " + note` |

### Telegram Notification Payload Formatting:
When formatting the message for the Telegram channel, append the new fields clearly:
```text
🚨 NEW PREMIUM REQUEST Received!
----------------------------------
ID: GOVO-9821
Name: Jane Doe
Mobile: +66 81 234 5678
Urgency: 🔴 URGENT
Area: Phrom Phong
Service: AC Repair
Address: Sukhumvit Soi 24, Apt 4B
Notes: "Water leaking from the main unit. Please call before arrival."
----------------------------------
[Action: Confirm Request via Admin Panel]
```

---

## 5. Test Checklist

Execute these tests locally before proposing any staging deployment:

- [ ] **Form Submission (DB Mode):** Submit the form with `GOVO_SKIP_DB=false`. Verify the record is written to the database with all fields mapped.
- [ ] **Form Submission (Skip DB Mode):** Submit the form with `GOVO_SKIP_DB=true`. Verify a mock request object is returned and the UI transitions to the success screen seamlessly.
- [ ] **Field Preservation:** Verify that `urgency` and `area` are successfully captured and visible in the database or prepended to the notes.
- [ ] **Telegram Dispatch:** Verify that the Telegram notification triggers and displays the formatted urgency and area fields without throwing errors.
- [ ] **Success Screen Verification:** Verify the success screen displays the correct Request ID, status, and tracking link.
- [ ] **Tracking Timeline:** Navigate to `/track?id=[ID]` and verify that the 9-step timeline renders correctly, highlighting the active step matching the request's current status.
- [ ] **Operator Link:** Verify the "Call Operator" button points to the value configured in the environment variables, falling back safely if undefined.

---

## 6. Rollback Checklist

If the integration causes issues in the local test container, execute these steps to restore stability:

1.  **Frontend Rollback:** Revert the route mapping in `src/routes.jsx` to point `/service-request` back to the Phase 1 legacy form component.
2.  **Backend Rollback:** Revert changes in `server/controllers/requestController.js` using git:
    ```bash
    git checkout HEAD -- server/controllers/requestController.js
    ```
3.  **Verify Legacy Flow:** Submit a request using the legacy form to ensure Telegram notifications and database writes function exactly as they did pre-Phase 3A.

---

## 7. Exact Codex / Cursor Coding Prompt

Copy and paste the following prompt into your AI coding assistant to execute this phase:

```markdown
You are an expert full-stack engineer implementing Phase 3A of the GOVO Express Local Premium Trust OS v1.
Your task is to connect the new customer UI form (`/service-request`) to the existing backend request creation logic safely, without breaking legacy behavior, database schemas, or Telegram notifications.

### Scope of Work:

1. **Frontend Form Integration (`/service-request`):**
   - Bind the form fields (`name`, `mobile`, `area`, `service_type`, `note`, `address`, `urgency`) to the component state.
   - On submit, send a POST request to `/api/requests`.
   - Handle loading states (`isSubmitting`) and error states gracefully.

2. **Backend Controller Updates:**
   - In the request creation controller, accept the new fields: `area` and `urgency`.
   - **Database Safety:** If the database schema does not have explicit columns for `area` or `urgency`, do not run database migrations. Instead, safely append them to the `note` or `address` fields (e.g., `note = \`[\${urgency.toUpperCase()}] \${note}\`` and `address = \`[\${area}] \${address}\``) or store them in a JSON `metadata` column if it exists.
   - Ensure `GOVO_SKIP_DB=true` behavior remains fully intact. If active, generate a mock request object containing these fields and return a mock ID (e.g., `govo-req-XXXX`).

3. **Telegram Notification Formatting:**
   - Update the Telegram notification service to include the `urgency` (use emojis: 🔴 for Urgent, ⚪ for Normal) and `area` fields in the message sent to operators. Do not break the existing notification dispatch logic.

4. **Success Screen Implementation:**
   - Upon successful submission, display an inline success card or transition the page view to show:
     - Request ID (e.g., `GOVO-1234-TX`)
     - Current Status: "Phone Confirming"
     - A tracking link pointing to `/track?id=GOVO-1234-TX`
     - A "Call Operator" button linking to a phone number configured via `process.env.REACT_APP_OPERATOR_PHONE` (fallback: `+66-XX-XXX-XXXX`). Do not hardcode real secrets.

5. **Tracking Page Timeline (`/track`):**
   - Update the tracking page to read the request ID from the URL path (`/track/:id`) or query parameters (`/track?id=...`).
   - Fetch the request status from the backend.
   - Render a highly polished 9-step vertical or horizontal timeline representing the Premium Trust lifecycle:
     1. Submitted (Request logged)
     2. Verifying (Operator reviewing details)
     3. Confirmed (Phone confirmation complete)
     4. Matching (Selecting local specialist)
     5. Assigned (Specialist secured)
     6. En Route (Specialist traveling)
     7. In Progress (Service active on-site)
     8. Quality Check (Operator review)
     9. Settled (Completed & rated)
   - Map the backend status to highlight the correct active step on this timeline.

### Safety Guardrails:
- Do not modify or delete any existing routes or legacy fallback paths.
- Do not edit `.env` files directly or expose any real API keys, tokens, or operator phone numbers in the codebase.
- Ensure all code is modular, clean, and fully compatible with local test containers.
- Write clean, self-documenting code.
```
