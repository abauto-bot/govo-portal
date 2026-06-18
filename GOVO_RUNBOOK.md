# GOVO Runbook

Status:
govo status
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
curl -s http://127.0.0.1:8090/health

Test deploy pattern:
cd /opt/govo-portal
npm install
node --check server.js
docker rm -f govo_portal_test 2>/dev/null || true
docker build -t govo_portal:FEATURE-test .
NET=$(docker inspect govo_portal --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)
docker run -d --name govo_portal_test --restart unless-stopped --network "$NET" -p 127.0.0.1:8091:3000 --env-file /opt/govo-portal/.env.clean -v /opt/govo-portal/uploads:/app/uploads govo_portal:FEATURE-test
sleep 7
curl -s http://127.0.0.1:8091/health

Live deploy pattern:
govo backup "Before live deploy FEATURE"
docker tag govo_portal:FEATURE-test govo_portal:FEATURE-live
NET=$(docker inspect govo_portal --format '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)
OLD_NAME="govo_portal_before_FEATURE_$(date +%F_%H%M%S)"
docker stop govo_portal
docker rename govo_portal "$OLD_NAME"
docker run -d --name govo_portal --restart always --network "$NET" -p 127.0.0.1:8090:3000 --env-file /opt/govo-portal/.env.clean -v /opt/govo-portal/uploads:/app/uploads govo_portal:FEATURE-live
sleep 7
curl -fsS http://127.0.0.1:8090/health

Rollback:
docker logs --tail 200 govo_portal
docker rm -f govo_portal
docker rename OLD_NAME govo_portal
docker start govo_portal
