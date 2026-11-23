#!/usr/bin/env bash
# Entrypoint for the short-lived GitHub runner.
set -euo pipefail
umask 077
mode=$1
[[ $mode == infra || $mode == deploy ]]
for key in API_HOST AUTH_HOST MCP_HOST WEB_HOST VPS_HOST; do
  [[ ${!key} =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo "Invalid $key"; exit 1; }
done
[[ $VPS_USER =~ ^[a-z_][a-z0-9_-]*$ ]]
install -dm700 ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/pilot
printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/pilot_hosts
remote=(ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$HOME/.ssh/pilot_hosts" -i "$HOME/.ssh/pilot" "$VPS_USER@$VPS_HOST")
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
