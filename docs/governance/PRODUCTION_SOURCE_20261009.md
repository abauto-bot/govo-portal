# GOVO production source snapshot — 2026-10-09

This branch captures the exact `server.js` bytes running in container `govo_portal_v20_live` during the 2026-10-09 production governance audit.

- Runtime image: `govo_portal:role-flows-final-20261004_002315`
- Source base commit: `5fb3f8e96d6f4a23e2f708f299aa5dee806ddeda`
- Live `/app/server.js` SHA-256: `bf4f95e24195626fbd4ae99e0835b73ddafdca16884bea3b8c1c5c65091b6b2a`
- Previous tracked `/opt/govo-portal/server.js` SHA-256: `52a755eb8ee724019dbaff9238af3a34b0188e44c0218c7457091e3e8f50b707`
- Purpose: establish an auditable source-of-truth branch without changing `main` or production runtime.

The selected historical commit identifiers `c29f6c49` and `848328c8` were not resolved in the accessible repositories during this audit and were not modified, rewritten, or replaced.
