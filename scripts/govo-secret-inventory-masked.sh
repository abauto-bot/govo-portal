#!/usr/bin/env bash
set -euo pipefail

echo "===== GOVO MASKED SECRET INVENTORY ====="
echo "Secret values will NOT be printed."
echo

PATTERN='OPENROUTER_API_KEY|sk-or-|BOT_TOKEN|TELEGRAM_BOT_TOKEN|ADMIN_PIN|SESSION_SECRET|PGPASSWORD|POSTGRES_PASSWORD|PASSWORD=|SECRET=|API_KEY=|DATABASE_URL|SMS_API_KEY'

echo "===== Secret-like files, filename only ====="
grep -RIl \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=.govo-ai \
  --exclude-dir=backups \
  --exclude-dir=public \
  -E "$PATTERN" . || true

echo
echo "===== Env candidate files ====="
find . -maxdepth 4 \( -name ".env" -o -name ".env.*" -o -name "*env*" \) \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -print || true

echo
echo "===== Masked key names inside env-like files ====="
while IFS= read -r file; do
  [ -f "$file" ] || continue
  if grep -Eq "$PATTERN" "$file"; then
    echo "--- $file"
    grep -En "$PATTERN" "$file" | sed -E 's/(=).*/=\<hidden\>/g'
  fi
done < <(find . -maxdepth 4 \( -name ".env" -o -name ".env.*" -o -name "*env*" \) \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -print)

echo
echo "===== Docker live container env key names masked ====="
if docker inspect govo_portal >/dev/null 2>&1; then
  docker inspect govo_portal --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -E "$PATTERN" \
    | sed -E 's/(=).*/=\<hidden\>/g' || true
else
  echo "govo_portal container not found"
fi

echo
echo "✅ Inventory complete. No secret value printed."
