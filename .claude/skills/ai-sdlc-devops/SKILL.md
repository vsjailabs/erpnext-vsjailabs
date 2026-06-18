# AI SDLC — Phase 4: DevOps, Deployment & Infrastructure

## Purpose
Automate deployments, infrastructure management, monitoring, backups, and CI/CD for the VSJ AI Labs Utho server stack.

## When to use
- User says "deploy", "update server", "check infra", "backup", "SSL", "nginx"
- Server maintenance, container updates, or infrastructure changes
- Setting up CI/CD pipelines or monitoring

## Infrastructure Overview

### Utho Server (103.127.29.102)
- **OS:** Ubuntu 22.04+
- **CPU/RAM:** 4 shared vCPU / 8 GB RAM
- **Disk:** 160 GB NVMe SSD (15% used)
- **Access:** `ssh root@103.127.29.102` (key-based from tpe-Mac)

### Services Running

| Service | Container(s) | Port | Domain | Stack |
|---|---|---|---|---|
| ERPNext | 8 containers (frappe_docker) | 8080 | erp.vsjailabs.in | Frappe 15.110, ERPNext 15.111, HRMS 15.61 |
| OpenProject | 1 container (all-in-one) | 8081 | pm.vsjailabs.in | OpenProject 14 |
| Versus Incident | 1 container | 3000 | incidents.vsjailabs.in | Latest |
| Nginx | Host-level | 80/443 | All 3 domains | Reverse proxy + Let's Encrypt |

### Nginx Sites
```
/etc/nginx/sites-enabled/erpnext       → 127.0.0.1:8080
/etc/nginx/sites-enabled/openproject    → 127.0.0.1:8081
/etc/nginx/sites-enabled/versus-incident → 127.0.0.1:3000
```

### SSL Certificates (Let's Encrypt / Certbot)
Auto-renewal via systemd timer. Manual renewal:
```bash
ssh root@103.127.29.102 "certbot renew --dry-run"
```

## Deployment Procedures

### ERPNext Update (with custom HRMS image)
HRMS is NOT in the official frappe/erpnext image. Custom image `erpnext-hrms:version-15` is built locally.

```bash
ssh root@103.127.29.102 "cd /opt/erpnext/frappe_docker && \
  # 1. Backup
  docker compose -f compose.yaml -f overrides/compose.mariadb.yaml \
    -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml \
    --env-file .env exec -T backend bench --site all backup --with-files && \
  # 2. Pull latest base image
  docker pull frappe/erpnext:v15 && \
  # 3. Rebuild custom HRMS image
  docker build -t erpnext-hrms:version-15 -f /opt/erpnext/Dockerfile /opt/erpnext/ && \
  # 4. Restart with new image (never pull — use local)
  docker compose -f compose.yaml -f overrides/compose.mariadb.yaml \
    -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml \
    --env-file .env up -d --pull never && \
  # 5. Run migrations
  docker compose -f compose.yaml -f overrides/compose.mariadb.yaml \
    -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml \
    --env-file .env exec -T backend bench --site erp.vsjailabs.in migrate"
```

### OpenProject Update
```bash
ssh root@103.127.29.102 "cd /opt/openproject && \
  docker compose pull && docker compose up -d"
```

### Versus Incident Update
```bash
ssh root@103.127.29.102 "cd /opt/versus-incident && \
  docker compose pull && docker compose up -d"
```

### New Service Deployment Pattern
```bash
# 1. Create directory and compose file
ssh root@103.127.29.102 "mkdir -p /opt/<service> && cd /opt/<service>"

# 2. Create docker-compose.yml with 127.0.0.1:<port> binding

# 3. Create Nginx site
ssh root@103.127.29.102 "cat > /etc/nginx/sites-available/<service> << 'EOF'
server {
    server_name <subdomain>.vsjailabs.in;
    location / {
        proxy_pass http://127.0.0.1:<port>;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    listen 80;
}
EOF"

# 4. Enable site + test + SSL
ssh root@103.127.29.102 "ln -s /etc/nginx/sites-available/<service> /etc/nginx/sites-enabled/ && \
  nginx -t && systemctl reload nginx && \
  certbot --nginx -d <subdomain>.vsjailabs.in --redirect --non-interactive --agree-tos -m vsjailabs@gmail.com"

# 5. Start containers
ssh root@103.127.29.102 "cd /opt/<service> && docker compose up -d"
```

## Backup Strategy

| Service | Schedule | Method | Retention | Log |
|---|---|---|---|---|
| ERPNext | 2 AM daily | `bench backup --with-files` | In-container | `/var/log/erpnext-backup.log` |
| OpenProject | 3 AM daily | pg_dump + assets tar | 30 days | `/var/log/openproject-backup.log` |
| Versus Incident | Not configured | — | — | — |

### Manual Backup
```bash
# ERPNext
ssh root@103.127.29.102 "cd /opt/erpnext/frappe_docker && \
  docker compose -f compose.yaml -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml \
  --env-file .env exec -T backend bench --site all backup --with-files"

# OpenProject
ssh root@103.127.29.102 "bash /opt/openproject/scripts/backup.sh"
```

## Monitoring Checklist
Quick health check command:
```bash
ssh root@103.127.29.102 "echo '--- Docker ---' && docker ps --format 'table {{.Names}}\t{{.Status}}' && \
  echo '--- Disk ---' && df -h / && echo '--- Memory ---' && free -h && \
  echo '--- HTTP ---' && curl -s -o /dev/null -w 'ERPNext: %{http_code}\n' https://erp.vsjailabs.in && \
  curl -s -o /dev/null -w 'OpenProject: %{http_code}\n' https://pm.vsjailabs.in && \
  curl -s -o /dev/null -w 'Versus: %{http_code}\n' https://incidents.vsjailabs.in"
```

## Rollback Procedures

### ERPNext
```bash
# 1. Stop current
docker compose ... down
# 2. Restore from bench backup
docker compose ... exec -T backend bench --site erp.vsjailabs.in restore <backup-file>
# 3. Restart
docker compose ... up -d
```

### General Docker
```bash
# Revert to previous image
docker compose ... down
# Edit compose to pin previous image tag
docker compose ... up -d
```
