#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/maletapp/infra
install -d -m 700 /var/backups/maletapp
backup=$(mktemp -d /var/backups/maletapp/.partial-XXXXXXXX)
trap 'rm -rf -- "$backup"' EXIT
for db in keycloak maletapp; do
  docker compose --env-file hosts.env -f infra.yml exec -T postgres pg_dump -U postgres -Fc "$db" > "$backup/$db.dump"
done
mv "$backup" "/var/backups/maletapp/$(date -u +%Y%m%dT%H%M%S%NZ)"
find /var/backups/maletapp -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' -mtime +7 -exec rm -rf -- {} +
