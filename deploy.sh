#!/usr/bin/env bash
set -e

cd /opt/govo-portal

echo "🔄 Pulling latest code..."
git pull --ff-only origin main || true

echo "🔎 Finding Docker network..."
NET=$(docker inspect abu_n8n --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)

echo "🏗️ Building GOVO Portal..."
docker build -t govo_portal:1 .

echo "🧹 Removing old container..."
docker rm -f govo_portal 2>/dev/null || true

echo "🚀 Starting new container..."
docker run -d \
  --name govo_portal \
  --restart always \
  --network "$NET" \
  -p 127.0.0.1:8090:3000 \
  --env-file /opt/govo-portal/.env \
  govo_portal:1

echo "✅ GOVO Portal deployed on 127.0.0.1:8090"
