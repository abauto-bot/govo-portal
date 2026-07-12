# GOVO Express — Change Log

This log records meaningful project changes made by ABU AI or other coding agents.

Do not include secrets, tokens, passwords or private customer data.

---

## 2026-07-13 — Project brain initialized

### Added

- `AGENTS.md`
- `docs/GOVO_CONTEXT.md`
- `docs/PROJECT_STATE.json`
- `docs/CHANGELOG.md`

### Purpose

Created persistent project context for AI agents so GOVO work can continue without repeatedly re-explaining:

- locked UI rules
- host ownership
- role boundaries
- customer and operational flow
- safety rules
- completed work
- pending work
- backup references

---

## 2026-07-12 — Host and role mapping stabilized

### Completed

- Public, customer, merchant, rider and admin hosts isolated
- Merchant deep-route mapping added
- Rider deep-route mapping added
- Admin deep-route mapping added
- Nginx validation passed
- Only the affected GOVO application container was restarted

### Preserved

- DNS
- SSL
- Cloudflare
- MongoDB / PostgreSQL
- Kasm
- Nextcloud
- n8n
- public and customer host ownership

---

## 2026-07-12 — GOVO progress checkpoint

### Backup

- Git branch: `backup/govo-progress-20260712-224627`
- Commit: `6d24028`
- Local backup: `/home/abu/govo-backups/govo-progress-20260712-224627`

### Status

- Working tree was clean after backup
- Remote Git backup confirmed
