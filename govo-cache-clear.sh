#!/usr/bin/env bash
echo "🧹 Clearing GOVO Nginx cache..."
sudo find /var/cache/nginx/govo_app -type f -delete 2>/dev/null || true
sudo systemctl reload nginx
echo "✅ GOVO cache cleared + nginx reloaded"
