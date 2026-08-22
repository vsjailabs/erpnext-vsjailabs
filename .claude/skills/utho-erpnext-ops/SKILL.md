---
name: utho-erpnext-ops
description: Operate the LIVE VSJ AI Labs apps on the Hostinger VPS (93.127.194.189) — 9 apps including ERPNext v15 LTS, OpenProject, and client projects. Use for SSH access, Docker/Compose commands, backups, restore, SSL, branding, SMTP, user management, and troubleshooting. Triggers when the user mentions the server, erp.vsjailabs.in, pm.vsjailabs.in, any hosted domain, ERPNext ops, backups, or "the live apps".
---

# Hostinger Server Operations (VSJ AI Labs)

The Hostinger VPS hosts **three** live apps: **ERPNext v15 LTS** (frappe_docker), **OpenProject v15** (all-in-one), and **Portfolio** (static HTML). **Always confirm before destructive actions** (down, rm, restore over live data, DNS changes).

## Server facts
- **IP:** `93.127.194.189` (Hostinger), Ubuntu 24.04, 2 vCPU / 8 GB / 96 GB
- **URL:** https://erp.vsjailabs.in · **Admin:** `Administrator` / `TempAdmin2026`
- **Site directory name:** `erp.vsjailabs.in` (Nginx `Host` header must match this)
- **Deploy dir:** `/opt/erpnext/frappe_docker/` · **Data:** persistent in compose volumes
- **SSL:** Let's Encrypt, certbot auto-renew
- **Versions (2026-07-01):** Frappe 15.112.1, ERPNext 15.113.0, HRMS 15.62.0 (fresh v15 LTS install 2026-06-24)
- **DB password:** `VsjErp#Db#2026#Fresh`
- **State:** 9 employees (all Active), Holiday List configured, Leave Policy configured. Salary Structures pending. Accounting clean (2026-08-22).

## All hosted apps (as of 2026-08-22)
| App | Domain | Port | Containers |
|-----|--------|------|------------|
| ERPNext v15 LTS | erp.vsjailabs.in | 8080 | 9 |
| OpenProject v15 | pm.vsjailabs.in | 8081 | 1 |
| VSJ Website | vsjailabs.com | 3017 | 1 |
| Aksatyam Portfolio | aksatyam.dev | 3018 | 1 |
| NexaTech Website | nexatechsol.in, nexatech.vsjailabs.in | 3019 | 1 |
| CloudOne | cloudone.vsjailabs.com | 3000 | 2 |
| Jimmy Collection | jc.vsjailabs.in | 3021 | 5 |
| TPE Renewal | renewal.vsjailabs.com | 3022 | 1 |
| SWAG Illustration | illustration.vsjailabs.com | 8000 | 1 |
| Portfolio | portfolio.vsjailabs.in | static | 0 |

Total: 22 containers, 11 Nginx vhosts, 11 SSL certs.

## SSH access
Key-based only (password auth disabled). **MUST use `-o IdentitiesOnly=yes`** to avoid fail2ban bans from SSH agent offering wrong keys.
```bash
ssh -i ~/.ssh/hostinger_vsjailabs -o IdentitiesOnly=yes root@93.127.194.189
```

## Docker Compose — ALWAYS all 5 files + `--pull never`
```bash
cd /opt/erpnext/frappe_docker
docker compose -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  -f overrides/compose.noproxy.yaml \
  -f overrides/compose.hrms.yaml \
  --env-file .env <command>
```

⚠️ **CRITICAL:** Always use `--pull never` with `up -d` — the `erpnext-hrms:version-15` image is LOCAL only (committed from backend container with HRMS installed). Docker Hub pull will fail.

⚠️ `compose.noproxy.yaml` exposes frontend on `0.0.0.0:8080`; without it host Nginx gets 502.

⚠️ `compose.hrms.yaml` overrides ALL 6 service images (backend, frontend, queue-short, queue-long, scheduler, websocket) to use `erpnext-hrms:version-15`.

## Common tasks
- **Health:** `curl -s https://erp.vsjailabs.in/api/method/ping` → `{"message":"pong"}`
- **Container status:** `docker ps --format '{{.Names}}: {{.Status}}'` (expect 22 containers across all apps)
- **Bench command:** `... exec -T backend bench --site erp.vsjailabs.in <cmd>`
- **Manual backup:** `... exec -T backend bench --site all backup --with-files`
- **Restore (NOTE flags):**
  `... exec -T backend bench --site erp.vsjailabs.in restore <db.sql.gz> --db-root-password "$DB_PASSWORD" --with-public-files <files.tar> --with-private-files <private.tar>`
  (use `.env` `DB_PASSWORD` as root password; this build does NOT accept `--with-files`)
- **Clear cache:** `... exec -T backend bench --site erp.vsjailabs.in clear-cache`
- **Email (Zoho):** Email Domain `vsjailabs.com` + Email Account `Zoho Outgoing` (default sending) — `smtp.zoho.in:465` SSL, `imap.zoho.in:993` SSL, from `admin@vsjailabs.com`. Reconfigured 2026-06-21 (lost during v16 migration).
- **HRMS:** `hrms 16.10.0` installed. Modules: HR + Payroll. Employee naming = series `HR-EMP-.#####`. 9 employees (HR-EMP-00001 to 00009, all Active).
- **Departments:** Management, Operations, Accounts, R&D, Quality Management (all suffixed `- VSJAL`).
- **Branches:** Head Office - Bihar (all current employees), Branch Office - Gurugram (for future hires).
- **Users:** 10 employee user accounts. Temp password: `Vsj@2026#ERP!`. Super admins: `admin@vsjailabs.com` (Satyam/CTO), `sarita.balwant@vsjailabs.com` (Sarita/CFO) — System Manager + Administrator roles.
- **Salary Structures:** "VSJ Standard" (submitted) for full-time staff, base ₹14,326 (Bihar Skilled Min Wage). "VSJ Contract Hourly" (submitted) for contract, ₹200/hr max 100 hrs = ₹20,000/mo.
- **Holiday List:** `VSJ AI Labs - FY 2026-27` (Apr 2026 – Mar 2027) — 65 days: 16 gazetted + 49 Sundays. Set as company default + all employees.
- **Leave Policies:** Standard (`HR-LPOL-2026-00001`: CL 12 + SL 12 + PL 15). 6 Leave Policy Assignments (submitted). 18 Leave Allocations (submitted, pro-rated).
- v15 uses `holiday_list` field on Employee/Company directly (NOT Holiday List Assignment doctype from v16).
- **Salary Component GL Accounts:** All 9 components mapped. Earnings → `Salary - VSJAL`, Deductions → `TDS on Salary Payable - VSJAL`.
- **Payroll Payable Account:** `Payroll Payable - VSJAL` (account_type = "Payable"). Must be set before first payroll run.
- **June 2026 Payroll:** HR-PRUN-2026-00002 (Submitted). 4 salary slips: Chhavi ₹20K (contract), Sohel ₹14,126, Anisha ₹14,126, Juli ₹6,780 (pro-rated). Total net: ₹55,032.48. No PF (startup <20 employees, not EPF registered). Salary structure amended to "VSJ Standard-1" (PF removed).
- **Sangeeta Balwant (VSJAL-EMP-0011):** Contract consultant, Apr 13 – Jul 18, 2026 (Left). 220 hrs × ₹400/hr = ₹88,000. Retroactive payroll across 4 PEs: Apr ₹16,400 (HR-PRUN-2026-00003), May ₹28,000 (00005), Jun ₹27,200 (00006), Jul ₹16,400 (00007). SSA base updated via MariaDB before each PE. No user account.
- **DB direct query:** `... exec -T db mariadb -u root -pVsjErp#Db#2026#Fresh _c7e31ac4989afd0a -N -e "<SQL>"`
- **apps.txt gotcha:** After upgrade/rebuild, verify `sites/apps.txt` contains `hrms`. Missing = "Module Payroll not found" errors.

## Updating ERPNext / HRMS

**⚠️ CUSTOM IMAGE REQUIRED** — HRMS is NOT in the official `frappe/erpnext` image. A locally committed image `erpnext-hrms:version-15` is used.

### Update procedure
```bash
ssh -i ~/.ssh/hostinger_vsjailabs -o IdentitiesOnly=yes root@93.127.194.189
cd /opt/erpnext/frappe_docker
COMPOSE="docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml -f overrides/compose.hrms.yaml --env-file .env"

# 1. Backup
$COMPOSE exec -T backend bench --site erp.vsjailabs.in backup --with-files

# 2. Update HRMS in backend
$COMPOSE exec -T backend bash -c 'cd /home/frappe/frappe-bench && bench get-app hrms --branch version-15 && pip install -e apps/hrms'

# 3. Rebuild assets
$COMPOSE exec -T backend bench build --app hrms

# 4. Copy HRMS assets to shared volume (for frontend)
$COMPOSE exec -T backend bash -c 'rm -rf /home/frappe/frappe-bench/sites/assets/hrms && cp -r /home/frappe/frappe-bench/apps/hrms/hrms/public /home/frappe/frappe-bench/sites/assets/hrms'

# 5. Commit backend as new image
docker commit frappe_docker-backend-1 erpnext-hrms:version-15

# 6. Recreate all containers with updated image
$COMPOSE down
$COMPOSE up -d --pull never

# 7. Run migrations
$COMPOSE exec -T backend bench --site erp.vsjailabs.in migrate

# 8. Clear cache
$COMPOSE exec -T backend bench --site erp.vsjailabs.in clear-cache
```

**DO NOT use** `docker compose pull` alone — it will pull the base image without HRMS.
**DO NOT use** `bench update` — it fails in frappe_docker.

## Host Nginx & SSL
- ERPNext: `/etc/nginx/sites-available/erpnext` → `127.0.0.1:8080` with `Host: erp.vsjailabs.in`
- OpenProject: `/etc/nginx/sites-available/openproject` → `127.0.0.1:8081`
- Re-provision SSL: `certbot --nginx --non-interactive --agree-tos --email vsjailabs@gmail.com -d erp.vsjailabs.in --redirect`

## Security Controls (updated 2026-07-04)
- **SSH:** Key-only, `X11Forwarding no`, `LoginGraceTime 30`, `ClientAliveInterval 300`, cloud-init fixed
- **Firewall:** UFW — 22/80/443 only
- **fail2ban:** 3 jails: sshd (3/24hr), nginx-http-auth (5/1hr), nginx-limit-req (10/1hr)
- **Nginx:** `server_tokens off`, security headers + HSTS on all 5 sites
- **Kernel:** `send_redirects=0`, `accept_source_route=0`, `log_martians=1`
- **Auto updates:** `unattended-upgrades` enabled
- **Config:** `/etc/fail2ban/jail.local`, `/etc/ssh/sshd_config`, `/etc/sysctl.d/99-security.conf`

## Backup Strategy
| Service | Schedule | Method | Log |
|---|---|---|---|
| ERPNext | 2 AM daily | `bench backup --with-files` | `/var/log/erpnext-backup.log` |
| OpenProject | 3 AM daily | pg_dump + assets tar (30-day retention) | `/var/log/openproject-backup.log` |

## Disk Cleanup (safe — no impact on running apps)
```bash
ssh -i ~/.ssh/hostinger_vsjailabs -o IdentitiesOnly=yes root@93.127.194.189 "docker builder prune -a -f && docker volume prune -f && apt clean && journalctl --vacuum-size=10M && df -h /"
```
⚠️ Do NOT use `docker system prune -a` (removes custom images). Do NOT prune volumes while containers are down.

## Monitoring
```bash
ssh -i ~/.ssh/hostinger_vsjailabs -o IdentitiesOnly=yes root@93.127.194.189 "echo '--- Docker ---' && docker ps --format 'table {{.Names}}\t{{.Status}}' && \
  echo '--- Disk ---' && df -h / && echo '--- Memory ---' && free -h && \
  echo '--- HTTP ---' && curl -s -o /dev/null -w 'ERPNext: %{http_code}\n' https://erp.vsjailabs.in && \
  curl -s -o /dev/null -w 'OpenProject: %{http_code}\n' https://pm.vsjailabs.in && \
  echo '--- Security ---' && ufw status | head -3 && \
  fail2ban-client status sshd | grep 'Currently banned'"
```

---

# OpenProject (https://pm.vsjailabs.in) — same server

Single all-in-one container `openproject` (`openproject/openproject:15`) with PostgreSQL/memcached/Apache/Puma. Bound to **127.0.0.1:8081**, Nginx vhost + Let's Encrypt cert.

⚠️ **Enterprise override:** Boards/enterprise features unlocked via monkey-patch initializer at `/app/config/initializers/enterprise_override.rb` INSIDE the container. Lost on recreation — must re-apply.
⚠️ **Board creation:** NEVER create boards via Rails runner — always use the browser UI. Rails runner boards show duplicate/empty data.

- **Users:** `docker exec openproject bash -c 'psql "$DATABASE_URL" -c "SELECT id,login,mail,admin,status FROM users ORDER BY id;"'`
- **Rails runner:** `docker exec openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner "<ruby>"'`
- **Create user:** See project memory `project_openproject.md`
- **SMTP:** `smtp.zoho.in:465`, `smtp_ssl=true`, `smtp_enable_starttls_auto=false`, from `admin@vsjailabs.com`
- **Data:** volumes `/opt/openproject/{pgdata,assets}`; secret `/opt/openproject/secret_key_base.txt` (BACK UP)

---

# ERPNext Payroll Operations

HRMS 16.10.0 installed. Payroll module included (HR + Payroll modules in HRMS v16).

## Authentication for API calls
```bash
# Login + store cookies
curl -sc /tmp/erp_cookies.txt "https://erp.vsjailabs.in/api/method/login" \
  -d "usr=Administrator&pwd=<password>"

# Extract SID (= CSRF token in Frappe)
SID=$(grep -oP '(?<=\tsid\t)\S+' /tmp/erp_cookies.txt)

# Use in POST/PUT
curl -b /tmp/erp_cookies.txt -X PUT "https://erp.vsjailabs.in/api/resource/..." \
  -H "X-Frappe-CSRF-Token: $SID" -H "Content-Type: application/json" -d '{...}'
```

## Holiday List & Leave (configured 2026-07-06)

### Holiday List — "India Holidays 2026"
- **Period:** 2026-01-01 to 2026-12-31, Country: India
- **Weekly off:** Sunday (auto-added)
- **2nd & 4th Saturday:** Every month as holidays
- **National holidays:** 24 gazetted (Republic Day, Independence Day, Diwali, etc.)
- **Total:** 48 holidays (excl Sundays added via weekly off)
- **Linked to:** Company (default) + all 6 employees

### Leave Policy — "Standard Leave Policy 2026" (HR-LPOL-2026-00001)
| Leave Type | Annual | Carry Forward |
|---|---|---|
| Casual Leave | 12 | No |
| Sick Leave | 12 | No |
| Privilege Leave | 15 | Yes |

- **Leave Period:** HR-LPR-2026-00001 (2026-01-01 to 2026-12-31)
- **Assignments:** All 6 employees, submitted. Leaves pro-rated (assigned mid-year).
- v15 uses `holiday_list` field on Employee/Company directly (NOT Holiday List Assignment doctype from v16).

## Salary Structure — NOT YET CONFIGURED
Previous v16 had "VSJ Standard-1" (Basic 50% + HRA 20% + SA 30%, PT ₹200) and "VSJ Contract Hourly". Needs to be recreated for v15.

## Key gotchas
- **Payroll Entry submit flow:** Never create salary slips manually before submitting PE — ERPNext creates them internally.
- **Suspended employee:** Temporarily activate → create slip → restore status.
- **v15 Holiday List:** Uses `holiday_list` field on Employee/Company. v16's `Holiday List Assignment` doctype does NOT exist in v15.
- **Naming series reset:** `bench console` → `frappe.db.sql("UPDATE tabSeries SET current=0 WHERE name='HR-PRUN-2026-'")`
- **apps.txt must include hrms:** After upgrades/rebuilds, `echo hrms >> sites/apps.txt` + clear-cache. Without it, HRMS doctypes throw "Module Payroll not found".
- **Bench console pipe pattern:** Use `echo "y" | bench --site erp.vsjailabs.in console << PYEND` for programmatic operations. REST API cookies and direct python both fail.
- **Salary Structure set_name:** Use `ss.insert(ignore_permissions=True, set_name="VSJ Standard")` — autoname is "Prompt".

## User Account Management
- **v15 LTS:** User accounts NOT yet created for 6 employees. Pending setup.
- Temp password convention: `Vsj@2026#ERP!` (ERPNext), `Vsj@2026#User!` (OpenProject)
- Super admins: `admin@vsjailabs.com` (Satyam/CTO), `sarita.balwant@vsjailabs.com` (Sarita/CFO) — System Manager + Administrator + Accounts Manager
- C-suite (CEO/COO): HR Manager + HR User
- Staff/Contract: Employee Self Service only
- Link user to employee: `frappe.db.set_value("Employee", eid, "user_id", email)`
- Password reset: `update_password(email, new_pass)` from `frappe.utils.password`
- **Password reset emails (REST API — bench console silently fails):**
  ```bash
  curl -s -c /tmp/cookie.txt -H 'Host: erp.vsjailabs.in' -X POST 'http://localhost:8080/api/method/login' -d 'usr=Administrator&pwd=TempAdmin2026'
  curl -s -b /tmp/cookie.txt -H 'Host: erp.vsjailabs.in' -X POST 'http://localhost:8080/api/method/frappe.core.doctype.user.user.reset_password' -d 'user=<email>'
  ```
  ⚠️ Must include `-H 'Host: erp.vsjailabs.in'` — localhost without Host header returns 404. All 9 employee password reset emails sent 2026-06-21.
- **user_id requires existing User:** Setting `user_id` on Employee triggers link validation — create the User first, then set `user_id`. Use `flags.ignore_links = True` on Employee save if needed.
- **Education level values:** Only "Graduate", "Post Graduate", "Under Graduate" accepted (not "CBSE", "Btech" etc.).
