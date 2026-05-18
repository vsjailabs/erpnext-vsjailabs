#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-domain.sh — Migrate ERPNext from erp.localhost to a custom domain
#
# Usage (run ON the VM via IAP SSH):
#   sudo bash /opt/erpnext/scripts/setup-domain.sh erp.vsjailabs.in admin@vsjailabs.in
#
# What it does:
#   1. Renames the ERPNext site (bench rename-site)
#   2. Updates Docker Compose .env
#   3. Restarts Docker services
#   4. Reconfigures Nginx with the new domain
#   5. Installs Certbot and provisions Let's Encrypt SSL
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?Usage: setup-domain.sh <domain> <admin-email>}"
ADMIN_EMAIL="${2:?Usage: setup-domain.sh <domain> <admin-email>}"
OLD_SITE="erp.localhost"
COMPOSE_DIR="/opt/erpnext/frappe_docker"

COMPOSE_CMD="docker compose \
  -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  -f overrides/compose.noproxy.yaml \
  --env-file .env"

echo "============================================================"
echo "  ERPNext Domain Migration"
echo "  Old site: ${OLD_SITE}"
echo "  New site: ${DOMAIN}"
echo "  Email:    ${ADMIN_EMAIL}"
echo "============================================================"

# ── Pre-flight: verify DNS resolves to this VM ──────────────────────────────

MY_IP=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" 2>/dev/null || echo "unknown")

RESOLVED_IP=$(dig +short "${DOMAIN}" 2>/dev/null | head -1)

if [ "${RESOLVED_IP}" != "${MY_IP}" ]; then
  echo ""
  echo "WARNING: DNS for ${DOMAIN} resolves to '${RESOLVED_IP}'"
  echo "         but this VM's external IP is '${MY_IP}'."
  echo ""
  echo "SSL provisioning will FAIL if DNS is not pointing here."
  read -r -p "Continue anyway? (y/N): " CONFIRM
  if [[ ! "${CONFIRM}" =~ ^[Yy] ]]; then
    echo "Aborted. Add an A record for ${DOMAIN} → ${MY_IP} and try again."
    exit 1
  fi
fi

# ── Step 1: Rename the ERPNext site ─────────────────────────────────────────

echo ""
echo "[1/5] Renaming site: ${OLD_SITE} → ${DOMAIN}"
cd "${COMPOSE_DIR}"

# Check if old site still exists (idempotent — skip if already renamed)
SITE_EXISTS=$(${COMPOSE_CMD} exec -T backend \
  bench --site "${OLD_SITE}" show-config 2>&1 || echo "NOT_FOUND")

if echo "${SITE_EXISTS}" | grep -q "NOT_FOUND\|does not exist"; then
  echo "  Site '${OLD_SITE}' not found — may already be renamed. Checking '${DOMAIN}'..."
  ${COMPOSE_CMD} exec -T backend bench --site "${DOMAIN}" show-config >/dev/null 2>&1 \
    && echo "  Site '${DOMAIN}' already exists. Skipping rename." \
    || { echo "  ERROR: Neither site exists!"; exit 1; }
else
  ${COMPOSE_CMD} exec -T backend \
    bench rename-site "${OLD_SITE}" "${DOMAIN}" --no-email
  echo "  Site renamed successfully."
fi

# ── Step 2: Update Docker Compose .env ──────────────────────────────────────

echo ""
echo "[2/5] Updating .env SITES variable"
sed -i "s|SITES=.*|SITES=\`${DOMAIN}\`|" "${COMPOSE_DIR}/.env"
echo "  .env updated."

# ── Step 3: Restart Docker services ─────────────────────────────────────────

echo ""
echo "[3/5] Restarting Docker Compose services"
cd "${COMPOSE_DIR}"
${COMPOSE_CMD} restart
echo "  Waiting 20s for services to stabilize..."
sleep 20
echo "  Services restarted."

# ── Step 4: Update Nginx config ─────────────────────────────────────────────

echo ""
echo "[4/5] Updating Nginx configuration"

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
        proxy_set_header    Host              ${DOMAIN};
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_set_header    Upgrade           \$http_upgrade;
        proxy_set_header    Connection        "upgrade";
    }

    location /assets/ {
        proxy_pass         http://erpnext_backend;
        proxy_cache_valid  200 1d;
        add_header         Cache-Control "public, max-age=86400";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/erpnext /etc/nginx/sites-enabled/erpnext
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "  Nginx updated and restarted."

# ── Step 5: Provision SSL with Let's Encrypt ────────────────────────────────

echo ""
echo "[5/5] Provisioning SSL certificate via Let's Encrypt"

apt-get install -y certbot python3-certbot-nginx >/dev/null 2>&1

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email "${ADMIN_EMAIL}" \
  -d "${DOMAIN}" \
  --redirect

echo ""
echo "============================================================"
echo "  Domain migration complete!"
echo ""
echo "  HTTPS: https://${DOMAIN}"
echo "  HTTP automatically redirects to HTTPS"
echo ""
echo "  SSL auto-renew: certbot renew (runs via systemd timer)"
echo "============================================================"
