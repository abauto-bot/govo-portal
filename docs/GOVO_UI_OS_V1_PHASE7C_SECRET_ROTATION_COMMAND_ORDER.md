# GOVO UI OS v1 — Phase 7C Secret Rotation Command Order

Status: No live deploy in this phase.

## Important safety rule

Never paste secret values into:
- ChatGPT
- screenshots
- terminal output
- git commits
- docs
- logs

Only use masked inventory and hidden terminal input.

## Rotation order

### 1. Inventory first, masked only
Find where secret keys exist without printing values.

### 2. Rotate Telegram bot token
- Generate/revoke token through BotFather.
- Do not paste token in chat.
- Update production env file using hidden input script.
- Restart only the service/container that uses Telegram notification.
- Verify notify health without printing token.

### 3. Rotate SMS API key
- Generate new key in provider dashboard.
- Do not paste key in chat.
- Update production env file using hidden input script.
- Send one controlled test only after route/env verification.

### 4. Rotate admin PIN/session secret
- Use new strong admin PIN.
- Generate new random session secret locally.
- Update env using hidden input script.
- Verify old PIN fails and new PIN works.

### 5. Re-run pre-live gate
Gate must remain blocked until all human confirmations are set to YES.

### 6. Real DB smoke test
Run separately before promotion.

### 7. Live promotion only after all blockers cleared
No automatic promotion in this phase.
