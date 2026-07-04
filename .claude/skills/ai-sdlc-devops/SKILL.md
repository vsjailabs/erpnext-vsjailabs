# AI SDLC — Phase 4: DevOps, Deployment & Infrastructure

## Purpose
Automate deployments, infrastructure management, monitoring, backups, and CI/CD for the VSJ AI Labs Hostinger server stack.

## When to use
- User says "deploy", "update server", "check infra", "backup", "SSL", "nginx"
- Server maintenance, container updates, or infrastructure changes
- Setting up CI/CD pipelines or monitoring

## Infrastructure Overview

### Hostinger VPS (93.127.194.189)
- **OS:** Ubuntu 24.04 LTS
- **CPU/RAM:** 2 vCPU / 8 GB RAM
- **Disk:** 96 GB (~13% used as of 2026-07-01)
- **Access:** `ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189` (key-only)

### Security Controls
- **SSH:** Key-only auth (`PermitRootLogin prohibit-password`, `PasswordAuthentication no`, `MaxAuthTries 3`)
- **Firewall:** UFW active — allow 22/tcp, 80/tcp, 443/tcp only
- **fail2ban:** Active with 4 jails:
  - `sshd`: 3 retries → 24hr ban
  - `nginx-http-auth`: 5 retries → 1hr ban
  - `nginx-limit-req`: 10 retries → 1hr ban
  - `niramcare-auth`: 10 retries on /api/ 401/403 → 1hr ban
- **Security headers:** All 6 sites have X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
- **Nginx:** `server_tokens off` — version hidden
- **Rate limiting:** NiramCare `/api/` — 10 req/s per IP (burst 20)
- **SSH hardening:** `X11Forwarding no`, `LoginGraceTime 30`, `ClientAliveInterval 300`, cloud-init password auth fixed
- **Kernel hardening:** `send_redirects=0`, `accept_source_route=0`, `log_martians=1` (`/etc/sysctl.d/99-security.conf`)
- **Auto updates:** `unattended-upgrades` enabled for security patches
- **Config files:** `/etc/fail2ban/jail.local`, `/etc/ssh/sshd_config`, `/etc/fail2ban/filter.d/niramcare-auth.conf`, `/etc/sysctl.d/99-security.conf`

```bash
# Check firewall
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "ufw status verbose"

# Check fail2ban bans
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "fail2ban-client status sshd"

# Unban an IP
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "fail2ban-client unban <IP>"
```

### Services Running

| Service | Container(s) | Port | Domain | Stack |
|---|---|---|---|---|
| ERPNext | 9 containers (frappe_docker) | 8080 | erp.vsjailabs.in | Frappe 15.112.1, ERPNext 15.113.0, HRMS 15.62.0 |
| OpenProject | 1 container (all-in-one) | 8081 | pm.vsjailabs.in | OpenProject 15 |
| Portfolio | 1 container | 3018 | portfolio.vsjailabs.in | aksatyam-portfolio |
| VSJ Website | 1 container | 3017 | vsjailabs.com | vsj-website |
| Aksatyam.dev | 1 container (shared w/ portfolio) | 3018 | aksatyam.dev | aksatyam-portfolio |
| NiramCare Staging | 4 containers (backend, frontend, postgres, redis) | 3000/8082 | stage.niramcare.com | Next.js + Spring Boot |
| Nginx | Host-level | 80/443 | All domains | Reverse proxy + Let's Encrypt |

### Docker Image
Custom local image `erpnext-hrms:version-15` (7.5 GB) — committed from backend container with HRMS installed. Used by ALL 6 app services (backend, frontend, queue-short, queue-long, scheduler, websocket) via `overrides/compose.hrms.yaml`.

### Nginx Sites
```
/etc/nginx/sites-enabled/erpnext       → 127.0.0.1:8080
/etc/nginx/sites-enabled/openproject   → 127.0.0.1:8081
```

## Deployment Procedures

### ERPNext Update (with custom HRMS image)
HRMS is NOT in the official frappe/erpnext image. Custom image `erpnext-hrms:version-15` is used.

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189
cd /opt/erpnext/frappe_docker
COMPOSE="docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml -f overrides/compose.hrms.yaml --env-file .env"

# 1. Backup
$COMPOSE exec -T backend bench --site erp.vsjailabs.in backup --with-files

# 2. Update HRMS in backend container
$COMPOSE exec -T backend bash -c 'cd /home/frappe/frappe-bench && bench get-app hrms --branch version-15 && pip install -e apps/hrms'

# 3. Rebuild assets + copy to shared volume
$COMPOSE exec -T backend bench build --app hrms
$COMPOSE exec -T backend bash -c 'rm -rf /home/frappe/frappe-bench/sites/assets/hrms && cp -r /home/frappe/frappe-bench/apps/hrms/hrms/public /home/frappe/frappe-bench/sites/assets/hrms'

# 4. Commit backend as new image
docker commit frappe_docker-backend-1 erpnext-hrms:version-15

# 5. Recreate all containers (--pull never = use local image)
$COMPOSE down
$COMPOSE up -d --pull never

# 6. Migrate
$COMPOSE exec -T backend bench --site erp.vsjailabs.in migrate

# 7. Clear cache
$COMPOSE exec -T backend bench --site erp.vsjailabs.in clear-cache
```

### OpenProject Update
```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "cd /opt/openproject && \
  docker compose pull && docker compose up -d"
```

### New Service Deployment Pattern
```bash
# 1. Create directory and compose file
mkdir -p /opt/<service>

# 2. Create docker-compose.yml with 127.0.0.1:<port> binding

# 3. Create Nginx site + enable + SSL
cat > /etc/nginx/sites-available/<service> << 'EOF'
server {
    server_name <subdomain>.vsjailabs.in;
    location / {
        proxy_pass http://127.0.0.1:<port>;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    listen 80;
}
EOF
ln -s /etc/nginx/sites-available/<service> /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d <subdomain>.vsjailabs.in --redirect --non-interactive --agree-tos -m vsjailabs@gmail.com

# 4. Start containers
cd /opt/<service> && docker compose up -d

# NOTE: Services on 127.0.0.1 behind Nginx don't need extra UFW rules (80/443 already open)
```

## Backup Strategy

| Service | Schedule | Method | Retention | Log |
|---|---|---|---|---|
| ERPNext | 2 AM daily | `bench backup --with-files` | In-container | `/var/log/erpnext-backup.log` |
| OpenProject | 3 AM daily | pg_dump + assets tar | 30 days | `/var/log/openproject-backup.log` |

## Monitoring Checklist
```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "echo '--- Docker ---' && docker ps --format 'table {{.Names}}\t{{.Status}}' && \
  echo '--- Disk ---' && df -h / && echo '--- Memory ---' && free -h && \
  echo '--- HTTP ---' && curl -s -o /dev/null -w 'ERPNext: %{http_code}\n' https://erp.vsjailabs.in && \
  curl -s -o /dev/null -w 'OpenProject: %{http_code}\n' https://pm.vsjailabs.in && \
  echo '--- Security ---' && ufw status | head -3 && \
  fail2ban-client status sshd | grep 'Currently banned'"
```

## Disk Optimization (periodic — safe for running apps)

Docker build cache grows 10+ GB after custom image builds. Run monthly or when disk > 30%.

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "
  docker builder prune -a -f && \
  docker volume prune -f && \
  apt clean && \
  journalctl --vacuum-size=10M && \
  echo '--- Result ---' && df -h /"
```

⚠️ Do NOT run `docker system prune -a` — it removes unused images including `erpnext-hrms:version-15`.
⚠️ Do NOT run `docker volume prune` while containers are stopped (`docker compose down`) — active volumes temporarily detach.
⚠️ Keep `frappe/erpnext:v15` base image — configurator service references it.

## Rollback Procedures

### ERPNext
```bash
COMPOSE="docker compose -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml -f overrides/compose.hrms.yaml --env-file .env"
# 1. Restore from backup
$COMPOSE exec -T backend bench --site erp.vsjailabs.in restore <backup-file> --db-root-password "$DB_PASSWORD" --with-public-files <files.tar> --with-private-files <private.tar>
# 2. Migrate
$COMPOSE exec -T backend bench --site erp.vsjailabs.in migrate
# 3. Clear cache
$COMPOSE exec -T backend bench --site erp.vsjailabs.in clear-cache
```
