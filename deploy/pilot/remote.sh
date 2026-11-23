#!/usr/bin/env bash
# Entrypoint for the short-lived GitHub runner.
set -euo pipefail
umask 077
mode=$1
[[ $mode == infra || $mode == deploy ]]
for key in API_HOST AUTH_HOST MCP_HOST WEB_HOST; do
  [[ ${!key} =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo "Invalid $key"; exit 1; }
done
[[ $VPS_USER =~ ^[a-z_][a-z0-9_-]*$ ]]
if ! [[ $VPS_PORT =~ ^[1-9][0-9]{0,4}$ ]] || (( VPS_PORT > 65535 )); then
  echo "Invalid VPS_PORT" >&2
  exit 1
fi
# Use the VPS address reported by tailscale ip -4. Require the tunnel route
# before loading the deploy key or contacting the remote host.
if ! [[ $VPS_HOST =~ ^[0-9]+(\.[0-9]+){3}$ ]] ||
   ! ip -o -4 route get "$VPS_HOST" 2>/dev/null | grep -Eq ' dev tailscale0( |$)'; then
  echo "VPS_HOST must be the VPS IPv4 address routed through tailscale0." >&2
  exit 1
fi
install -dm700 ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/pilot
printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/pilot_hosts
remote=(ssh -p "$VPS_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$HOME/.ssh/pilot_hosts" -i "$HOME/.ssh/pilot" "$VPS_USER@$VPS_HOST")
work=$("${remote[@]}" 'mktemp -d /tmp/maletapp-release-XXXXXXXX')
[[ $work =~ ^/tmp/maletapp-release-[a-zA-Z0-9]+$ ]]
trap '"${remote[@]}" "sudo -n rm -rf -- $work"' EXIT
bundle=$(mktemp -d)
cp deploy/pilot/* "$bundle/"
cp -r mcp/scripts/keycloak "$bundle/"
cp gateway/keycloak/maletapp-realm.json "$bundle/realm-template.json"
printf '%s\n' "API_HOST=$API_HOST" "AUTH_HOST=$AUTH_HOST" "MCP_HOST=$MCP_HOST" "WEB_HOST=$WEB_HOST" > "$bundle/hosts.env"
image_prefix="ghcr.io/${GITHUB_REPOSITORY,,}"
printf '%s\n' "IMAGE_PREFIX=$image_prefix" "RELEASE=$GITHUB_SHA" > "$bundle/release.env"
tar -C "$bundle" -czf - . | "${remote[@]}" "tar -C $work -xzf -"
if [[ $mode == infra ]]; then
  "${remote[@]}" "cd $work && sudo -n bash infra.sh"
else
  [[ $GITHUB_ACTOR =~ ^[A-Za-z0-9_-]+(\[bot\])?$ ]]
  printf '%s' "$GHCR_TOKEN" | "${remote[@]}" "sudo -n docker --config $work/docker login ghcr.io -u '$GITHUB_ACTOR' --password-stdin"
  "${remote[@]}" "cd $work && sudo -n env DOCKER_CONFIG=$work/docker bash deploy.sh"
fi
