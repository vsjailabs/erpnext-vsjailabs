#!/bin/bash
set -euo pipefail
exec > /var/log/erpnext-startup.log 2>&1

echo "[$(date)] Starting ERPNext VM setup..."

# ── System update ─────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y \
  curl git ca-certificates gnupg lsb-release \
  python3-pip python3-dev python3-setuptools \
  build-essential libjpeg-dev libffi-dev libssl-dev \
  nfs-common

# ── Mount data disk ───────────────────────────────────────────────────────────
DATA_DEVICE="/dev/disk/by-id/google-erpnext-data"
DATA_MOUNT="/mnt/erpnext-data"

if [ ! -f /etc/.data-disk-formatted ]; then
  mkfs.ext4 -F "${DATA_DEVICE}"
  touch /etc/.data-disk-formatted
fi

mkdir -p "${DATA_MOUNT}"
mount "${DATA_DEVICE}" "${DATA_MOUNT}" || true
echo "${DATA_DEVICE}  ${DATA_MOUNT}  ext4  defaults,nofail  0  2" >> /etc/fstab

# ── Docker ────────────────────────────────────────────────────────────────────
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
fi

# ── Clone deployment repo ─────────────────────────────────────────────────────
DEPLOY_DIR="/opt/erpnext"
mkdir -p "${DEPLOY_DIR}"

# Use frappe_docker official compose
cd "${DEPLOY_DIR}"
if [ ! -d frappe_docker ]; then
  git clone --depth 1 https://github.com/frappe/frappe_docker.git
fi
cd frappe_docker

# ── Configure environment ─────────────────────────────────────────────────────
# Read secrets from GCP metadata (set during terraform apply via instance metadata)
META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
HEADERS="-H 'Metadata-Flavor: Google'"

get_meta() {
  curl -sf -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" 2>/dev/null || echo ""
}

DB_ROOT_PASS=$(get_meta db_root_password)
DB_PASS=$(get_meta db_password)
ADMIN_PASS=$(get_meta admin_password)
ERPNEXT_VER=$(get_meta erpnext_version)
DOMAIN_NAME=$(get_meta domain)
ADMIN_EMAIL=$(get_meta admin_email)

: "${DB_ROOT_PASS:=ChangeMe_RootPass123}"
: "${DB_PASS:=ChangeMe_DbPass123}"
: "${ADMIN_PASS:=ChangeMe_AdminPass123}"
: "${ERPNEXT_VER:=version-15}"

# Symlink data volumes to the persistent disk
mkdir -p "${DATA_MOUNT}"/{mariadb,redis,sites,logs,backups}
mkdir -p volumes
ln -sfn "${DATA_MOUNT}/mariadb"  volumes/db
ln -sfn "${DATA_MOUNT}/redis"    volumes/redis-cache
ln -sfn "${DATA_MOUNT}/sites"    volumes/sites
ln -sfn "${DATA_MOUNT}/logs"     volumes/logs

# Write .env
cat > "${DEPLOY_DIR}/frappe_docker/.env" <<EOF
ERPNEXT_VERSION=${ERPNEXT_VER}
FRAPPE_VERSION=${ERPNEXT_VER}
DB_PASSWORD=${DB_PASS}
DB_ROOT_PASSWORD=${DB_ROOT_PASS}
SITES=\`erp.localhost\`
INSTALL_APPS=erpnext
EOF

# ── Start services ────────────────────────────────────────────────────────────
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               --env-file .env \
               pull

docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               --env-file .env \
               up -d

# Wait for MariaDB
echo "[$(date)] Waiting for MariaDB to be ready..."
sleep 30

# ── Create site ───────────────────────────────────────────────────────────────
docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               --env-file .env \
               exec -T backend \
               bench new-site erp.localhost \
               --no-mariadb-socket \
               --db-root-password "${DB_ROOT_PASS}" \
               --db-type mariadb \
               --admin-password "${ADMIN_PASS}" \
               --install-app erpnext || true

# ── Nginx reverse proxy ───────────────────────────────────────────────────────
apt-get install -y nginx

# Write nginx config
if [ -n "${DOMAIN_NAME}" ]; then
  SERVER_NAME="${DOMAIN_NAME}"
else
  SERVER_NAME="_"
fi

cat > /etc/nginx/sites-available/erpnext <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 50m;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 600s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/erpnext /etc/nginx/sites-enabled/erpnext
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ── Optional: Let's Encrypt SSL ───────────────────────────────────────────────
if [ -n "${DOMAIN_NAME}" ] && [ -n "${ADMIN_EMAIL}" ]; then
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "${ADMIN_EMAIL}" \
    -d "${DOMAIN_NAME}" || true
fi

echo "[$(date)] ERPNext setup complete!"
