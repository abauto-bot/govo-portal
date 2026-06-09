#!/usr/bin/env bash
set -e

cd /opt/govo-portal

NET=$(docker inspect abu_n8n --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)

docker build -t govo_portal:1 .

docker rm -f govo_portal 2>/dev/null || true

docker run -d \
  --name govo_portal \
  --restart always \
  --network "$NET" \
  -p 127.0.0.1:8090:3000 \
  --env-file /opt/govo-portal/.env \
  govo_portal:1

echo "✅ GOVO Portal deployed on 127.0.0.1:8090"
