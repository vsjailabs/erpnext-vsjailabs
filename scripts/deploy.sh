#!/usr/bin/env bash
# deploy.sh — provision ERPNext on GCP using Terraform
# Usage: ./scripts/deploy.sh [--destroy]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../terraform"
TFVARS="${TF_DIR}/terraform.tfvars"

# ── Preflight ─────────────────────────────────────────────────────────────────
require() {
  command -v "$1" &>/dev/null || { echo "ERROR: '$1' not found. Install it first."; exit 1; }
}
require terraform
require gcloud

if [ ! -f "${TFVARS}" ]; then
  echo "ERROR: ${TFVARS} not found."
  echo "Copy terraform/terraform.tfvars.example to terraform/terraform.tfvars and fill in your values."
  exit 1
fi

# ── Authenticate with GCP ──────────────────────────────────────────────────────
PROJECT_ID=$(grep '^project_id' "${TFVARS}" | awk -F'"' '{print $2}')
echo "Using GCP project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

# ── Terraform ─────────────────────────────────────────────────────────────────
cd "${TF_DIR}"
terraform init -upgrade

if [[ "${1:-}" == "--destroy" ]]; then
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
echo "Check progress: gcloud compute ssh erpnext-vm -- sudo tail -f /var/log/erpnext-startup.log"
