#!/usr/bin/env bash
cd /opt/govo-portal || exit 1
echo "⚡ GOVO FAST CHECK"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "govo_portal|govo_|NAMES" || true
echo ""
for r in /app /shops /services /order /merchant /rider /support; do
  curl -s -o /dev/null -w "%-18s HTTP=%{http_code} TIME=%{time_total}s\n" "http://127.0.0.1:8090$r"
done
