#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
set -a
source /opt/maletapp/infra/hosts.env
source release.env
set +a
[[ $RELEASE =~ ^[0-9a-f]{40}$ ]]
test -s /etc/maletapp/secrets/mcp.env
compose=(docker compose -f app.yml)
"${compose[@]}" pull
/opt/maletapp/infra/backup.sh
"${compose[@]}" run --rm --no-deps domain-api --migrate
"${compose[@]}" up -d
install -d -m 700 /opt/maletapp/app
install -m 600 app.yml release.env /opt/maletapp/app/
# Verify discovery, gateway auth and an actual query to the domain database.
curl -fsS --retry 30 --retry-all-errors "https://$MCP_HOST/.well-known/oauth-protected-resource/mcp" | jq -e --arg url "https://$MCP_HOST/mcp" '.resource==$url' >/dev/null
test "$(curl -sS -o /dev/null -w '%{http_code}' "https://$API_HOST/web/trips")" = 401
"${compose[@]}" exec -T gateway node -e 'fetch("http://domain-api:5110/trips",{headers:{"X-Test-User-Id":"00000000-0000-4000-8000-000000000001"}}).then(r=>{if(!r.ok)process.exit(1)})'
