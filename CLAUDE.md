# ERPNext GCP Deployment — Project Instructions

## Project Overview

ERPNext v15 deployed on GCP Compute Engine via Terraform + Docker Compose (frappe_docker).
Hardened staging environment with custom VPC, Secret Manager, IAP-only SSH, automated backups, and monitoring.

## Architecture

- **VM:** `e2-standard-4` on custom VPC (`erpnext-vpc`) with Cloud NAT
- **App:** frappe_docker (Docker Compose) with MariaDB + Redis in containers
- **Proxy:** Host-level Nginx reverse proxy (port 80 → localhost:8080)
- **Secrets:** GCP Secret Manager (3 secrets: db-root, db, admin passwords)
- **State:** GCS remote backend (`gs://erpnext-staging-tf-state`)
- **Backups:** Daily 2 AM cron → GCS bucket (30-day retention)
- **SSH:** IAP tunnel only — no public port 22

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

### Nginx Host header must be `erp.localhost`
ERPNext is multi-tenant — it only responds to the configured site name. Use:
```
proxy_set_header Host erp.localhost;
```
NOT `$host` (which would send the IP address and get 404).

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

## Future Work (not yet implemented)

- HTTPS Load Balancer with managed SSL (needs domain)
- `bench rename-site` when custom domain is added
- Cloud SQL MySQL 8.0 (optional, has MariaDB compatibility caveats)
- Cloud Armor WAF
- Multi-zone instance group

## Git Conventions

- Commit messages: imperative mood, explain WHY not WHAT
- One logical change per commit
- Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` when AI-assisted
