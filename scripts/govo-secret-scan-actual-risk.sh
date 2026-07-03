#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path
import re

skip_dirs = {'.git', 'node_modules', '.govo-ai', 'public'}
max_size = 2_000_000

patterns = {
    'OPENROUTER_SECRET_VALUE': re.compile(r'sk-or-[A-Za-z0-9_-]{20,}'),
    'TELEGRAM_TOKEN_VALUE': re.compile(r'\b\d{8,12}:[A-Za-z0-9_-]{30,}\b'),
    'ENV_SECRET_ASSIGNMENT': re.compile(
        r'^(TELEGRAM_BOT_TOKEN|SMS_API_KEY|ADMIN_PIN|SESSION_SECRET|DATABASE_URL|POSTGRES_PASSWORD|PGPASSWORD|OPENROUTER_API_KEY|API_KEY|SECRET|PASSWORD)\s*=\s*(?!$|<hidden>|changeme|CHANGE_ME|example|EXAMPLE|your_|YOUR_|xxx|XXX|placeholder|PLACEHOLDER).+',
        re.M
    ),
}

findings = []

for path in Path('.').rglob('*'):
    if not path.is_file():
        continue
    if any(part in skip_dirs for part in path.parts):
        continue
    try:
        if path.stat().st_size > max_size:
            continue
        text = path.read_text(errors='ignore')
    except Exception:
        continue

    hits = []
    for name, rx in patterns.items():
        if rx.search(text):
            hits.append(name)

    if hits:
        kind = 'ENV_EXPECTED' if path.name.startswith('.env') else 'NON_ENV_REVIEW'
        findings.append((str(path), kind, ','.join(sorted(set(hits)))))

print("===== GOVO ACTUAL-RISK SECRET SCAN =====")
print("No secret values are printed.")
print()

if not findings:
    print("✅ No actual-risk secret patterns found.")
else:
    for file, kind, hits in findings:
        print(f"{kind}: {file} :: {hits}")

print()
print("✅ scan complete")
PY
