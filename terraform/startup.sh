#!/bin/bash
set -euo pipefail
exec > /var/log/erpnext-startup.log 2>&1

echo "[$(date)] Starting ERPNext VM setup..."

# ── Helper: read instance metadata ───────────────────────────────────────────

get_meta() {
  curl -sf -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" 2>/dev/null || echo ""
}

# ── Helper: read from Secret Manager (no gcloud needed) ─────────────────────

get_secret() {
  local project_id secret_name access_token result attempt
  project_id=$(curl -sf -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/project/project-id")
  secret_name="$1"

  for attempt in 1 2 3 4 5; do
    access_token=$(curl -sf -H "Metadata-Flavor: Google" \
      "http://metadata.google.internal/computeMetadata/v1/instance/service-account/default/token" \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])') || true

    if [ -n "${access_token}" ]; then
      result=$(curl -sf -H "Authorization: Bearer ${access_token}" \
        "https://secretmanager.googleapis.com/v1/projects/${project_id}/secrets/${secret_name}/versions/latest:access" \
        | python3 -c 'import sys,json,base64; print(base64.b64decode(json.load(sys.stdin)["payload"]["data"]).decode())') || true

      if [ -n "${result}" ]; then
        echo "${result}"
        return 0
      fi
    fi

    echo "[$(date)] Secret fetch attempt ${attempt}/5 for ${secret_name} failed, retrying in 10s..." >&2
    sleep 10
  done

  echo "[$(date)] WARNING: Failed to fetch secret ${secret_name} after 5 attempts" >&2
  return 1
}

# ── System packages ──────────────────────────────────────────────────────────

apt-get update -y
apt-get install -y \
  curl git ca-certificates gnupg lsb-release \
  python3-pip python3-dev python3-setuptools \
  build-essential libjpeg-dev libffi-dev libssl-dev \
  nfs-common cron

# ── Mount data disk ──────────────────────────────────────────────────────────

DATA_DEVICE="/dev/disk/by-id/google-erpnext-data"
DATA_MOUNT="/mnt/erpnext-data"

if [ ! -f /etc/.data-disk-formatted ]; then
  mkfs.ext4 -F "${DATA_DEVICE}"
  touch /etc/.data-disk-formatted
fi

mkdir -p "${DATA_MOUNT}"
mount "${DATA_DEVICE}" "${DATA_MOUNT}" || true

if ! grep -q "google-erpnext-data" /etc/fstab; then
  echo "${DATA_DEVICE}  ${DATA_MOUNT}  ext4  defaults,nofail  0  2" >> /etc/fstab
fi

# ── Install Docker ───────────────────────────────────────────────────────────

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

# ── Clone frappe_docker ──────────────────────────────────────────────────────

DEPLOY_DIR="/opt/erpnext"
mkdir -p "${DEPLOY_DIR}"

cd "${DEPLOY_DIR}"
if [ ! -d frappe_docker ]; then
  git clone --depth 1 https://github.com/frappe/frappe_docker.git
fi
cd frappe_docker

# ── Read secrets from Secret Manager + metadata ─────────────────────────────

echo "[$(date)] Fetching secrets from Secret Manager..."
DB_ROOT_PASS=$(get_secret "erpnext-db-root-password" || echo "")
DB_PASS=$(get_secret "erpnext-db-password" || echo "")
ADMIN_PASS=$(get_secret "erpnext-admin-password" || echo "")

ERPNEXT_VER=$(get_meta erpnext_version)
DOMAIN_NAME=$(get_meta domain)
ADMIN_EMAIL=$(get_meta admin_email)
BACKUP_BUCKET=$(get_meta backup_bucket)

: "${DB_ROOT_PASS:=ChangeMe_RootPass123}"
: "${DB_PASS:=ChangeMe_DbPass123}"
: "${ADMIN_PASS:=ChangeMe_AdminPass123}"
: "${ERPNEXT_VER:=version-15}"

# Site name: use domain if set, otherwise default to erp.localhost
if [ -n "${DOMAIN_NAME}" ]; then
  SITE_NAME="${DOMAIN_NAME}"
else
  SITE_NAME="erp.localhost"
fi

echo "[$(date)] Secrets loaded successfully. Site name: ${SITE_NAME}"

# ── Symlink data volumes to persistent disk ──────────────────────────────────

mkdir -p "${DATA_MOUNT}"/{mariadb,redis,sites,logs,backups}
mkdir -p volumes
ln -sfn "${DATA_MOUNT}/mariadb"  volumes/db
ln -sfn "${DATA_MOUNT}/redis"    volumes/redis-cache
ln -sfn "${DATA_MOUNT}/sites"    volumes/sites
ln -sfn "${DATA_MOUNT}/logs"     volumes/logs

# ── Write .env ───────────────────────────────────────────────────────────────

cat > "${DEPLOY_DIR}/frappe_docker/.env" <<EOF
ERPNEXT_VERSION=${ERPNEXT_VER}
FRAPPE_VERSION=${ERPNEXT_VER}
DB_PASSWORD=${DB_PASS}
DB_ROOT_PASSWORD=${DB_ROOT_PASS}
SITES=\`${SITE_NAME}\`
INSTALL_APPS=erpnext
EOF

# ── Start Docker services ───────────────────────────────────────────────────

docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               pull

docker compose -f compose.yaml \
               -f overrides/compose.mariadb.yaml \
               -f overrides/compose.redis.yaml \
               -f overrides/compose.noproxy.yaml \
               --env-file .env \
               up -d

echo "[$(date)] Waiting for MariaDB to be ready..."
sleep 30

# ── Create ERPNext site ──────────────────────────────────────────────────────

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

# ── Nginx reverse proxy ─────────────────────────────────────────────────────

apt-get install -y nginx

if [ -n "${DOMAIN_NAME}" ]; then
  SERVER_NAME="${DOMAIN_NAME}"
else
  SERVER_NAME="_"
fi

# Skip Nginx config if Certbot has already configured it (preserve SSL on reboot)
if grep -q "managed by Certbot" /etc/nginx/sites-available/erpnext 2>/dev/null; then
  echo "[$(date)] Nginx already configured by Certbot — skipping overwrite"
else
  cat > /etc/nginx/sites-available/erpnext <<NGINX
upstream erpnext_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name ${SERVER_NAME};

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
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_valid  200 1d;
        add_header         Cache-Control "public, max-age=86400";
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/erpnext /etc/nginx/sites-enabled/erpnext
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t && systemctl restart nginx

# ── Optional: Let's Encrypt SSL (when domain is configured) ─────────────────

if [ -n "${DOMAIN_NAME}" ] && [ -n "${ADMIN_EMAIL}" ]; then
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "${ADMIN_EMAIL}" \
    -d "${DOMAIN_NAME}" || true
fi

# ── Backup script + daily cron ───────────────────────────────────────────────

mkdir -p /opt/erpnext/scripts

cat > /opt/erpnext/scripts/backup.sh <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail

COMPOSE_DIR="/opt/erpnext/frappe_docker"
BACKUP_DIR="/mnt/erpnext-data/backups"
GCS_BUCKET="${1:-}"
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

if [ -n "${GCS_BUCKET}" ]; then
  gsutil -m rsync -r "${BACKUP_DIR}" "${GCS_BUCKET}/backups/"
  echo "Backed up to ${GCS_BUCKET}/backups/"
fi
BACKUP

chmod +x /opt/erpnext/scripts/backup.sh

if [ -n "${BACKUP_BUCKET}" ] && [ ! -f /etc/cron.d/erpnext-backup ]; then
  cat > /etc/cron.d/erpnext-backup <<CRON
0 2 * * * root /opt/erpnext/scripts/backup.sh gs://${BACKUP_BUCKET} >> /var/log/erpnext-backup.log 2>&1
CRON
  echo "[$(date)] Daily backup cron installed (2 AM → gs://${BACKUP_BUCKET})"
fi

echo "[$(date)] ERPNext setup complete!"
