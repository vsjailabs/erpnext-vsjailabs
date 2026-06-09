---
name: utho-erpnext-ops
description: Operate the LIVE VSJ AI Labs ERPNext deployment on Utho Cloud (103.127.29.102, https://erp.vsjailabs.in). Use for SSH access, Docker Compose commands, backups, restore, SSL, branding, and troubleshooting this specific server. Triggers when the user mentions the Utho server, erp.vsjailabs.in, ERPNext ops, backups, or "the live ERPNext".
---

# Utho ERPNext Operations (VSJ AI Labs)

Live ERPNext v15 on Utho Cloud. **Always confirm before destructive actions** (down, rm, restore over live data, DNS changes).

## Server facts
- **IP:** `103.127.29.102` (Delhi/Noida), Ubuntu 24.04, 4 vCPU / 8 GB / 160 GB
- **URL:** https://erp.vsjailabs.in · **Admin:** `Administrator` (password in project memory `project_utho_migration.md`, NOT in this repo)
- **Site directory name:** `erp.vsjailabs.in` (Nginx `Host` header must match this)
- **Deploy dir:** `/opt/erpnext/frappe_docker/` · **Data:** persistent in compose volumes
- **SSL:** Let's Encrypt, certbot auto-renew (expires 2026-09-07)

## SSH access
Key-based auth is enabled (the `tpe-mac` ed25519 key was installed 2026-06-09):
```bash
ssh root@103.127.29.102
```
Password fallback is recorded in project memory `project_utho_migration.md` (kept out of this repo). With password: `sshpass -e ssh -o PreferredAuthentications=password ...` after `export SSHPASS=...`.

**If the IP is unreachable on TCP** (office network / sandbox content-filter blocks it — traceroute works but TCP gives ENETUNREACH): use the **Utho VNC web console** (Manage Cloud → Console) over HTTPS in a browser, which always works.

## Credentials (/opt/erpnext/frappe_docker/.env on the server — NOT in this repo)
- The value of `DB_PASSWORD` in `.env` is **also the MariaDB ROOT password** — frappe_docker sets `MYSQL_ROOT_PASSWORD` from `DB_PASSWORD`, not `DB_ROOT_PASSWORD`. Read it live: `... exec -T db printenv | grep MYSQL_ROOT_PASSWORD`.
- Full credential values live in project memory `project_utho_migration.md`.

## Docker Compose — ALWAYS all 4 files
```bash
cd /opt/erpnext/frappe_docker
docker compose -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  -f overrides/compose.noproxy.yaml \
  --env-file .env <command>
```
`compose.noproxy.yaml` exposes the frontend on `0.0.0.0:8080`; without it host Nginx gets 502.

## Common tasks
- **Health:** `curl -s https://erp.vsjailabs.in/api/method/ping` → `{"message":"pong"}`
- **Container status:** `docker ps --format '{{.Names}}: {{.Status}}'` (expect 9 `Up`)
- **Bench command:** `... exec -T backend bench --site erp.vsjailabs.in <cmd>`
- **Manual backup:** `... exec -T backend bench --site all backup --with-files`
- **Restore (NOTE the flags on this build):**
  `... exec -T backend bench --site erp.vsjailabs.in restore <db.sql.gz> --db-root-password "$DB_PASSWORD" --with-public-files <files.tar> --with-private-files <private.tar>`
  (use the `.env` `DB_PASSWORD` value as the root password; this build does NOT accept `--with-files`)
- **Clear cache after any change:** `... exec -T backend bench --site erp.vsjailabs.in clear-cache`
- **Branding:** see project memory `feedback_erpnext_branding.md` — REST API (login → CSRF → PUT Website/System Settings). Logo files: `/files/vsj-logo-square.png`, `/files/vsj-logo-horizontal.png`.

## Host Nginx & SSL
- Config: `/etc/nginx/sites-available/erpnext` → proxies `127.0.0.1:8080` with `Host: erp.vsjailabs.in`.
- Re-provision SSL: `certbot --nginx --non-interactive --agree-tos --email vsjailabs@gmail.com -d erp.vsjailabs.in --redirect`

## Server-specific gotchas (already fixed, re-check if redeploying)
- Root partition shipped at 2.5 GB of 160 GB → fixed with `growpart /dev/vda 1 && resize2fs /dev/vda1`.
- DNS stub was dead → `/etc/resolv.conf` set to 8.8.8.8/1.1.1.1 and `chattr +i` locked. To edit: `chattr -i` first.
- Containers are `unless-stopped` → auto-start on reboot.

## GCP decommission (pending, ~after 2026-06-16)
Old GCP VM still has retained snapshots. Do NOT destroy until 7-day Utho verification passes. See `project_utho_migration.md`.
