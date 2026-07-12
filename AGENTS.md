# GOVO Express — AI Agent Operating Rules

This repository is the active GOVO Express production project.

Before making any change, always read:

1. `AGENTS.md`
2. `docs/GOVO_CONTEXT.md`
3. `docs/PROJECT_STATE.json`
4. `docs/CHANGELOG.md`

## Mandatory workflow

For every task:

1. Inspect the current implementation.
2. Confirm the active host, route, container and source file.
3. Back up only the affected files.
4. Make the smallest targeted change.
5. Preserve existing working functionality.
6. Build and test before production deployment.
7. Update `docs/PROJECT_STATE.json`.
8. Append a concise entry to `docs/CHANGELOG.md`.
9. Commit the completed work to Git.

## Current operating mode

Build → Test → Improve

Do not declare GOVO publicly launch-ready unless the required production tests pass.

## Locked UI rule

The current premium dark-green GOVO design system is permanently locked.

Any new page, route, dialog, form or button must reuse the same:

- dark black / emerald-green visual language
- GOVO header and logo treatment
- typography
- rounded cards
- neon-green and white button language
- spacing and border system
- responsive mobile behavior
- navigation patterns
- loading, empty and error states

Only the central page content may change.

Do not:

- create a new design system
- restore any legacy light UI
- copy old components with conflicting CSS
- redesign approved pages without explicit approval
- use dirty yellow-green styling
- expose raw JSON, stack traces or debug output to users

The public site, customer app, merchant panel, rider panel and admin panel must remain one consistent GOVO design family.

## Host ownership

- `govoexpress.com` → Public homepage
- `app.govoexpress.com` → Customer application
- `merchant.govoexpress.com` → Merchant panel
- `rider.govoexpress.com` → Rider panel
- `add.govoexpress.com` → Admin / operations panel

Never allow one host to render another role's shell.

## Safety rules

Safe inspection, reading, status checks, backups and test-lane builds may run without repeated approval.

Require explicit approval before:

- production deployment
- nginx, DNS, SSL or Cloudflare changes
- destructive database operations
- deleting containers, volumes or live files
- sending real SMS or WhatsApp messages
- changing payment data
- irreversible migrations

Never modify or expose:

- `.env` values
- tokens
- passwords
- API secrets
- private keys
- customer private information

Do not restart MongoDB, PostgreSQL, Kasm, Nextcloud, n8n or unrelated services for a frontend change.

## Git rules

- Never commit `.env`, tokens, credentials, private keys or production secrets.
- Preserve the current stable version before major work.
- Use clear commit messages.
- After a completed task, update project state and changelog before commit.

## Response format

Do not return long raw logs.

Return a compact report containing:

- diagnosis
- files changed
- tests run
- result
- backup path
- rollback method
- remaining issues
