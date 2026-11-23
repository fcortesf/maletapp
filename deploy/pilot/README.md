# Maletapp pilot deployment

Two manual GitHub Actions workflows target a single Ubuntu 24.04 LTS amd64 VPS.
The server runs PostgreSQL 16, Keycloak 25.0.6 (legacy exchange), Caddy and one
instance per application service. GitHub builds images. Cloudflare Pages serves
the Vite bundle separately. This procedure starts a new pilot realm.

## First setup

1. Provision the VPS, create a deployment user with SSH key access and noninteractive
   sudo, and verify its host key fingerprint through the OVH console. From KVM,
   install Tailscale on the VPS and enroll it with the tag `tag:maletapp-vps`.
   Keep HTTPS and TCP 80 available publicly. Point three public DNS names at the VPS. Only publish AAAA
   records if IPv6 works. Allow containers to reach the public identity hostname.
2. Create a Cloudflare Pages **direct upload** project. Use the repository default
   branch as its production branch. Choose its pages.dev name or configure a custom
   domain. Keep one stable production web origin for the PKCE callback.
3. Configure the following GitHub repository variables and secrets. Restrict
   write access and protect the default branch. The deployment key grants root
   access, so workflow code and its maintainers are trusted. The workflows share
   a concurrency group and can run only on the default branch.

| GitHub variables | Value |
| --- | --- |
| TS_CLIENT_ID, TS_AUDIENCE | Client ID and audience from the Tailscale federated identity for GitHub Actions |
| AUTH_HOST, API_HOST, MCP_HOST | Three distinct DNS names, without schemes or paths |
| WEB_HOST | Production Pages hostname, without scheme or path |
| CLOUDFLARE_ACCOUNT_ID, PAGES_PROJECT | Pages account ID and existing project name |

| GitHub secrets | Purpose |
| --- | --- |
| VPS_HOST, VPS_USER | VPS Tailscale IPv4 (from `tailscale ip -4`), deployment username |
| VPS_PORT | Configured SSH port (1–65535) |
| SSH_KNOWN_HOSTS | Verified host key line. Use HOST for port 22 and [HOST]:PORT for other ports. |
| PILOT_SSH_KEY | Private deployment key, including line breaks |
| CLOUDFLARE_API_TOKEN | Pages edit permission scoped to the Pages account |

GHCR uses the temporary workflow token. Allow package publication and give the
repository access to any pre-existing packages with the same names. Container
names use ghcr.io/OWNER/REPOSITORY/SERVICE and the full Git commit SHA.

## Runner access over Tailscale

Define `tag:maletapp-ci` and `tag:maletapp-vps` in the tailnet policy with
administrator tag ownership. Grant the CI tag access to the VPS tag on
`tcp:22` (or the configured VPS_PORT). Check for broader grants including
the default allow-all rule. The service on the VPS is ordinary OpenSSH.

Create a federated identity in the Tailscale admin console using GitHub Actions
as issuer. Match the exact GitHub OIDC subject for this repository and its
default branch, and select Auth Keys > Write for `tag:maletapp-ci`. Store the
client ID and audience as the repository variables above. Each workflow joins
as an ephemeral runner immediately before SSH and verifies the route uses
tailscale0. The private SSH key and pinned host key still authenticate the
connection. [Tailscale GitHub Action](https://tailscale.com/docs/integrations/github/github-action)

Run the infra workflow over the private address first. With OVH KVM available,
permit the SSH port on tailscale0 and close it on public interfaces (IPv4 and
IPv6). Run the deploy workflow with public SSH closed. Clients keep using the
public web, gateway, MCP and identity endpoints.

## Run the workflows

After merging the workflow files, open Actions and select **Prepare pilot
infrastructure → Run workflow**. The workflow installs Compose, starts PostgreSQL,
creates missing roles and databases and reconciles the MCP exchange policy.
It imports the web client on first realm startup with exact callback and logout
URLs. The realm disables self-registration. Later realm configuration changes
must be applied explicitly because Keycloak skips import for an existing realm.

Select **Deploy pilot release → Run workflow**. It tests the selected default-branch
commit, publishes the three images, takes logical backups, runs EF migrations,
updates containers, checks public discovery, gateway authentication and a private
database query, then uploads the static UI. A failed migration prevents the new
backend rollout. A failed backend check prevents Pages publication. Investigate
the running backend before retrying a partially deployed release. Re-run the
same workflow after resolving the failure. Use backward-compatible schema
changes because the previous API is still serving during migration.

## Credentials, testers and ChatGPT

Host-only credentials are generated once under /etc/maletapp/secrets with
root-only directory access. Compose injects separate credentials into each
service using env_file for PostgreSQL and Keycloak, and a read-only secret file for MCP. Docker administrators can inspect container environments.
If credential files disappear, recover the originals before provisioning again.
Keep an encrypted copy of this directory outside the VPS and the recovery key in
your password manager. The frontend receives only public URLs and client IDs.

The administration API is reachable on the VPS at 127.0.0.1:18080. Use the
Keycloak admin CLI from the host through the container, for example:

```sh
cd /opt/maletapp/infra
sudo docker compose --env-file hosts.env -f infra.yml exec keycloak \
  /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 \
  --realm master --user pilot-admin --config /tmp/pilot-kcadm
```

Enter the password from the protected admin-password file interactively. Use
kcadm with the same config to create tester users, set temporary passwords, and
import the JSON produced by [the ChatGPT client generator](../../mcp/docs/authentication.md)
once ChatGPT supplies its callback. Copy the dedicated client's secret into the
plugin settings. Remove the temporary kcadm session file when done. Public Caddy
routes allow the pilot realm and login resources and exclude the admin API.
The deployment workflows do not publish a plugin to ChatGPT.

## Recovery and pilot acceptance

Root cron runs pg_dump daily at 03:17 server time. Deployment also takes a dump
of each database before migration. Successful dump sets are retained for about
seven days in /var/backups/maletapp. Copy backups and credentials off-host in
encrypted storage; the cron job only creates the local dumps. Test recovery on a
separate host by provisioning the same roles, creating empty databases owned by
their respective roles, and running pg_restore for each dump into its matching
database before starting Keycloak or the API. Recover credentials separately.
Use the previous application images only with a compatible schema, or restore
the matching backups first. Restore the matching Pages deployment separately.

Before inviting users, sign in, create a trip and pack an item. Run both
workflows a second time and confirm the account and item survive and a second
user cannot see them. Verify ChatGPT login and refresh with the real callback.
