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
Key-based auth is set up on the `tpe` Mac (key installed 2026-06-13):
```bash
ssh utho          # shorthand alias in ~/.ssh/config → root@103.127.29.102
```
`~/.ssh/config` on tpe-Mac:
```
Host utho
    HostName 103.127.29.102
    User root
    IdentityFile ~/.ssh/id_github_vsjailabs
    IdentitiesOnly yes
```
Password fallback (credentials in project memory `project_utho_migration.md`):
```bash
export SSHPASS='<password>'; sshpass -e ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@103.127.29.102
```
pexpect fallback (when sshpass unavailable — Claude sandbox):
```python
import pexpect
child = pexpect.spawn('ssh', ['-o','PreferredAuthentications=password','-o','PubkeyAuthentication=no','-o','StrictHostKeyChecking=no','root@103.127.29.102'], timeout=30, encoding='utf-8')
child.expect('password:'); child.sendline('<password>'); child.expect(r'#', timeout=15)
```

**If the IP is unreachable on TCP** (sandbox content-filter): use the **Utho VNC web console** (Manage Cloud → Console) over HTTPS in a browser.

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
- **Email (Zoho):** Email Account `Zoho Outgoing` (default) — `smtp.zoho.in:465`, `use_ssl_for_outgoing=1` (NOT `use_ssl`, which is incoming), from `admin@vsjailabs.com`. Welcome/queued mail needs scheduler enabled (it is); Frappe is queue-first (`tabEmail Queue` → `frappe.email.queue.flush`). Run frappe code: `echo "import base64;exec(base64.b64decode('<b64>').decode(), {})" | docker compose ... exec -T backend bench --site erp.vsjailabs.in console` (pass `{}` to exec — IPython split namespace breaks comprehensions otherwise).
- **HRMS:** `hrms 15.61.0` installed. Guide: `docs/VSJ_HRMS_Functional_Guide_v1.0.docx`. Employee naming = series `VSJ-EMP-.####` (HR Settings `emp_created_by=Naming Series` + Property Setters on Employee.naming_series `options` AND `default`; clear-cache + browser hard-refresh needed). See global skill `erpnext-frappe-docker-migration` for the reusable naming-series pattern.

## Updating ERPNext / HRMS

**⚠️ CUSTOM IMAGE REQUIRED** — HRMS is NOT in the official `frappe/erpnext:version-15` image. A local image `erpnext-hrms:version-15` is used (built 2026-06-14). `.env` has `CUSTOM_IMAGE=erpnext-hrms` + `CUSTOM_TAG=version-15`.

### Update procedure (whenever ERPNext/HRMS updates are available)

```bash
ssh utho
cd /opt/erpnext/frappe_docker

# 1. Backup first
docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml --env-file .env \
  exec -T backend bench --site erp.vsjailabs.in backup --with-files

# 2. Pull the latest base image
docker pull frappe/erpnext:version-15

# 3. Rebuild custom image with updated HRMS
docker build -t erpnext-hrms:version-15 /opt/erpnext/

# 4. Recreate containers from local image (--pull never prevents Docker Hub lookup)
docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml --env-file .env \
  up -d --force-recreate --pull never

# 5. Run migrations
docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml --env-file .env \
  exec -T backend bench --site erp.vsjailabs.in migrate

# 6. Verify
docker compose ... exec -T backend bench version
curl -s https://erp.vsjailabs.in/api/method/ping
```

**Dockerfile** at `/opt/erpnext/Dockerfile`:
```dockerfile
FROM frappe/erpnext:version-15
RUN bench get-app --branch version-15 --skip-assets hrms
```

**DO NOT use** `docker compose pull` alone — it will pull the base image without HRMS and break the site. Always rebuild the custom image first.

**DO NOT use** `bench update` — it fails in frappe_docker (apps are not git clones, no branch to detect).

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

---

# ERPNext Payroll Operations

ERPNext HRMS (`hrms 15.60.4`) is installed. Payroll configured 2026-06-13 with VSJ Standard structure covering 3 employees with CTC (Sangeeta ₹4.8L, Chhavi ₹6L, Reeta ₹4.8L). Payroll runs: HR-PRUN-2026-00001 (Apr 2026), HR-PRUN-2026-00002 (May 2026).

## Authentication for API calls (Frappe v15)

In Frappe v15, the `sid` cookie value IS the CSRF token — there is no separate `get_csrf_token` endpoint.

```bash
# Login + store cookies
curl -sc /tmp/erp_cookies.txt "https://erp.vsjailabs.in/api/method/login" \
  -d "usr=Administrator&pwd=<password>"

# Extract SID (= CSRF token)
SID=$(grep -oP '(?<=\tsid\t)\S+' /tmp/erp_cookies.txt)

# Use in all POST/PUT
curl -b /tmp/erp_cookies.txt -X PUT "https://erp.vsjailabs.in/api/resource/..." \
  -H "X-Frappe-CSRF-Token: $SID" -H "Content-Type: application/json" -d '{...}'
```

## Correct payroll entry submit flow

**NEVER create salary slips manually before submitting the Payroll Entry.** ERPNext creates them internally during PE submit. Pre-existing slips → "Salary Slip already exists" error.

```
1. POST /api/resource/Payroll Entry  → create Draft PE with employees list
2. frappe.client.submit (PE doc)      → ERPNext creates Draft salary slips
3. frappe.client.submit (each slip)  → mark slips as Submitted
```

If a PE shows `status: "Failed"` (separate from `docstatus`), reset it via PUT before resubmitting:
```json
{"status": "Draft", "salary_slips_created": 0}
```

## Salary structure setup

Structure "VSJ Standard" (docstatus=1, submitted). Must be submitted before slips work.

| Component | Formula |
|---|---|
| Basic | `base * 0.5` |
| HRA | `base * 0.2` |
| Special Allowance | `base * 0.3` |
| PF (deduction) | `base * 0.5 * 0.12` |
| PT (deduction) | ₹200 fixed |

`base` in assignment = monthly gross = CTC / 12.

## Holiday List (mandatory)

"VSJ AI Labs - 2026" — set on Company AND each Employee. Without it, slip creation throws a 417 validation error.

## Suspended employee workaround

ERPNext blocks slip creation for Suspended employees. For a final-month payslip:
```bash
# Temporarily activate
curl ... -X PUT ".../api/resource/Employee/VSJ-EMP-0006" -d '{"status":"Active"}'
# ... create/submit the slip ...
# Restore
curl ... -X PUT ".../api/resource/Employee/VSJ-EMP-0006" -d '{"status":"Suspended"}'
```

## Naming series reset via bench console

When payroll entries are deleted and re-run, the counter stays at the last value. To reset (e.g., `HR-PRUN-2026-`):

```bash
# SSH to Utho server, then:
BACKEND=$(docker ps --filter name=backend -q | head -1)
docker exec -w /home/frappe/frappe-bench $BACKEND bash -c \
  "echo \"frappe.db.sql(\\\"UPDATE tabSeries SET current=0 WHERE name='HR-PRUN-2026-'\\\"); frappe.db.commit()\" \
  | bench --site erp.vsjailabs.in console"
```

Output `((0,),)` = success. Next PE created will be `HR-PRUN-2026-00001`.

`frappe.client.rename_doc` does not work on Payroll Entry — this bench console method is the only way.

## Email payslips

```bash
curl -b /tmp/erp_cookies.txt -X POST \
  "https://erp.vsjailabs.in/api/method/frappe.core.doctype.communication.email.make" \
  -H "X-Frappe-CSRF-Token: $SID" -H "Content-Type: application/json" \
  -d '{
    "doctype": "Salary Slip",
    "name": "HR-EMP-SLIP-2026-00001",
    "recipients": "hr@vsjailabs.com",
    "sender": "admin@vsjailabs.com",
    "subject": "Salary Slip - April 2026",
    "content": "Please find attached your salary slip.",
    "send_email": 1
  }'
```

Zoho SMTP (`smtp.zoho.in:465`) is configured as default outgoing. Emails are queue-first — Frappe scheduler flushes `tabEmail Queue` every ~1 min.

## OpenProject backups ✅
`/opt/openproject/scripts/backup.sh` (cron `/etc/cron.d/openproject-backup`, daily 3 AM, 30-day retention) → `pg_dump "$DATABASE_URL"` gzip + `assets/` tar into `/opt/openproject/backups/`. Log: `/var/log/openproject-backup.log`. Manual run: `bash /opt/openproject/scripts/backup.sh`.
