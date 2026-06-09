#!/bin/bash
###############################################################################
# ERPNext Migration Script — GCP to Utho Cloud
# For: VSJ AI Labs | Server: 103.127.29.102
#
# Usage:
#   1. SCP this script + backup files to the Utho server
#   2. SSH into the server as root
#   3. Run: bash migrate-to-utho.sh
#
# This script will:
#   - Install Docker Engine + Docker Compose plugin
#   - Clone frappe_docker
#   - Configure .env with credentials
#   - Start all containers (9 services)
#   - Restore the ERPNext backup (DB + files)
#   - Install and configure Nginx reverse proxy
#   - Provision SSL via Certbot
#   - Apply branding (auto-restored from backup)
#   - Set up daily backup cron
###############################################################################

set -euo pipefail
exec > >(tee /var/log/erpnext-migration.log) 2>&1

echo "============================================================"
echo " ERPNext Migration to Utho Cloud"
echo " $(date)"
echo "============================================================"
echo ""

# ── Configuration ────────────────────────────────────────────────────────────

DOMAIN="erp.vsjailabs.in"
SITE_NAME="erp.vsjailabs.in"
ADMIN_EMAIL="vsjailabs@gmail.com"
ERPNEXT_VER="version-15"
DEPLOY_DIR="/opt/erpnext"
DATA_DIR="/opt/erpnext-data"

# Backup files (expected in same directory as this script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_BACKUP="${SCRIPT_DIR}/20260608_141330-erp_localhost-database.sql.gz"
FILES_BACKUP="${SCRIPT_DIR}/20260608_141330-erp_localhost-files.tar"
PRIVATE_BACKUP="${SCRIPT_DIR}/20260608_141330-erp_localhost-private-files.tar"

# ── Credentials ─────────────────────────────────────────────────────────────
# For a fresh frappe_docker deploy, DB passwords are new (the restore imports
# the old data into this freshly-configured DB). Admin password matches the
# original GCP deployment so login is unchanged after restore.
# Env vars override these defaults if set.

# Set these via environment before running, e.g.:
#   DB_ROOT_PASS=... DB_PASS=... ADMIN_PASS=... bash migrate-to-utho.sh
# NOTE: frappe_docker uses DB_PASS as the MariaDB ROOT password too.
DB_ROOT_PASS="${DB_ROOT_PASS:?set DB_ROOT_PASS}"
DB_PASS="${DB_PASS:?set DB_PASS}"
ADMIN_PASS="${ADMIN_PASS:?set ADMIN_PASS}"

echo "Using deployment credentials (admin password preserved from GCP)."
echo ""

# ── Validate backup files ───────────────────────────────────────────────────

echo "[1/10] Validating backup files..."
MISSING=0
for f in "$DB_BACKUP" "$FILES_BACKUP" "$PRIVATE_BACKUP"; do
  if [ ! -f "$f" ]; then
    echo "  ERROR: Missing backup file: $f"
    MISSING=1
  else
    echo "  OK: $(basename "$f") ($(du -h "$f" | cut -f1))"
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Please place backup files in: $SCRIPT_DIR"
  echo "Expected files:"
  echo "  - 20260608_141330-erp_localhost-database.sql.gz"
  echo "  - 20260608_141330-erp_localhost-files.tar"
  echo "  - 20260608_141330-erp_localhost-private-files.tar"
  exit 1
fi

# ── System packages ─────────────────────────────────────────────────────────

echo ""
echo "[2/10] Installing system packages..."
apt-get update -y
apt-get install -y \
  curl git ca-certificates gnupg lsb-release \
  python3-pip python3-dev python3-setuptools \
  nginx certbot python3-certbot-nginx \
  cron

# ── Install Docker ──────────────────────────────────────────────────────────

echo ""
echo "[3/10] Installing Docker Engine..."
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  echo "  Docker installed: $(docker --version)"
else
  echo "  Docker already installed: $(docker --version)"
fi

# ── Clone frappe_docker ─────────────────────────────────────────────────────

echo ""
echo "[4/10] Setting up frappe_docker..."
mkdir -p "${DEPLOY_DIR}"
cd "${DEPLOY_DIR}"

if [ ! -d frappe_docker ]; then
  git clone --depth 1 https://github.com/frappe/frappe_docker.git
else
  echo "  frappe_docker already cloned"
fi
cd frappe_docker

# ── Create data directories ─────────────────────────────────────────────────

mkdir -p "${DATA_DIR}"/{mariadb,redis,sites,logs,backups}
mkdir -p volumes
ln -sfn "${DATA_DIR}/mariadb"  volumes/db
ln -sfn "${DATA_DIR}/redis"    volumes/redis-cache
ln -sfn "${DATA_DIR}/sites"    volumes/sites
ln -sfn "${DATA_DIR}/logs"     volumes/logs

# ── Write .env ──────────────────────────────────────────────────────────────

echo ""
echo "[5/10] Writing .env configuration..."
cat > "${DEPLOY_DIR}/frappe_docker/.env" <<EOF
ERPNEXT_VERSION=${ERPNEXT_VER}
FRAPPE_VERSION=${ERPNEXT_VER}
DB_PASSWORD=${DB_PASS}
DB_ROOT_PASSWORD=${DB_ROOT_PASS}
SITES=\`${SITE_NAME}\`
INSTALL_APPS=erpnext
EOF
echo "  .env written with site: ${SITE_NAME}"

# ── Pull and start Docker services ──────────────────────────────────────────

echo ""
echo "[6/10] Pulling Docker images (this may take a few minutes)..."
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               pull

echo ""
echo "Starting Docker services..."
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               up -d

echo "Waiting for MariaDB to be ready..."
sleep 30

# Verify containers are running
echo "Container status:"
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               ps

# ── Create site and restore backup ──────────────────────────────────────────

echo ""
echo "[7/10] Creating ERPNext site and restoring backup..."

# Create the site first
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               exec -T backend \
               bench new-site "${SITE_NAME}" \
               --no-mariadb-socket \
               --db-root-password "${DB_ROOT_PASS}" \
               --db-type mariadb \
               --admin-password "${ADMIN_PASS}" \
               --install-app erpnext || true

echo ""
echo "Copying backup files into container..."
docker cp "$DB_BACKUP" frappe_docker-backend-1:/tmp/database.sql.gz
docker cp "$FILES_BACKUP" frappe_docker-backend-1:/tmp/files.tar
docker cp "$PRIVATE_BACKUP" frappe_docker-backend-1:/tmp/private-files.tar

echo "Restoring backup (DB + files)..."
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               exec -T backend \
               bench --site "${SITE_NAME}" restore \
               /tmp/database.sql.gz \
               --db-root-password "${DB_ROOT_PASS}" \
               --with-files /tmp/files.tar \
               --with-private-files /tmp/private-files.tar

echo ""
echo "Running database migrations..."
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               exec -T backend \
               bench --site "${SITE_NAME}" migrate || true

echo "Clearing cache..."
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               exec -T backend \
               bench --site "${SITE_NAME}" clear-cache

# ── Configure Nginx reverse proxy ───────────────────────────────────────────

echo ""
echo "[8/10] Configuring Nginx reverse proxy..."

cat > /etc/nginx/sites-available/erpnext <<NGINX
upstream erpnext_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50m;
    proxy_read_timeout   600s;
    proxy_send_timeout   600s;

    add_header X-Frame-Options       SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy       strict-origin-when-cross-origin;

    location / {
        proxy_pass          http://erpnext_backend;
        proxy_http_version  1.1;
        proxy_set_header    Host              ${SITE_NAME};
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_set_header    Upgrade           \$http_upgrade;
        proxy_set_header    Connection        "upgrade";
    }

    location /assets/ {
        proxy_pass         http://erpnext_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              ${SITE_NAME};
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_valid  200 1d;
        add_header         Cache-Control "public, max-age=86400";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/erpnext /etc/nginx/sites-enabled/erpnext
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx
echo "  Nginx configured and running"

# ── Provision SSL ───────────────────────────────────────────────────────────

echo ""
echo "[9/10] Provisioning SSL certificate..."
echo "  NOTE: DNS must already point ${DOMAIN} to this server's IP"
echo "  If DNS is not ready, SSL will fail — you can re-run certbot later:"
echo "  certbot --nginx --non-interactive --agree-tos --email ${ADMIN_EMAIL} -d ${DOMAIN}"
echo ""

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email "${ADMIN_EMAIL}" \
  -d "${DOMAIN}" || {
    echo "  WARNING: SSL provisioning failed (DNS may not be pointing here yet)"
    echo "  ERPNext is accessible via HTTP at http://$(hostname -I | awk '{print $1}')"
    echo "  Run certbot manually after updating DNS."
  }

# ── Setup backup cron ──────────────────────────────────────────────────────

echo ""
echo "[10/10] Setting up daily backup cron..."

mkdir -p /opt/erpnext/scripts

cat > /opt/erpnext/scripts/backup.sh <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail

COMPOSE_DIR="/opt/erpnext/frappe_docker"
BACKUP_DIR="/opt/erpnext-data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "${COMPOSE_DIR}"

docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               exec -T backend \
               bench --site all backup --with-files

echo "[${TIMESTAMP}] Backup created in ${BACKUP_DIR}"

# Cleanup backups older than 30 days
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +30 -delete
find "${BACKUP_DIR}" -name "*.tar" -mtime +30 -delete
echo "[${TIMESTAMP}] Old backups cleaned up"
BACKUP

chmod +x /opt/erpnext/scripts/backup.sh

if [ ! -f /etc/cron.d/erpnext-backup ]; then
  cat > /etc/cron.d/erpnext-backup <<CRON
0 2 * * * root /opt/erpnext/scripts/backup.sh >> /var/log/erpnext-backup.log 2>&1
CRON
  echo "  Daily backup cron installed (2 AM)"
fi

# ── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "============================================================"
echo " Migration Complete!"
echo "============================================================"
echo ""
echo " Server IP:    $(hostname -I | awk '{print $1}')"
echo " Domain:       ${DOMAIN}"
echo " Site Name:    ${SITE_NAME}"
echo " ERPNext URL:  https://${DOMAIN} (or http://$(hostname -I | awk '{print $1}'))"
echo " Admin Login:  Administrator"
echo ""
echo " Key paths:"
echo "   Deploy:     ${DEPLOY_DIR}/frappe_docker/"
echo "   Data:       ${DATA_DIR}/"
echo "   Nginx:      /etc/nginx/sites-available/erpnext"
echo "   Backup:     /opt/erpnext/scripts/backup.sh"
echo "   Log:        /var/log/erpnext-migration.log"
echo ""
echo " Docker Compose (always use all 4 files):"
echo "   cd ${DEPLOY_DIR}/frappe_docker"
echo "   docker compose -f compose.yaml \\"
echo "     -f overrides/compose.mariadb.yaml \\"
echo "     -f overrides/compose.redis.yaml \\"
echo "     -f overrides/compose.noproxy.yaml \\"
echo "     --env-file .env <command>"
echo ""
echo " Next steps:"
echo "   1. Update GoDaddy DNS: A record 'erp' → $(hostname -I | awk '{print $1}')"
echo "   2. If SSL failed, re-run certbot after DNS propagation"
echo "   3. Test login at https://${DOMAIN}"
echo "   4. Verify branding (should be auto-restored from backup)"
echo "============================================================"
