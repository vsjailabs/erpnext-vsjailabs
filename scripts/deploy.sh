#!/usr/bin/env bash
# deploy.sh — provision ERPNext on GCP using Terraform (hardened staging)
# Usage: ./scripts/deploy.sh [--destroy]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../terraform"
TFVARS="${TF_DIR}/terraform.tfvars"

# ── Preflight ────────────────────────────────────────────────────────────────

require() {
  command -v "$1" &>/dev/null || { echo "ERROR: '$1' not found. Install it first."; exit 1; }
}
require terraform
require gcloud

# Verify gcloud authentication
if ! gcloud auth print-access-token &>/dev/null 2>&1; then
  echo "ERROR: Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

# ── Interactive tfvars generation ────────────────────────────────────────────

if [ ! -f "${TFVARS}" ]; then
  echo "No terraform.tfvars found. Let's create one."
  echo ""

  read -rp "GCP Project ID: " tf_project_id
  read -rp "Region [us-central1]: " tf_region
  tf_region="${tf_region:-us-central1}"
  read -rp "Zone [${tf_region}-a]: " tf_zone
  tf_zone="${tf_zone:-${tf_region}-a}"
  read -rp "Machine type [e2-standard-4]: " tf_machine
  tf_machine="${tf_machine:-e2-standard-4}"
  read -rp "Data disk size GB [100]: " tf_disk
  tf_disk="${tf_disk:-100}"
  read -rp "ERPNext version [version-15]: " tf_version
  tf_version="${tf_version:-version-15}"
  read -rp "Domain (leave empty for IP-only): " tf_domain
  read -rp "Admin email: " tf_email

  echo ""
  echo "Set passwords (input hidden):"
  read -rsp "DB root password: " tf_db_root
  echo
  read -rsp "DB password: " tf_db_pass
  echo
  read -rsp "Admin password: " tf_admin_pass
  echo

  cat > "${TFVARS}" <<EOF
project_id        = "${tf_project_id}"
region            = "${tf_region}"
zone              = "${tf_zone}"
machine_type      = "${tf_machine}"
data_disk_size_gb = ${tf_disk}
erpnext_version   = "${tf_version}"

domain      = "${tf_domain}"
admin_email = "${tf_email}"

db_root_password = "${tf_db_root}"
db_password      = "${tf_db_pass}"
admin_password   = "${tf_admin_pass}"
EOF

  echo ""
  echo "Created ${TFVARS}"
  echo "WARNING: This file contains secrets. Do NOT commit it to git."
  echo ""
fi

# ── Read project ID from tfvars ──────────────────────────────────────────────

PROJECT_ID=$(grep '^project_id' "${TFVARS}" | awk -F'"' '{print $2}')
REGION=$(grep '^region' "${TFVARS}" | awk -F'"' '{print $2}')
REGION="${REGION:-us-central1}"

echo "Using GCP project: ${PROJECT_ID}"

# ── Create project if it doesn't exist ───────────────────────────────────────

if ! gcloud projects describe "${PROJECT_ID}" &>/dev/null 2>&1; then
  echo "Project '${PROJECT_ID}' not found. Creating..."
  gcloud projects create "${PROJECT_ID}" --name="ERPNext Staging" --quiet

  BILLING_ACCOUNT=$(gcloud billing accounts list --format='value(name)' --filter='open=true' | head -1)
  if [ -n "${BILLING_ACCOUNT}" ]; then
    gcloud billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT}" --quiet
    echo "Linked billing account: ${BILLING_ACCOUNT}"
  else
    echo "WARNING: No billing account found. Enable billing manually before deploying."
    echo "  gcloud billing projects link ${PROJECT_ID} --billing-account=YOUR_BILLING_ACCOUNT"
    exit 1
  fi
else
  echo "Project '${PROJECT_ID}' exists."
fi

gcloud config set project "${PROJECT_ID}"

# ── Enable required APIs ─────────────────────────────────────────────────────

APIS=(
  compute.googleapis.com
  dns.googleapis.com
  secretmanager.googleapis.com
  iap.googleapis.com
  monitoring.googleapis.com
  storage.googleapis.com
)

echo "Enabling required APIs..."
for api in "${APIS[@]}"; do
  gcloud services enable "${api}" --project="${PROJECT_ID}" --quiet 2>/dev/null || true
done
echo "APIs enabled."

# ── Create TF state bucket if needed ─────────────────────────────────────────

STATE_BUCKET="erpnext-staging-tf-state"
if ! gcloud storage buckets describe "gs://${STATE_BUCKET}" --project="${PROJECT_ID}" &>/dev/null 2>&1; then
  echo "Creating Terraform state bucket: gs://${STATE_BUCKET}"
  gcloud storage buckets create "gs://${STATE_BUCKET}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --uniform-bucket-level-access \
    --quiet
  gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning --quiet
  echo "State bucket created with versioning enabled."
else
  echo "State bucket gs://${STATE_BUCKET} exists."
fi

# ── Terraform ────────────────────────────────────────────────────────────────

cd "${TF_DIR}"

terraform init -upgrade -reconfigure \
  -backend-config="bucket=${STATE_BUCKET}"

if [[ "${1:-}" == "--destroy" ]]; then
  echo ""
  echo "WARNING: This will destroy all GCP resources!"
  read -rp "Type 'yes' to confirm: " confirm
  [[ "${confirm}" == "yes" ]] || { echo "Aborted."; exit 0; }
  terraform destroy -var-file="${TFVARS}" -auto-approve
  exit 0
fi

terraform validate
terraform plan -var-file="${TFVARS}" -out=tfplan
terraform apply tfplan

echo ""
echo "============================================================"
terraform output
echo "============================================================"
echo ""
echo "ERPNext is being configured on the VM. This takes ~10 minutes."
echo "Check progress:"
echo "  gcloud compute ssh erpnext-vm --zone=$(grep '^zone' "${TFVARS}" | awk -F'"' '{print $2}') --tunnel-through-iap -- sudo tail -f /var/log/erpnext-startup.log"
