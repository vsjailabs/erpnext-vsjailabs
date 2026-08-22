# ERPNext VSJ AI Labs — Project Instructions

## Project Overview

ERPNext v15 LTS deployed on Hostinger VPS via Docker Compose (frappe_docker) with custom HRMS image.
Production environment with hardened SSH, UFW firewall, fail2ban, automated backups, and Let's Encrypt SSL.

**LIVE SERVER:** Hostinger VPS 93.127.194.189 — Frappe 15.112.1, ERPNext 15.113.0, HRMS 15.62.0.
**MULTI-APP SERVER:** 9 apps / 22 containers / 11 Nginx vhosts / 11 SSL certs (as of 2026-08-22).
**GCP LEGACY:** Original GCP deployment decommissioned. Terraform files retained for reference.

## Architecture

- **VM:** `e2-standard-2` on custom VPC (`erpnext-vpc`) — no Cloud NAT (static IP handles outbound)
- **App:** frappe_docker (Docker Compose) with MariaDB + Redis in containers
- **Proxy:** Host-level Nginx reverse proxy (port 80/443 → localhost:8080)
- **Domain:** `erp.vsjailabs.in` (HTTPS via Let's Encrypt)
- **Secrets:** GCP Secret Manager (3 secrets: db-root, db, admin passwords)
- **State:** GCS remote backend (`gs://erpnext-staging-tf-state`)
- **Backups:** Daily 2 AM cron → GCS bucket (30-day retention)
- **SSH:** IAP tunnel only — no public port 22
- **Cost:** ~₹5,863/month (optimized from ₹8,840)
- **Branding:** VSJ AI Labs — custom logos, Letter Head, favicon

## Terraform File Layout

| File | Domain |
|------|--------|
| `main.tf` | Provider + API enablements |
| `network.tf` | VPC, subnet, Cloud NAT, firewall rules |
| `secrets.tf` | Secret Manager secrets + IAM |
| `compute.tf` | Disks, VM, service account |
| `backup.tf` | GCS bucket + lifecycle |
| `monitoring.tf` | Uptime check, alert policies |
| `backend.tf` | GCS remote state |
| `startup.sh` | VM cloud-init script |

## Critical Rules

### Docker Compose commands MUST include 4 files
Every `docker compose` invocation needs all of these:
```
-f compose.yaml
-f overrides/compose.mariadb.yaml
-f overrides/compose.redis.yaml
-f overrides/compose.noproxy.yaml
--env-file .env
```
Without `compose.noproxy.yaml`, port 8080 is not exposed and Nginx gets 502.

### Nginx Host header must match the ERPNext site DIRECTORY name
ERPNext is multi-tenant — frappe_docker's frontend Nginx uses `$host` to find the site directory.
The outer Nginx `Host` header MUST match the directory name under `/sites/`, not the public domain.

- **Fresh deploy with domain**: site created as `erp.vsjailabs.in` → `Host: erp.vsjailabs.in` (startup.sh handles this)
- **Migrated from IP-only**: site directory is still `erp.localhost` → `Host: erp.localhost` (even though public domain is different)

Current live state: site directory = `erp.vsjailabs.in`, public domain = `erp.vsjailabs.in`, Host header = `erp.vsjailabs.in`.

### Secret Manager needs retry logic in startup.sh
The `get_secret()` function retries 5 times with 10s backoff. On first boot, the API may not be ready. If secrets fail, MariaDB gets initialized with fallback passwords and requires a full data wipe to fix.

### Never commit terraform.tfvars
Contains plaintext passwords. The `.gitignore` already excludes it.

## Development Workflow

```bash
# Deploy (interactive if no tfvars exists)
./scripts/deploy.sh

# Destroy
./scripts/deploy.sh --destroy

# SSH to VM
gcloud compute ssh erpnext-vm --zone=us-central1-a --tunnel-through-iap

# Watch startup logs
gcloud compute ssh erpnext-vm --zone=us-central1-a --tunnel-through-iap -- sudo tail -f /var/log/erpnext-startup.log

# Manual backup
gcloud compute ssh erpnext-vm --zone=us-central1-a --tunnel-through-iap -- sudo bash /opt/erpnext/scripts/backup.sh
```

## Domain Migration

To migrate a live instance to a new domain, run on the VM:
```bash
sudo bash /opt/erpnext/scripts/setup-domain.sh erp.vsjailabs.in vsjailabs@gmail.com
```
This renames the site, updates .env, reconfigures Nginx, and provisions SSL.

## Branding

VSJ AI Labs branding is configured across three ERPNext DocTypes:
- **Website Settings:** app_name, app_logo (square), splash_image, favicon, banner_image (horizontal)
- **System Settings:** app_name (desk/sidebar title)
- **Letter Head:** "VSJ AI Labs" (default) — horizontal logo + footer for print/email

Logo files on VM: `/files/vsj-logo-square.png`, `/files/vsj-logo-horizontal.png`

To update branding, use the ERPNext REST API from inside the VM (see memory/reference_vm_access.md).
Always run `bench clear-cache` after changes.

## Hostinger VPS (LIVE — migrated from Utho 2026-06-20)

**Server:** 93.127.194.189 (Hostinger, India DC), Ubuntu 24.04, 2 vCPU / 8 GB / 96 GB.
**Services:** ERPNext, OpenProject, VSJ Website, Aksatyam Portfolio, NexaTech, CloudOne, Jimmy Collection, TPE Renewal, SWAG Illustration, Portfolio (static).
**Versions:** Frappe 15.112.1, ERPNext 15.113.0, HRMS 15.62.0. Fresh install 2026-06-24 (wiped v16 data).
**Custom image:** `erpnext-hrms:version-15` (local). All 6 ERPNext services use it via `compose.hrms.yaml`.
**Admin:** Administrator / TempAdmin2026.
**Data:** 9 employees, Holiday List, Leave Policy configured. Salary Structures pending. Accounting: 35 JVs, 55 PEs, 27 PIs (all submitted, no drafts/cancelled as of 2026-08-22).

### Server Security (hardened)
- **SSH:** Key-only auth (`PermitRootLogin prohibit-password`, `PasswordAuthentication no`). `ssh -i ~/.ssh/hostinger_vsjailabs -o IdentitiesOnly=yes root@93.127.194.189`
- **Firewall:** UFW active — ports 22, 80, 443 only.
- **fail2ban:** SSH jail (3 retries → 24hr ban), Nginx jails active. Config: `/etc/fail2ban/jail.local`.
- **Emergency access:** Hostinger VNC web console.

### Docker Compose (5 files + --pull never)
```bash
cd /opt/erpnext/frappe_docker
docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml -f overrides/compose.hrms.yaml --env-file .env <command>
```
Always use `--pull never` with `up -d` — custom image is local only.

### MariaDB Direct Query
```bash
... exec -T db mariadb -u root -pVsjErp#Db#2026#Fresh _c7e31ac4989afd0a -N -e "<SQL>"
```

### GCP/Utho Decommission
Both previous servers decommissioned. GCP snapshots retained: `erpnext-boot-backup-20260608`, `erpnext-data-backup-20260608`.

## Future Work (not yet implemented)

- HTTPS Load Balancer with managed SSL (for HA/multi-zone)
- Cloud SQL MySQL 8.0 (optional, has MariaDB compatibility caveats)
- Cloud Armor WAF
- Multi-zone instance group

## Git Conventions

- Commit messages: imperative mood, explain WHY not WHAT
- One logical change per commit
- `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` is added automatically via global commit template (`~/.gitcommit_template`) — do NOT add it manually in commit messages
- Git identity: `user.name = VSJ AI Labs`, `user.email = vsjailabs@gmail.com`
- Remote: `git@github-vsjailabs:vsjailabs/erpnext-vsjailabs.git` (SSH alias in `~/.ssh/config`)
