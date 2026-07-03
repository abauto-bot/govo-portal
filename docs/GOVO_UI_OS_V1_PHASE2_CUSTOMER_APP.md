# GOVO Express Local Premium Trust OS v1
## Phase 2 Implementation Brief: Customer-Facing App UI

This document outlines the exact implementation plan to build the customer-facing frontend screens for GOVO Express. The design system leverages a **Local Premium Trust OS** aesthetic: Deep Emerald, Charcoal Black, Ivory White, and Subtle Gold. It is mobile-first, Bangla-first, and optimized for low-literacy or high-speed actions using **Tap + Voice + Call** paradigms.

---

## 1. Customer App Route Plan

All customer-facing routes will live under the `/app` path. These routes must be responsive, mobile-first (constrained to a maximum width of `md:max-w-md` centered on desktop screens to simulate a native app feel), and highly performant.

```
/app
 ├── page.tsx                 # Customer Home (Headline, 3 Main Actions, 8 Category Cards)
 ├── request/
 │    └── page.tsx            # Unified Request Entry Form (Text, Voice, Category Pre-fill)
 ├── track/
 │    └── [requestId]/
 │         └── page.tsx       # Real-time Status Tracking (9-stage visual timeline)
 └── support/
      └── page.tsx            # Operator Call & Direct Support UI
```

---

## 2. Component Plan

To maintain the **Local Premium Trust OS** design system, we will build/refactor the following reusable UI components:

### A. `VoiceRecorderShell`
*   **Visuals**: A large, pulsing gold/emerald record button with a simulated waveform.
*   **UX**: Tap-to-record, visual timer, tap-to-stop, play/delete preview, and auto-attach to the request form.
*   **Fallback**: If microphone permissions are denied, gracefully transition to a text-only input with a clear Bangla helper message.

### B. `CategoryCard`
*   **Visuals**: Ivory background (`#fdfbf7`), deep emerald borders (`#064e3b`), subtle gold accents (`#d97706`), and large, clear icons.
*   **UX**: High-contrast active states, minimum tap target of `56px` for easy thumb access.

### C. `StatusStepper`
*   **Visuals**: A vertical or horizontal high-density timeline representing the 9 lifecycle stages.
*   **UX**: Color-coded nodes:
    *   *Completed/Past*: Deep Emerald with checkmarks.
    *   *Current Active*: Pulsing Gold.
    *   *Upcoming*: Muted Charcoal/Gray.

### D. `QuickCallButton`
*   **Visuals**: Floating or prominent sticky button in Deep Emerald with a gold phone icon.
*   **UX**: Triggers native `tel:01XXXXXXXXX` protocol with an overlay showing the assigned operator's name and photo.

---

## 3. UI Copy (Bangla-First)

| Element / Screen | Bangla Copy (Primary) | English Subtext (Secondary) |
| :--- | :--- | :--- |
| **Home Headline** | “কি লাগবে আপনার?” | "What do you need?" |
| **Action 1 (Voice)** | 🎙️ ভয়েসে বলুন | "Speak your request" |
| **Action 2 (Write)** | ✍️ লিখে request দিন | "Write your request" |
| **Action 3 (Call)** | 📞 Operator-কে call করুন | "Call our Operator" |
| **Category 1** | 🛒 বাজার লাগবে | "Need Groceries" |
| **Category 2** | 📦 পণ্য পাঠাতে চাই | "Send a Parcel" |
| **Category 3** | 🧹 বাসায় কাজ লাগবে | "Home Help / Cleaning" |
| **Category 4** | 🩺 ডাক্তারের support | "Doctor / Medical Support" |
| **Category 5** | 💊 ঔষধ লাগবে | "Need Medicine" |
| **Category 6** | 🏠 ঘরের/পরিবারের কাজ | "Household Chores" |
| **Category 7** | 🌾 কৃষি/মাঠের কাজ | "Agricultural / Field Work" |
| **Category 8** | 🚨 জরুরি সাহায্য | "Emergency Assistance" |
| **Form - Name** | আপনার নাম | "Your Name" |
| **Form - Mobile** | মোবাইল নম্বর | "Mobile Number" |
| **Form - Area** | আপনার এলাকা | "Your Area" |
| **Form - Details** | কী দরকার খুলে লিখুন | "What do you need? Describe here" |
| **Form - Priority** | জরুরি? (হ্যাঁ / না) | "Is it urgent? (Yes / No)" |
| **Form - Submit** | রিকোয়েস্ট পাঠান | "Send Request" |

---

## 4. Exact Files to Create / Modify

```bash
# 1. Layout & Theme Config
tailwind.config.js               # Verify Deep Emerald, Charcoal, Ivory, and Gold color tokens are present

# 2. Customer App Pages
src/app/app/page.tsx             # Customer Home Screen
src/app/app/request/page.tsx     # Unified Request Entry Form
src/app/app/track/[id]/page.tsx  # Real-time Status Tracking Screen
src/app/app/support/page.tsx     # Operator Call & Direct Support Screen

# 3. Shared Customer Components
src/components/customer/VoiceRecorder.tsx
src/components/customer/CategoryGrid.tsx
src/components/customer/StatusStepper.tsx
src/components/customer/Header.tsx
```

---

## 5. Risk Checklist

- [ ] **Microphone Permissions**: Ensure the app does not crash if the user denies microphone access. Provide an immediate, friendly text-input fallback.
- [ ] **State Preservation**: If a user records a voice note and then switches to typing, ensure the recorded audio is not lost.
- [ ] **No Backend Disruption**: Do not modify existing database schemas or API endpoints. Use local state or mock APIs for UI transitions if backend integration is not fully ready.
- [ ] **Mobile Responsiveness**: Ensure the layout is locked to a maximum width of `480px` (`max-w-md`) and centered on desktop screens to preserve the premium mobile app experience.
- [ ] **Zero Secret Exposure**: Do not touch `.env`, `.env.local`, or any API keys.

---

## 6. Test Checklist

- [ ] **Visual Audit**: Verify the color palette matches:
  - Deep Emerald: `bg-emerald-900` / `text-emerald-900` / `#064e3b`
  - Subtle Gold: `bg-amber-500` / `text-amber-600` / `#d97706`
  - Ivory/White: `bg-stone-50` / `#fdfbf7`
  - Charcoal: `bg-stone-900` / `text-stone-900`
- [ ] **Accessibility**: Ensure all buttons have a minimum height/width of `48px` (preferably `56px` for primary actions).
- [ ] **Language Toggle**: Verify that Bangla is the default, highly visible font, with English subtext styled in a smaller, muted font size.
- [ ] **Form Validation**: Ensure "মোবাইল নম্বর" (Mobile Number) accepts only valid Bangladeshi formats (e.g., `01XXXXXXXXX`).
- [ ] **Tracking Flow**: Manually cycle through all 9 tracking states to ensure the `StatusStepper` renders correctly without layout shifts.

---

## 7. Exact Coding Prompt for Codex / Cursor

Copy and paste the prompt below into your AI coding assistant to generate the complete customer-facing UI.

```markdown
You are a world-class senior UI/UX designer and frontend architect for GOVO Express. Your task is to implement Phase 2: Customer-Facing App UI. 

### Design System (Local Premium Trust OS):
- Primary Color: Deep Emerald (Tailwind `emerald-950` / `#022c22` or `emerald-900` / `#064e3b`)
- Accent Color: Subtle Gold (Tailwind `amber-500` / `#f59e0b` or `amber-600` / `#d97706`)
- Backgrounds: Ivory/White (Tailwind `stone-50` / `#fdfbf7` or `stone-100`)
- Text/Dark Accents: Charcoal/Black (Tailwind `stone-900` / `#1c1917`)
- Typography: Bangla-first, bold, highly readable, with smaller English subtext.
- Layout: Mobile-first. Force a maximum width of `max-w-md` centered on the screen (`mx-auto`) with a beautiful subtle shadow to simulate a premium mobile app on desktop viewports.

### Scope of Work:

1. Create `src/components/customer/Header.tsx`:
   - A premium header with a deep emerald background, a subtle gold border at the bottom, the GOVO Express logo, and a quick-access "📞 Operator-কে কল করুন" button.

2. Create `src/app/app/page.tsx` (Customer Home):
   - Top Headline: "কি লাগবে আপনার?" (What do you need?) in large, bold font.
   - Main 3 Quick Actions (Stacked or prominent grid):
     1. 🎙️ ভয়েসে বলুন (Pulsing gold border, opens voice recorder modal/drawer)
     2. ✍️ লিখে request দিন (Deep emerald background, routes to `/app/request`)
     3. 📞 Operator-কে call করুন (Initiates native call to a mock operator number)
   - Category Grid (8 Cards, 2-column layout):
     - Cards: 🛒 বাজার লাগবে, 📦 পণ্য পাঠাতে চাই, 🧹 বাসায় কাজ লাগবে, 🩺 ডাক্তারের support, 💊 ঔষধ লাগবে, 🏠 ঘরের/পরিবারের কাজ, 🌾 কৃষি/মাঠের কাজ, 🚨 জরুরি সাহায্য.
     - Clicking any card routes to `/app/request` with the category pre-selected.

3. Create `src/app/app/request/page.tsx` (Unified Request Entry Form):
   - Fields:
     - নাম (Name) - Input text
     - মোবাইল (Mobile) - Input tel (validated for Bangladeshi numbers)
     - এলাকা (Area) - Dropdown or text input
     - কী দরকার (What is needed) - Text area
     - Voice Note Attachment - Shows a visual waveform if audio is recorded, with a delete/re-record option.
     - address/location - Text input
     - Priority - Toggle switch between "জরুরি (Urgent)" and "স্বাভাবিক (Normal)"
   - Submit Button: Large, full-width Deep Emerald button with gold text: "রিকোয়েস্ট পাঠান" (Send Request). On submit, redirect to `/app/track/mock-id-123`.

4. Create `src/components/customer/VoiceRecorder.tsx`:
   - A beautiful, interactive component. When active, it displays a pulsing gold microphone icon and a simulated CSS waveform.
   - Includes "শুনুন" (Play), "মুছুন" (Delete), and "নিশ্চিত করুন" (Confirm) buttons.

5. Create `src/app/app/track/[id]/page.tsx` (Real-time Status Tracking):
   - Displays a summary of the request.
   - Implements a vertical timeline showing all 9 tracking statuses:
     1. Received (গৃহীত হয়েছে)
     2. Phone Confirming (ফোনে নিশ্চিত করা হচ্ছে)
     3. Confirmed (নিশ্চিত করা হয়েছে)
     4. Assigned (কর্মী নিয়োজিত করা হয়েছে)
     5. On the way (কর্মী রওনা দিয়েছে)
     6. Working (কাজ চলছে)
     7. Completed (কাজ সম্পন্ন)
     8. Paid (পেমেন্ট সম্পন্ন)
     9. Feedback (মতামত দিন)
   - Use color-coding: Completed steps are Deep Emerald, the active step is pulsing Gold, and future steps are muted Charcoal/Gray.
   - Include a sticky bottom bar: "কোনো সমস্যা? অপারেটরকে কল দিন" (Any problem? Call Operator) linking to `/app/support`.

6. Create `src/app/app/support/page.tsx` (Operator Call & Direct Support):
   - A clean, reassuring screen featuring a mock operator profile (photo, name: "রহমান ভাই - সিনিয়র অপারেটর").
   - A massive, glowing green/gold button: "সরাসরি কল করুন" (Call Directly).
   - Reassuring copy: "আপনার সেবা নিশ্চিত করতে আমাদের অপারেটর আপনাকে ২ মিনিটের মধ্যে কল করবেন।" (To confirm your service, our operator will call you within 2 minutes.)

### Technical Constraints:
- Use Tailwind CSS for all styling.
- Ensure all interactive elements have a minimum tap target of `48px` (preferably `56px`).
- Do not modify any backend business logic, database schemas, or environment variables.
- Use local React state (`useState`, `useEffect`) to manage form inputs, active recording states, and step transitions.
- Ensure the code is clean, fully typed with TypeScript, and ready for immediate integration.
```
