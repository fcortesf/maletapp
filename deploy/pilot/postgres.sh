#!/usr/bin/env bash
# Run as root on the VPS after PostgreSQL reports ready.
set -euo pipefail
cd /etc/maletapp/secrets
source database.env
for role in keycloak maletapp; do
  password_var=${role}_password
  # Passwords are generated hex strings. Pass SQL through stdin, never argv.
  password=${!password_var}
  [[ $password =~ ^[a-f0-9]{64}$ ]]
  docker compose -f /opt/maletapp/infra/infra.yml exec -T postgres psql -X -U postgres -v ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE ROLE $role LOGIN PASSWORD ''$password''' WHERE NOT EXISTS
  (SELECT FROM pg_roles WHERE rolname = '$role') \gexec
SELECT 'CREATE DATABASE $role OWNER $role' WHERE NOT EXISTS
  (SELECT FROM pg_database WHERE datname = '$role') \gexec
REVOKE CONNECT ON DATABASE $role FROM PUBLIC;
SQL
done
