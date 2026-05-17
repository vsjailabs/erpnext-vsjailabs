#!/usr/bin/env bash
# backup.sh — create an ERPNext site backup and optionally copy to GCS
# Run this on the VM: sudo bash /opt/erpnext/scripts/backup.sh [gs://your-bucket]
set -euo pipefail

COMPOSE_DIR="/opt/erpnext/frappe_docker"
BACKUP_DIR="/mnt/erpnext-data/backups"
GCS_BUCKET="${1:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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
