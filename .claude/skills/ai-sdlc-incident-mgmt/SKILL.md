# AI SDLC — Phase 5: Incident Management & Monitoring

## Purpose
Manage production incidents, alert routing, post-incident reviews, and SLA tracking using Versus Incident (incidents.vsjailabs.in) integrated with the VSJ AI Labs platform.

## When to use
- User says "incident", "alert", "on-call", "postmortem", "downtime"
- A service is down or degraded
- Setting up alerting, escalation, or incident response procedures

## Platform: Versus Incident (incidents.vsjailabs.in)

### Access
- **URL:** https://incidents.vsjailabs.in
- **Server:** 103.127.29.102, container `versus-incident`, port 3000
- **Config:** `/opt/versus-incident/`
- **Data:** `/opt/versus-incident/data/`

### API Endpoints
```
POST /api/incidents          — Create incident
GET  /api/admin/incidents    — List all incidents (admin auth required)
GET  /api/ack/:id            — Acknowledge incident
GET  /api/agent/status       — Agent/service status
POST /api/admin/teams        — Create/manage teams
```

### SMTP Configuration
- **Provider:** Zoho (smtp.zoho.in:465)
- **From:** admin@vsjailabs.com
- **Alert to:** admin@vsjailabs.com (configurable in .env)
- **Subject prefix:** "Incident Alert - VSJ AI Labs"

### Container Management
```bash
# View logs
ssh root@103.127.29.102 "docker logs versus-incident --tail 50"

# Restart
ssh root@103.127.29.102 "cd /opt/versus-incident && docker compose restart"

# View config
ssh root@103.127.29.102 "cat /opt/versus-incident/.env"

# View stored data
ssh root@103.127.29.102 "ls -la /opt/versus-incident/data/"
```

## Incident Response Procedure

### Severity Levels

| Level | Description | Response Time | Resolution Target | Examples |
|---|---|---|---|---|
| SEV-1 | Complete outage | 15 min | 1 hour | All services down, data breach |
| SEV-2 | Major degradation | 30 min | 4 hours | ERPNext down, payroll blocked |
| SEV-3 | Minor impact | 2 hours | 24 hours | Slow response, non-critical feature broken |
| SEV-4 | Cosmetic/Low | Next business day | 1 week | UI glitch, minor log error |

### Triage Checklist (first 15 minutes)
1. **Identify** — Which service? Check all three:
   ```bash
   curl -s -o /dev/null -w '%{http_code}' https://erp.vsjailabs.in
   curl -s -o /dev/null -w '%{http_code}' https://pm.vsjailabs.in
   curl -s -o /dev/null -w '%{http_code}' https://incidents.vsjailabs.in
   ```
2. **Assess** — Is it container-level, Nginx, or host?
   ```bash
   ssh root@103.127.29.102 "docker ps -a --format 'table {{.Names}}\t{{.Status}}'"
   ssh root@103.127.29.102 "systemctl status nginx"
   ```
3. **Logs** — Check relevant container logs:
   ```bash
   ssh root@103.127.29.102 "docker logs <container> --tail 100 --since 30m"
   ```
4. **Fix or Escalate** — Restart container if obvious, escalate to director if data/security issue

### Common Failure Modes

| Symptom | Likely Cause | Fix |
|---|---|---|
| 502 Bad Gateway | Container down or port mismatch | `docker compose up -d` |
| SSL error | Certificate expired | `certbot renew` |
| ERPNext 500 | Migration needed or disk full | Check logs + `bench migrate` |
| OpenProject login fails | Container restart needed | `docker restart openproject` |
| High memory | Swap pressure from too many containers | Identify memory hog with `docker stats` |
| Slow response | DB query slow or disk I/O | Check `docker stats` + `iostat` |

## Post-Incident Review Template

```markdown
# Post-Incident Review: [Incident Title]

**Date:** [YYYY-MM-DD]
**Severity:** SEV-[1-4]
**Duration:** [start time] – [end time] ([X] minutes)
**Impact:** [What users/services were affected]
**On-call:** [Who responded]

## Timeline
- HH:MM — [First symptom detected]
- HH:MM — [Investigation started]
- HH:MM — [Root cause identified]
- HH:MM — [Fix applied]
- HH:MM — [Service restored]

## Root Cause
[Technical explanation of what went wrong]

## Resolution
[What was done to fix it]

## Action Items
- [ ] [Preventive measure 1] — Owner: [name], Due: [date]
- [ ] [Preventive measure 2] — Owner: [name], Due: [date]

## Lessons Learned
- [What we'd do differently next time]
```

## Integration Points

### ERPNext → Incident
- ERPNext scheduler failures should trigger alerts
- Payroll processing failures are SEV-2 incidents
- Email delivery failures need investigation

### OpenProject → Incident
- Post-incident action items become OpenProject tasks
- Link incident ID to work package for traceability

### Monitoring Gaps (TODO)
- [ ] Set up uptime monitoring (ping checks every 5 min)
- [ ] Configure disk space alerts (>80% threshold)
- [ ] Configure memory alerts (>90% threshold)
- [ ] Set up log aggregation for all 3 services
