# GOVO Express: Local Premium Trust OS (v1)
## Phase 1 Implementation Brief: Shared UI Foundation

This document serves as the architectural blueprint and implementation specification for **Phase 1** of the GOVO Express "Local Premium Trust OS" design system. 

Our goal is to establish a premium, high-trust, Bangla-first, mobile-first visual identity. This phase focuses entirely on building the shared UI foundation without altering existing business logic, database schemas, or routing structures.

---

## 1. Component Architecture

The UI foundation is built on a **Mobile-First Layout Shell** limited to a maximum width of `480px` (centered on desktop screens) to mimic a native application experience.

```
┌────────────────────────────────────────────────────────┐
│                   12. MOBILE SHELL                     │
│ ┌────────────────────────────────────────────────────┐ │
│ │                  2. GOVO HEADER                    │ │
│ ├────────────────────────────────────────────────────┤ │
│ │                                                    │ │
│ │  6. TRUST BADGE [ ১০০% নিরাপদ ]                     │ │
│ │                                                    │ │
│ │  5. CATEGORY CARD (Grid)                           │ │
│ │  ┌──────────────────┐  ┌──────────────────┐        │ │
│ │  │ 📦 পার্সেল ডেলিভারি │  │ 🛒 বাজার-সদাই     │        │ │
│ │  └──────────────────┘  └──────────────────┘        │ │
│ │                                                    │ │
│ │  8. REQUEST CARD                                   │ │
│ │  ┌──────────────────────────────────────────────┐  │ │
│ │  │ ID: #GV-9082  [ 7. STATUS CHIP: চলমান ]       │ │
│ │  │ গন্তব্য: ধানমন্ডি ৩২                             │ │
│ │  │ 4. CTA BUTTON [ বিস্তারিত দেখুন ]             │ │
│ │  └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │  13. VOICE REQUEST ENTRY (Sticky/Floating)         │ │
│ │  ┌──────────────────────────────────────────────┐  │ │
│ │  │  🎙️ ট্যাপ করে বলুন (Tap to Speak)              │ │
│ │  └──────────────────────────────────────────────┘  │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────┐ │
│ │          3. ROLE-BASED BOTTOM NAVIGATION           │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 2. CSS & Theme Plan (Tailwind CSS)

To achieve the **Local Premium Trust** aesthetic, we extend the Tailwind configuration with custom design tokens. The color palette blends deep Islamic/Bengali emerald green with premium ivory, charcoal, and warm gold accents.

### Tailwind Configuration Extension (`tailwind.config.js`)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        govo: {
          emerald: {
            50: '#F0F7F4',
            100: '#DCECE5',
            600: '#0B6646', // Primary Brand Color
            700: '#094F39', // Deep Emerald (Trust/Authority)
            800: '#063B2B', // Dark Emerald
            900: '#03241B', // Deepest Emerald
          },
          charcoal: {
            800: '#1E2221', // Soft Black for text
            900: '#121414', // Deep Charcoal for backgrounds
          },
          ivory: {
            50: '#FDFDF9',  // Premium Light Background
            100: '#F5F5EE', // Card Background
            200: '#EBEBE0', // Subtle Borders
          },
          gold: {
            100: '#FDF8EB', // Soft Gold BG
            500: '#D4AF37', // Accent Gold
            600: '#C5A059', // Darker Gold for text readability
          }
        }
      },
      fontFamily: {
        bangla: ['Hind Siliguri', 'Noto Serif Bengali', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'premium': '1.25rem', // 20px for cards
        'cta': '3rem',        // Fully rounded pill buttons
      },
      boxShadow: {
        'premium-sm': '0 2px 8px rgba(9, 79, 57, 0.04)',
        'premium-md': '0 8px 24px rgba(9, 79, 57, 0.08)',
        'premium-lg': '0 16px 32px rgba(9, 79, 57, 0.12)',
      }
    },
  },
}
```

### Global CSS Variables (`globals.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-bangla: 'Hind Siliguri', sans-serif;
  --font-sans: 'Inter', sans-serif;
}

body {
  font-family: var(--font-bangla);
  background-color: #121414; /* Desktop backdrop */
  color: #1E2221;
  -webkit-tap-highlight-color: transparent;
}

/* Premium smooth scroll & tap optimizations */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #0B6646;
  border-radius: 10px;
}
```

---

## 3. File & Folder Plan

All Phase 1 assets will live under a dedicated `govo-ui` directory to prevent namespace pollution and ensure zero-friction rollbacks.

```
src/
└── components/
    └── govo-ui/
        ├── index.ts                 # Central export file
        ├── tokens.ts                # Theme constants & helper classes
        │
        ├── layout/
        │   ├── MobileShell.tsx      # 12. Mobile-first layout shell
        │   ├── Header.tsx           # 2. GOVO Header
        │   └── BottomNav.tsx        # 3. Role-based bottom navigation
        │
        ├── feedback/
        │   ├── EmptyState.tsx       # 9. Empty state
        │   ├── LoadingState.tsx     # 10. Skeleton loader
        │   └── ErrorState.tsx       # 11. Error state card
        │
        ├── entry/
        │   ├── VoiceRequest.tsx     # 13. Voice request entry shell
        │   └── Button.tsx           # 4. Large rounded CTA button
        │
        └── display/
            ├── CategoryCard.tsx     # 5. Category card
            ├── TrustBadge.tsx       # 6. Trust badge
            ├── StatusChip.tsx       # 7. Status chip
            └── RequestCard.tsx      # 8. Request card
```

---

## 4. Route Integration Strategy

To safely integrate the new UI without breaking existing routes:
1. **Layout Wrapper Pattern**: Wrap existing pages with the `<MobileShell>` component.
2. **Conditional Rendering**: Use a query parameter (e.g., `?v=premium`) or a feature flag to render the new UI while keeping the legacy UI accessible.
3. **Zero Business Logic Modification**: The components will accept standard React props (`onClick`, `children`, `isLoading`, etc.) and will not trigger direct database mutations.

---

## 5. Testing Checklist

- [ ] **Bangla Typography Rendering**: Verify that Bangla text does not clip, overlap, or fall back to unreadable system fonts on iOS and Android.
- [ ] **Mobile Touch Targets**: Ensure all interactive elements (buttons, cards, nav items) have a minimum touch target of `48px` (ideally `56px` for primary actions).
- [ ] **Color Contrast (WCAG AA)**: Ensure white text on `govo-emerald-700` and dark text on `govo-ivory-100` meets contrast requirements.
- [ ] **Safe Area Insets**: Verify that the bottom navigation and voice entry shell do not overlap native iOS Home Indicator bars or Android navigation bars.
- [ ] **Responsive Scaling**: Verify the layout scales beautifully from `320px` (iPhone SE) up to `480px` (standard viewport limit).

---

## 6. Rollback Checklist

- [ ] **Feature Flag Control**: Ensure the entry point checks `process.env.NEXT_PUBLIC_USE_PREMIUM_UI === 'true'` or a URL parameter.
- [ ] **Git Tagging**: Tag the repository state prior to merging Phase 1 (`git tag pre-govo-ui-v1`).
- [ ] **Zero-Dependency Isolation**: Verify that deleting the `src/components/govo-ui/` folder does not cause build failures in other parts of the application.

---

## 7. Exact Coding Prompt for Cursor / Codex

Copy and paste the following prompt into your AI coding assistant to generate the complete, production-ready codebase for Phase 1.

```markdown
You are a world-class senior frontend engineer and UI/UX designer specializing in high-trust, mobile-first applications. Your task is to implement Phase 1 of the "GOVO Express Local Premium Trust OS v1" design system.

### Tech Stack Context
- React (TypeScript)
- Tailwind CSS
- Lucide React (for icons)
- Emojis (for localized, friendly visual cues)

### Design Tokens (Strictly Adhere to These)
- Primary Emerald: `#0B6646` (600), `#094F39` (700), `#063B2B` (800)
- Charcoal Black: `#1E2221` (800), `#121414` (900)
- Ivory White: `#FDFDF9` (50), `#F5F5EE` (100), `#EBEBE0` (200)
- Accent Gold: `#D4AF37` (500), `#C5A059` (600)
- Fonts: Bangla-first (Fallback to system sans-serif)

---

### Implementation Task: Generate the following files

#### 1. `src/components/govo-ui/tokens.ts`
Export constants for colors, class combinations, and common Bangla/English UI copy strings.

#### 2. `src/components/govo-ui/layout/MobileShell.tsx`
A wrapper component that limits the viewport to a maximum width of `480px`, centers it on desktop screens with a dark charcoal background, and provides a premium ivory background for the app container. It must handle safe-area-insets for mobile devices.

#### 3. `src/components/govo-ui/layout/Header.tsx`
A premium header featuring:
- A subtle gold-accented GOVO Express logo.
- A language switcher toggle (`বাং` / `EN`).
- A notification bell icon with an active indicator.
- An avatar/status indicator.

#### 4. `src/components/govo-ui/layout/BottomNav.tsx`
A role-based bottom navigation bar.
- Props: `role: 'user' | 'operator'`, `activeTab: string`, `onChangeTab: (tab: string) => void`.
- User Tabs: Home (হোম), Orders (অর্ডার), Voice (ভয়েস), Profile (প্রোফাইল).
- Operator Tabs: Queue (ডিউটি), Map (ম্যাপ), Scanner (স্ক্যানার), Admin (অ্যাডমিন).
- Design: Floating pill style or docked with a premium backdrop-blur.

#### 5. `src/components/govo-ui/entry/Button.tsx`
A large, premium CTA button.
- Props: `variant: 'primary' | 'secondary' | 'gold'`, `size: 'lg' | 'md'`, `isLoading?: boolean`, `leftIcon?: React.ReactNode`.
- Design: Minimum height `56px` for `lg`, fully rounded (`rounded-full`), haptic-ready hover/active states, clear Bangla-first typography.

#### 6. `src/components/govo-ui/display/CategoryCard.tsx`
A grid card for services.
- Props: `title: string`, `banglaTitle: string`, `emoji: string`, `onClick: () => void`, `isActive?: boolean`.
- Design: Ivory background, subtle gold border when active, large tap target.

#### 7. `src/components/govo-ui/display/TrustBadge.tsx`
A small, high-trust badge.
- Props: `type: 'verified' | 'secure' | 'fast'`.
- Design: Soft emerald or gold background, matching icon/emoji, copy like "১০০% নিরাপদ" (100% Secure) or "ভেরিফাইড এজেন্ট" (Verified Agent).

#### 8. `src/components/govo-ui/display/StatusChip.tsx`
A status indicator.
- Props: `status: 'pending' | 'processing' | 'completed' | 'cancelled'`.
- Design: Soft background colors matching the status state with clear Bangla translations.

#### 9. `src/components/govo-ui/display/RequestCard.tsx`
A premium card displaying order/request details.
- Props: `id: string`, `title: string`, `date: string`, `status: 'pending' | 'processing' | 'completed'`, `price?: string`, `onAction?: () => void`.
- Design: Includes a TrustBadge, StatusChip, and a secondary action button.

#### 10. `src/components/govo-ui/feedback/EmptyState.tsx`
A beautiful empty state component.
- Props: `title: string`, `description: string`, `emoji?: string`, `actionLabel?: string`, `onAction?: () => void`.

#### 11. `src/components/govo-ui/feedback/LoadingState.tsx`
A premium skeleton loader that mimics the shape of the RequestCard and CategoryCard.

#### 12. `src/components/govo-ui/feedback/ErrorState.tsx`
A clean error card with a retry button.
- Props: `message: string`, `onRetry?: () => void`.

#### 13. `src/components/govo-ui/entry/VoiceRequest.tsx`
A floating/sticky voice request entry shell.
- Props: `isRecording: boolean`, `onStartRecording: () => void`, `onStopRecording: () => void`.
- Design: Large, pulsating emerald/gold microphone button with clear helper text: "ট্যাপ করে বলুন" (Tap to speak) / "শুনছি, বলুন..." (Listening...).

#### 14. `src/components/govo-ui/index.ts`
Export all components cleanly.

---

### Strict Guidelines:
1. Do not use any external CSS libraries other than Tailwind CSS.
2. Ensure all components are fully typed with TypeScript.
3. Use Lucide React icons where appropriate, but prioritize high-quality emojis for localized trust elements.
4. Keep all business logic decoupled; components must be purely presentation-driven.
5. Write clean, self-contained code with inline comments explaining the design choices.
```
