# GOVO Express — Permanent Project Context

## Product vision

GOVO Express is a local delivery and service operating system.

Its purpose is to connect:

- customers
- shops and merchants
- riders
- local service providers
- GOVO operations and admin

The initial operating region is Meherpur, Bangladesh.

## Core service areas

- Meherpur
- Gangni
- Bamundi
- Mujibnagar
- Amjhupi

These values should come from one reusable registry rather than being duplicated across pages.

## Main service categories

- All Shops
- Food and local shop delivery
- General delivery booking
- Bike / auto transport request
- Doctor appointment
- Agriculture products
- Domestic and home services
- House rent
- Other local services

## Roles

### Customer

Customer can:

- browse shops
- view available products
- browse services
- select an area
- submit an order or service request
- see a safe order status timeline
- contact support
- provide feedback

### Merchant

Merchant can:

- complete onboarding
- manage its own business profile
- manage its own products or availability
- view its own permitted orders
- update only the statuses permitted to merchants
- view merchant notifications and support

A merchant must never access another merchant's data.

### Rider

Rider can:

- complete onboarding
- manage availability
- view only assigned or permitted jobs
- update only valid rider workflow statuses
- see history and real earning records
- access rider support

A rider must never access another rider's private assignment data.

### Admin / Operations

Admin can:

- receive customer leads
- confirm requests by phone
- manage merchants
- manage riders
- assign confirmed orders
- control the operational status pipeline
- view payment and feedback records
- see the complete audit timeline

## Canonical order pipeline

Use one central order status registry:

1. Phone Confirming
2. Confirmed
3. Assigned
4. On the way
5. Working
6. Completed
7. Paid
8. Feedback
9. Cancelled

Every status change should include:

- internal stable key
- Bangla label
- English label
- timestamp
- actor / role
- previous status
- new status
- audit history

Invalid status jumps should be rejected.

## Customer route expectations

- `/` → Home
- `/shops` → Shops
- `/shops/:shopId` → Shop detail
- `/services` → Services
- `/service` → Normalize to `/services`
- `/services/:serviceId` → Service detail
- `/order` → Unified order / request
- `/orders` → Customer order list where supported
- `/orders/:orderId` → Safe order tracking
- `/support` → Support
- `/help` → Normalize to `/support`
- `/profile` → Customer profile where supported
- `/notifications` → Customer notifications where supported

Unknown routes must show a GOVO Not Found page, not the Home page.

Customer bottom navigation:

- Home → `/`
- Shops → `/shops`
- Service → `/services`
- Order → `/order`
- Help → `/support`

The active navigation item must match the current route.

## Public homepage expectations

`govoexpress.com` is a public marketing and discovery homepage.

It must use the same locked GOVO premium dark-green design family but public-specific content.

Expected public sections:

- GOVO hero
- operating areas
- shops and service overview
- how GOVO works
- customer app CTA
- merchant onboarding CTA
- rider onboarding CTA
- trust and support
- GOVO footer

Expected links:

- Customer App → `https://app.govoexpress.com/`
- Shops → `https://app.govoexpress.com/shops`
- Services → `https://app.govoexpress.com/services`
- Order → `https://app.govoexpress.com/order`
- Support → `https://app.govoexpress.com/support`
- Merchant Join → `https://merchant.govoexpress.com/onboarding`
- Rider Join → `https://rider.govoexpress.com/onboarding`

Do not place the customer-app bottom navigation on the public homepage.

## Design source of truth

The approved customer interface currently visible on `app.govoexpress.com` is the visual source of truth.

The visual language includes:

- deep black and emerald-green background
- premium green and white contrast
- modern rounded cards
- consistent GOVO header
- clean hamburger menu
- mobile-first responsive layout
- role-aware navigation
- clear empty, loading and error states

## Data rules

- Real users, merchants, riders, orders, payments and feedback must come from persistent backend data.
- Do not replace real data with hardcoded production arrays.
- Public service categories and operating areas may use canonical configuration.
- Missing live data should show a proper empty state.
- Never fabricate production totals.
- Never delete historical data during UI work.
- Use backward-compatible adapters when legacy and new field names differ.

## Notification rules

Customer notifications may use the existing approved notification system.

Merchant and rider notifications should prefer the in-app channel where available.

WhatsApp and SMS credentials must only come from protected environment configuration.

Never expose or hardcode values such as:

- admin WhatsApp number
- WhatsApp phone-number ID
- WhatsApp access token
- SMS API token
- sender credentials

A notification failure must not delete a successfully created order.

## Infrastructure boundaries

Known production application container:

- `govo_portal`
- application port historically mapped through `8090`

Notification service historically uses port `8092`.

Do not assume ports, containers or file paths without inspecting the live environment first.

Do not modify unrelated services such as:

- Kasm
- Nextcloud
- n8n
- MongoDB
- PostgreSQL
- phone bridge
- ABU OS services

## Business workflow

Customer request
→ Admin lead
→ Phone Confirming
→ Confirmed
→ Merchant involvement where applicable
→ Rider assignment where applicable
→ Assigned
→ On the way
→ Working
→ Completed
→ Paid
→ Feedback

Every stage should preserve one stable order or reference ID.
