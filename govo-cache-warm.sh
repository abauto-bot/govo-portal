#!/usr/bin/env bash
echo "🔥 Warming GOVO public cache..."
URLS=(
  "https://app.govoexpress.com/app"
  "https://app.govoexpress.com/shops"
  "https://app.govoexpress.com/services"
  "https://app.govoexpress.com/order"
  "https://app.govoexpress.com/service-request"
  "https://app.govoexpress.com/merchant"
  "https://app.govoexpress.com/rider"
  "https://app.govoexpress.com/support"
)
for round in 1 2 3; do
  echo ""
  echo "Round $round"
  for url in "${URLS[@]}"; do
    code=$(curl -k -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{http_code}" "$url")
    time=$(curl -k -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{time_total}" "$url")
    echo "$url  HTTP=$code  TIME=${time}s"
  done
done
echo ""
echo "✅ Cache warm done"
