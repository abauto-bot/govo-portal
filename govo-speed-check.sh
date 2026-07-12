#!/usr/bin/env bash
echo "⚡ GOVO SPEED CHECK"
echo ""

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

for url in "${URLS[@]}"; do
  echo "--- $url ---"
  curl -k -sD - -o /dev/null -H "Accept-Encoding: gzip" "$url" | grep -iE "HTTP/|x-govo-perf|x-govo-cache|content-encoding|content-type" || true
  time=$(curl -k -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{time_total}" "$url")
  code=$(curl -k -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{http_code}" "$url")
  echo "HTTP=$code TIME=${time}s"
  echo ""
done
