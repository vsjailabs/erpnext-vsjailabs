# ERPNext on GCP — vsjailabs

Deploys [ERPNext](https://erpnext.com) (version 15) on a GCP Compute Engine VM
using Terraform + Docker Compose (frappe_docker).

## Architecture

```
Internet
   │  :80/:443
   ▼
Nginx (on VM)
   │  :8080
   ▼
frappe_docker (Docker Compose)
 ├── frontend  (Nginx + assets)
 ├── backend   (Frappe/ERPNext app)
 ├── worker-*  (background jobs)
 ├── scheduler
 ├── db        (MariaDB — persistent disk)
 └── redis-cache / redis-queue
```

**GCP resources created:**
- `e2-standard-4` Compute Engine VM (Ubuntu 22.04)
- 50 GB SSD boot disk
- 100 GB SSD data disk (MariaDB data, site files, backups)
- Static external IP
- Firewall rules (22, 80, 443)
- Service account (logging + monitoring)

## Prerequisites

| Tool | Version |
|------|---------|
| [Terraform](https://developer.hashicorp.com/terraform/install) | ≥ 1.5 |
| [gcloud CLI](https://cloud.google.com/sdk/docs/install) | latest |

```bash
gcloud auth login
gcloud auth application-default login
```

## Quick Start

### 1. Configure credentials

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform/terraform.tfvars — change all passwords!
```

### 2. Deploy

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Terraform will print the VM's external IP when done.
The VM startup script installs Docker and ERPNext (~10 min).

Watch progress:
```bash
gcloud compute ssh erpnext-vm --zone=us-central1-a \
  -- sudo tail -f /var/log/erpnext-startup.log
```

### 3. Access ERPNext

Open `http://<EXTERNAL_IP>` in your browser.

- **Username:** `Administrator`
- **Password:** value of `admin_password` in your `terraform.tfvars`

## Custom Domain + SSL

Set `domain = "erp.yourdomain.com"` and `admin_email = "you@example.com"` in
`terraform.tfvars`. Point your DNS A record to the static IP **before** running
`deploy.sh`. Certbot (Let's Encrypt) runs automatically.

## Backups

Run on the VM:
```bash
sudo bash /opt/erpnext/scripts/backup.sh gs://your-gcs-bucket
```

## Destroy

```bash
./scripts/deploy.sh --destroy
```

## File Layout

```
.
├── terraform/
│   ├── main.tf                  # VM, disks, firewall, SA
│   ├── variables.tf
│   ├── outputs.tf
│   ├── startup.sh               # Cloud-init script (runs on first boot)
│   └── terraform.tfvars.example
├── docker/
│   └── docker-compose.override.yml   # Local dev helper
├── nginx/
│   └── erpnext.conf             # Nginx reverse-proxy config reference
└── scripts/
    ├── deploy.sh                # Terraform wrapper
    ├── backup.sh                # Site backup helper
    └── ssh-tunnel.sh            # IAP tunnel for local access
```
