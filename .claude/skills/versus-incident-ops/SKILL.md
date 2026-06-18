# Versus Incident — Operations Skill

## Purpose
Operational reference for managing the Versus Incident deployment on the VSJ AI Labs Utho server.

## When to use
- User mentions "versus", "incident management app", "incidents.vsjailabs.in"
- Managing teams, configuring alerts, or troubleshooting the incident platform

## Deployment Details

- **Container:** `versus-incident` (ghcr.io/versuscontrol/versus-incident:latest)
- **Deployed:** 2026-06-17
- **Location:** `/opt/versus-incident/`
- **Port:** 127.0.0.1:3000
- **Domain:** https://incidents.vsjailabs.in (Nginx + Certbot SSL, expires 15 Sep 2026)
- **Data volume:** `/opt/versus-incident/data/`
- **Config volume:** `/opt/versus-incident/config/`

## Environment Variables
```
SMTP_HOST=smtp.zoho.in
SMTP_PORT=465
SMTP_USERNAME=admin@vsjailabs.com
SMTP_PASSWORD=<zoho-app-password>
EMAIL_TO=admin@vsjailabs.com
EMAIL_SUBJECT=Incident Alert - VSJ AI Labs
GATEWAY_SECRET=<secret-hash>
```

## Common Operations

```bash
# Status check
ssh root@103.127.29.102 "docker ps --filter name=versus-incident"

# View recent logs
ssh root@103.127.29.102 "docker logs versus-incident --tail 50"

# Restart
ssh root@103.127.29.102 "cd /opt/versus-incident && docker compose restart"

# Update to latest
ssh root@103.127.29.102 "cd /opt/versus-incident && docker compose pull && docker compose up -d"

# View/edit config
ssh root@103.127.29.102 "cat /opt/versus-incident/.env"
ssh root@103.127.29.102 "cat /opt/versus-incident/docker-compose.yml"
```

## Backup
Not currently configured. Data is in `/opt/versus-incident/data/`. To backup:
```bash
ssh root@103.127.29.102 "tar -czf /tmp/versus-backup-$(date +%Y%m%d).tar.gz /opt/versus-incident/data/"
```
