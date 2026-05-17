#!/usr/bin/env bash
# backup.sh — create an ERPNext site backup and optionally copy to GCS
# Run on the VM: sudo bash /opt/erpnext/scripts/backup.sh [gs://your-bucket]
# The backup bucket name can also be read from instance metadata if no argument is given.
set -euo pipefail

COMPOSE_DIR="/opt/erpnext/frappe_docker"
BACKUP_DIR="/mnt/erpnext-data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GCS_BUCKET="${1:-}"
if [ -z "${GCS_BUCKET}" ]; then
  BUCKET_NAME=$(curl -sf -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/backup_bucket" 2>/dev/null || echo "")
  if [ -n "${BUCKET_NAME}" ]; then
    GCS_BUCKET="gs://${BUCKET_NAME}"
  fi
fi

cd "${COMPOSE_DIR}"

docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               --env-file .env \
               exec -T backend \
               bench --site erp.localhost backup --with-files

echo "[${TIMESTAMP}] Backup created in ${BACKUP_DIR}"

if [ -n "${GCS_BUCKET}" ]; then
  gsutil -m rsync -r "${BACKUP_DIR}" "${GCS_BUCKET}/backups/"
  echo "Backed up to ${GCS_BUCKET}/backups/"
fi
