# ERPNext on GCP — vsjailabs

Deploys [ERPNext](https://erpnext.com) (version 15) on a GCP Compute Engine VM
using Terraform + Docker Compose (frappe_docker) with hardened security defaults.

## Architecture

```
Internet
   │  :80/:443
   ▼
Static IP → Nginx (on VM)
   │  localhost:8080
   ▼
frappe_docker (Docker Compose)
 ├── frontend  (Nginx + assets)
 ├── backend   (Frappe/ERPNext app)
 ├── worker-*  (background jobs)
 ├── scheduler
 ├── db        (MariaDB — persistent disk, localhost only)
 └── redis-cache / redis-queue

SSH: IAP tunnel only (no public port 22)
Secrets: GCP Secret Manager
State: GCS remote backend
Backups: Daily to GCS (30-day retention)
Monitoring: Uptime check + CPU/disk alerts
```

**GCP resources created:**
- Custom VPC with Cloud NAT (not default network)
- `e2-standard-4` Compute Engine VM (Ubuntu 22.04)
- 50 GB SSD boot disk + 100 GB SSD data disk
- Static external IP
- Hardened firewall rules (HTTP/HTTPS public, SSH via IAP only)
- Secret Manager secrets (3 passwords)
- GCS backup bucket with lifecycle policy
- Monitoring uptime check + alert policies
- Service account (logging, monitoring, secrets, storage)

## Prerequisites

| Tool | Version |
|------|---------|
| [Terraform](https://developer.hashicorp.com/terraform/install) | >= 1.5 |
| [gcloud CLI](https://cloud.google.com/sdk/docs/install) | latest |

```bash
gcloud auth login
gcloud auth application-default login
```

## Quick Start

### 1. Deploy (interactive setup)

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

If no `terraform.tfvars` exists, the script will interactively prompt for:
- GCP project ID (creates the project if needed)
- Region, zone, machine type
- Passwords (hidden input)
- Optional domain and admin email

Or configure manually:
```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform/terraform.tfvars — change all passwords!
./scripts/deploy.sh
```

### 2. Wait for setup (~10 minutes)

Watch progress via IAP tunnel:
```bash
gcloud compute ssh erpnext-vm --zone=us-central1-a --tunnel-through-iap \
  -- sudo tail -f /var/log/erpnext-startup.log
```

### 3. Access ERPNext

Open `http://<EXTERNAL_IP>` in your browser.

- **Username:** `Administrator`
- **Password:** value of `admin_password` from your setup

## SSH Access

Direct SSH is disabled. Use IAP tunnel:
```bash
gcloud compute ssh erpnext-vm --zone=us-central1-a --tunnel-through-iap
```

Or use the convenience script for port forwarding:
```bash
./scripts/ssh-tunnel.sh
# Opens http://localhost:8080
```

## Backups

Automated daily backups run at 2 AM to GCS. Manual backup:
```bash
# On the VM:
sudo bash /opt/erpnext/scripts/backup.sh
```

## Custom Domain + SSL

Set `domain = "erp.yourdomain.com"` and `admin_email = "you@example.com"` in
`terraform.tfvars`. Point your DNS A record to the static IP **before** running
`deploy.sh`. Certbot (Let's Encrypt) runs automatically.

## Destroy

```bash
./scripts/deploy.sh --destroy
```

## Security Features

- **No public SSH** — port 22 restricted to GCP IAP range (`35.235.240.0/20`)
- **No exposed app port** — port 8080 not in any firewall rule
- **Secret Manager** — passwords stored in GCP Secret Manager, not instance metadata
- **Custom VPC** — isolated network with explicit firewall rules (default-deny ingress)
- **Cloud NAT** — outbound internet without exposing internal IPs
- **Remote state** — Terraform state in GCS with versioning
- **Automated backups** — daily to GCS with 30-day retention
- **Monitoring** — uptime checks, CPU/disk alerts via email

## Documentation

- **[End User Guide](docs/ERPNext_End_User_Guide_v1.0.docx)** — Enterprise-grade DOCX covering all 19 ERPNext roles, module access matrices, permissions, common workflows (P2P, O2C, leave, expense), security best practices, FAQ, and glossary.

To regenerate the guide:
```bash
python3 docs/generate_user_guide.py
```

## File Layout

```
.
├── docs/
│   ├── ERPNext_End_User_Guide_v1.0.docx  # End user guide (19 roles)
│   └── generate_user_guide.py            # Script to regenerate the guide
├── terraform/
│   ├── main.tf              # Provider + API enablements
│   ├── network.tf           # VPC, subnet, Cloud NAT, firewall rules
│   ├── secrets.tf           # Secret Manager secrets + IAM
│   ├── compute.tf           # Disks, VM, service account
│   ├── backup.tf            # GCS bucket + lifecycle policy
│   ├── monitoring.tf        # Uptime check, alert policies
│   ├── backend.tf           # GCS remote state
│   ├── variables.tf         # All configuration variables
│   ├── outputs.tf           # Deployment outputs
│   ├── startup.sh           # VM cloud-init script
│   └── terraform.tfvars.example
├── docker/
│   └── docker-compose.override.yml   # Local dev helper
├── nginx/
│   └── erpnext.conf         # Nginx reverse-proxy config reference
└── scripts/
    ├── deploy.sh            # Full deployment wrapper (project + infra)
    ├── backup.sh            # Site backup to GCS
    └── ssh-tunnel.sh        # IAP tunnel for local access
```
