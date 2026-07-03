#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "Usage: $0 /path/to/.env"
  exit 1
fi

BACKUP_ROOT="$HOME/govo-secure/env-backups"
TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_ROOT"

cp "$ENV_FILE" "$BACKUP_ROOT/$(basename "$ENV_FILE").before-secret-rotation-$TS"

echo "===== GOVO SAFE ENV SECRET UPSERT ====="
echo "Env file: $ENV_FILE"
echo "Backup: $BACKUP_ROOT/$(basename "$ENV_FILE").before-secret-rotation-$TS"
echo
echo "Values will be hidden while typing."
echo "Leave blank to skip a key."
echo

read -r -s -p "New TELEGRAM_BOT_TOKEN: " TELEGRAM_BOT_TOKEN_NEW || true
echo
read -r -s -p "New SMS_API_KEY: " SMS_API_KEY_NEW || true
echo
read -r -s -p "New ADMIN_PIN: " ADMIN_PIN_NEW || true
echo
read -r -s -p "New SESSION_SECRET: " SESSION_SECRET_NEW || true
echo

export ENV_FILE TELEGRAM_BOT_TOKEN_NEW SMS_API_KEY_NEW ADMIN_PIN_NEW SESSION_SECRET_NEW

python3 - <<'PY'
from pathlib import Path
import os

env_file = Path(os.environ["ENV_FILE"])
text = env_file.read_text() if env_file.exists() else ""

updates = {
    "TELEGRAM_BOT_TOKEN": os.environ.get("TELEGRAM_BOT_TOKEN_NEW", ""),
    "SMS_API_KEY": os.environ.get("SMS_API_KEY_NEW", ""),
    "ADMIN_PIN": os.environ.get("ADMIN_PIN_NEW", ""),
    "SESSION_SECRET": os.environ.get("SESSION_SECRET_NEW", ""),
}

lines = text.splitlines()
existing = {}
for i, line in enumerate(lines):
    if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
      continue
    key = line.split("=", 1)[0].strip()
    existing[key] = i

changed = []
for key, value in updates.items():
    if not value:
        continue
    new_line = f"{key}={value}"
    if key in existing:
        lines[existing[key]] = new_line
    else:
        lines.append(new_line)
    changed.append(key)

env_file.write_text("\n".join(lines).rstrip() + "\n")

print("Updated keys:", ", ".join(changed) if changed else "none")
print("Secret values were not printed.")
PY

echo
echo "===== MASKED VERIFY ====="
grep -En 'TELEGRAM_BOT_TOKEN|SMS_API_KEY|ADMIN_PIN|SESSION_SECRET' "$ENV_FILE" | sed -E 's/(=).*/=\<hidden\>/g' || true

echo
echo "✅ Env update complete."
