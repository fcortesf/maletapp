#!/usr/bin/env bash
# Ubuntu 24.04 LTS, root. Run from the extracted release bundle.
set -euo pipefail
umask 077
source ./hosts.env
export AUTH_HOST MCP_HOST API_HOST WEB_HOST
if ! docker compose version >/dev/null 2>&1 || ! command -v jq >/dev/null || ! command -v cron >/dev/null; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2 jq curl openssl cron
fi
systemctl enable --now docker cron
state=/etc/maletapp
install -d -m 700 "$state" /opt/maletapp/infra
if [[ ! -d "$state/secrets" ]]; then
  if docker volume ls --format '{{.Name}}' | grep -Fx maletapp-pilot-postgres >/dev/null; then
    echo "Existing PostgreSQL volume: restore /etc/maletapp/secrets first." >&2
    exit 1
  fi
  tmp=$(mktemp -d "$state/initial.XXXXXXXX")
  trap 'rm -rf -- "$tmp"' EXIT
  keycloak_password=$(openssl rand -hex 32)
  maletapp_password=$(openssl rand -hex 32)
  admin=$(openssl rand -hex 32)
  echo "$admin" > "$tmp/admin-password"
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" > "$tmp/postgres.env"
  printf 'keycloak_password=%s\nmaletapp_password=%s\n' "$keycloak_password" "$maletapp_password" > "$tmp/database.env"
  printf 'KEYCLOAK_ADMIN=pilot-admin\nKEYCLOAK_ADMIN_PASSWORD=%s\nKC_DB_PASSWORD=%s\n' "$admin" "$keycloak_password" > "$tmp/keycloak.env"
  echo "ConnectionStrings__Trips=Host=postgres;Database=maletapp;Username=maletapp;Password=$maletapp_password" > "$tmp/domain.env"
  mv "$tmp" "$state/secrets"
fi
for file in postgres.env keycloak.env database.env domain.env admin-password; do
  test -s "$state/secrets/$file" || { echo "Restore missing $file from backup." >&2; exit 1; }
done
install -m 600 hosts.env infra.yml Caddyfile /opt/maletapp/infra/
install -m 700 backup.sh /opt/maletapp/infra/
jq --arg origin "https://$WEB_HOST" '
  .sslRequired="external" | .clients |= map(select(.clientId=="maletapp-web") |
  .redirectUris=[$origin+"/callback"] | .webOrigins=[$origin] |
  .attributes["post.logout.redirect.uris"]=($origin+"/signed-out"))' realm-template.json > "$state/realm.json"
chmod 644 "$state/realm.json"
compose=(docker compose -f /opt/maletapp/infra/infra.yml)
"${compose[@]}" up -d --wait postgres
bash postgres.sh
"${compose[@]}" up -d keycloak
"${compose[@]}" up -d --force-recreate caddy
curl -fsS --retry 40 --retry-delay 3 --retry-all-errors -o /dev/null http://127.0.0.1:18080/realms/maletapp/.well-known/openid-configuration
docker run --rm --network host -e MCP_RESOURCE_URL="https://$MCP_HOST/mcp" \
  -v "$PWD:/setup:ro" -v "$state/secrets:$state/secrets" node:24-alpine node /setup/identity.ts
printf '17 3 * * * root /opt/maletapp/infra/backup.sh\n' > /etc/cron.d/maletapp-backup
chmod 644 /etc/cron.d/maletapp-backup
