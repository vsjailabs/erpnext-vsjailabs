---
name: utho-erpnext-ops
description: Operate the LIVE VSJ AI Labs apps on the Utho Cloud server (103.127.29.102) — ERPNext (https://erp.vsjailabs.in) AND OpenProject (https://pm.vsjailabs.in). Use for SSH access, Docker/Compose commands, backups, restore, SSL, branding, SMTP, user management, and troubleshooting this specific server. Triggers when the user mentions the Utho server, erp.vsjailabs.in, pm.vsjailabs.in, OpenProject, ERPNext ops, backups, or "the live apps".
---

# Utho Server Operations (VSJ AI Labs)

The Utho server hosts **two** live apps side by side: **ERPNext v15** (frappe_docker) and **OpenProject 17** (all-in-one). **Always confirm before destructive actions** (down, rm, restore over live data, DNS changes). For a 10-person team; ~2.8 GB of 8 GB RAM used, 4 GB swap.

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

---

# OpenProject (https://pm.vsjailabs.in) — same server

Separate stack: single all-in-one container `openproject` (`openproject/openproject:17`) with its OWN PostgreSQL/memcached/Apache/Puma. Bound to **127.0.0.1:8081**, fronted by its own Nginx vhost + Let's Encrypt cert. Full details in project memory `project_openproject.md`.

- **Status / users:** `docker ps --filter name=openproject` ; users via `docker exec openproject bash -c 'psql "$DATABASE_URL" -c "SELECT id,login,mail,admin,status FROM users ORDER BY id;"'`
- **Rails runner pattern:** `docker exec openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner "<ruby>"'`
- **Reset password / clear lockout** (status: 1=active 3=locked 4=invited; lockout = brute-force, auto-clears or reset `failed_login_count=0`):
  `docker exec -e P="<pw>" openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner "u=User.find(<id>); u.failed_login_count=0; u.activate; u.password=ENV[%q(P)]; u.password_confirmation=ENV[%q(P)]; u.force_password_change=false; u.save!"'`
- **Nginx/SSL:** `/etc/nginx/sites-available/openproject` → `127.0.0.1:8081`; `certbot --nginx ... -d pm.vsjailabs.in --redirect`.
- **Data:** volumes `/opt/openproject/{pgdata,assets}`; secret `/opt/openproject/secret_key_base.txt` (BACK UP — losing it = unreadable encrypted data).

## OpenProject SMTP (Zoho) — see global skill `erpnext-frappe-docker-migration` for the 465 gotcha
Configured in OpenProject Settings (DB): `smtp.zoho.in:465`, **`smtp_ssl=true` + `smtp_enable_starttls_auto=false`** (mandatory on 465; gem default STARTTLS → `EOFError`). Auth+From = `admin@vsjailabs.com` (Zoho `553` if From=`noreply@` group). Do NOT set `smtp_openssl_verify_mode`. Test: `... rails runner "UserMailer.test_mail(User.find(4)).deliver_now"`.

## ⚠️ OpenProject TODO
No backup cron yet — needs daily `pg_dump` (via `docker exec openproject` / `$DATABASE_URL`) + `/opt/openproject/assets` tar.
