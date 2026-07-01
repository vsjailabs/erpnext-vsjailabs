# OpenProject & Portfolio Operations Skill

Manage OpenProject v15 and Portfolio static site on Hostinger VPS (93.127.194.189). Handles user management, unlocking, password resets, SMTP, container operations, and portfolio prototype hosting.

## Triggers

Use this skill when the user mentions: OpenProject users, unlock accounts, reset passwords, OpenProject mail, pm.vsjailabs.in, OpenProject container, OpenProject settings, portfolio, prototypes, portfolio.vsjailabs.in, host HTML.

## Server Access

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189
```

## Container Details

- **Image:** `openproject/openproject:15`
- **Container name:** `openproject`
- **Port:** 127.0.0.1:8081 (proxied by Nginx to pm.vsjailabs.in)
- **Volumes:** `/opt/openproject/pgdata` + `/opt/openproject/assets`
- **Admin login:** `admin` / password in memory

## Common Operations

### Unlock All Users & Reset Passwords

Run this whenever users report login issues. It unblocks all accounts, resets failed login counts, and resets passwords to the standard password.

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker exec -e P='Vsj@2026#User!' openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner \"
User.where(\\\"id >= 4\\\").each do |u|
  u.failed_login_count = 0
  u.activate
  u.password = ENV[\\\"P\\\"]
  u.password_confirmation = ENV[\\\"P\\\"]
  u.force_password_change = false
  u.save!
  puts \\\"Unlocked: #{u.id} | #{u.login} | #{u.mail}\\\"
end
\"'"
```

### List All Users

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker exec openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner \"User.where(\\\"id > 1\\\").order(:id).each { |u| puts \\\"#{u.id} | #{u.login} | #{u.firstname} #{u.lastname} | #{u.mail} | admin:#{u.admin?} | status:#{u.status} | failed_logins:#{u.failed_login_count}\\\" }\"'"
```

### Unlock a Specific User

Replace `<login>` with the username:

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker exec -e P='Vsj@2026#User!' openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner \"
u = User.find_by(login: \\\"<login>\\\")
u.failed_login_count = 0
u.activate
u.password = ENV[\\\"P\\\"]
u.password_confirmation = ENV[\\\"P\\\"]
u.force_password_change = false
u.save!
puts \\\"Unlocked: #{u.login} (#{u.mail})\\\"
\"'"
```

### Send Test Email

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker exec openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner \"UserMailer.test_mail(User.find(5)).deliver_now; puts \\\"OK\\\"\"'"
```

### Health Check

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/health_checks/all"
```

### Restart Container

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker restart openproject"
```

### Container Logs

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker logs --tail 50 openproject"
```

## SMTP Configuration

SMTP is set via container environment variables (read-only from Rails). Current config:
- **Server:** smtp.zoho.in:465 (implicit SSL)
- **Auth:** login
- **User:** admin@vsjailabs.com
- **From:** admin@vsjailabs.com

To change SMTP settings, the container must be recreated with updated env vars (data persists in volumes).

## Enterprise Override

Enterprise features (action boards, custom fields on boards) are gated. Unlocked via monkey-patch:

**File:** `/app/config/initializers/enterprise_override.rb` (INSIDE the container)

```ruby
Rails.application.config.after_initialize do
  Authorization::EnterpriseService.class_eval do
    def call(_feature)
      ServiceResult.new(success: true, result: true)
    end
  end
  EnterpriseToken.class_eval do
    class << self
      def active?; true; end
      def show_banners?(**_opts); false; end
    end
    def expired?(**_opts); false; end
  end
end
```

⚠️ **Lost on container recreation.** Must be re-applied after any `docker compose up` that recreates the container. To persist, mount via volume or use a custom image.

### Re-apply after recreation:
```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "docker exec openproject bash -c 'cat > /app/config/initializers/enterprise_override.rb << '\''RUBY'\''
Rails.application.config.after_initialize do
  Authorization::EnterpriseService.class_eval do
    def call(_feature)
      ServiceResult.new(success: true, result: true)
    end
  end
  EnterpriseToken.class_eval do
    class << self
      def active?; true; end
      def show_banners?(**_opts); false; end
    end
    def expired?(**_opts); false; end
  end
end
RUBY
' && docker restart openproject"
```

## Board Creation

⚠️ **NEVER create boards via Rails runner.** Action boards created programmatically show duplicate data or empty columns. Always use the browser UI:
1. Navigate to project → Boards
2. Click "+ Board"
3. Select "Status" type
4. Add status columns one by one (New, In progress, In testing, Closed)

## Important Notes

- Users must log in with their **username** (e.g. `sohelraza.khan`), NOT their email address
- OpenProject v15 SMTP settings are controlled by env vars, not the web UI — the web UI shows them read-only
- Passwords set via the web UI user creation form are unreliable — always use Rails runner to set passwords
- SMTP auth must be `login` for Zoho (not `plain`)
- After container recreation, wait ~60-90 seconds for full startup before testing
- OpenProject v15 Query model uses `public` (not `is_public`), no `hidden` attr, `include_subprojects` must be explicitly set

---

## Portfolio Site (portfolio.vsjailabs.in)

Static HTML prototype hosting — no Docker, served directly by Nginx.

### Details
- **Root:** `/var/www/prototypes/`
- **Nginx vhost:** `/etc/nginx/sites-enabled/portfolio`
- **SSL:** Let's Encrypt (certbot, auto-renew)
- **DNS:** GoDaddy A record `portfolio` -> 93.127.194.189
- **Index page:** Themed to match vsjailabs.com (Inter font, gradient accents, card grid)

### Current Prototypes
| File | Title |
|---|---|
| `train-food-delivery.html` | TrainBites - Train Companion |
| `csb-hrms.html` | CSB HRMS |

### Upload a New Prototype

```bash
scp -i ~/.ssh/id_github_vsjailabs /path/to/file.html root@93.127.194.189:/var/www/prototypes/
```

Then add a card block to `/var/www/prototypes/index.html`.

### Re-provision SSL (if needed)

```bash
ssh -i ~/.ssh/id_github_vsjailabs root@93.127.194.189 "certbot --nginx -d portfolio.vsjailabs.in --non-interactive --agree-tos -m vsjailabs@gmail.com"
```

### DNS Troubleshooting
If users report access issues, check DNS propagation:
```bash
dig +short portfolio.vsjailabs.in @8.8.8.8
dig +short portfolio.vsjailabs.in @1.1.1.1
```
If stale cache from old record: delete the A record on GoDaddy, wait 1-2 min, re-add fresh.
