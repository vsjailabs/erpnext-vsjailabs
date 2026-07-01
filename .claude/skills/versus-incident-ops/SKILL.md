# Versus Incident — Operations Skill (DEPRECATED)

## ⚠️ Status: REMOVED 2026-06-18

This skill is **deprecated**. The Versus Incident app was removed from the Utho server on 2026-06-18.

**Reason:** Go's `net/smtp` library does not support implicit TLS (port 465), and Utho hosting blocks outbound port 587 (STARTTLS). Email alerts could never work on this infrastructure. Multiple relay approaches attempted (namshi/smtp, boky/postfix) — all failed because the Go app unconditionally sends STARTTLS.

## When to use
- Only if user asks about redeploying Versus Incident or its history
- Inform user that email alerts won't work unless the upstream Go SMTP issue is fixed

## Redeployment Reference (if needed)

Config files remain in the repo under `versus-incident/`:
- `docker-compose.yml` — Container definition
- `config/config.yaml` — App config with env var substitution
- `config/email_message.tmpl` — Alert email template
- `nginx/versus-incident.conf` — Nginx reverse proxy config
- `.env.example` — Environment variable template

Server directory `/opt/versus-incident/` may still exist with old config/data files.
