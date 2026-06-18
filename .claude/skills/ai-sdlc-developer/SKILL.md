# AI SDLC — Phase 2: Development & Code Generation

## Purpose
AI-assisted coding, code review, branch management, and PR workflows. Claude Code is the primary development engine — this skill defines the conventions, patterns, and guardrails for VSJ AI Labs projects.

## When to use
- User says "implement", "code this", "build feature", "create PR", "fix bug"
- Picking up a story/task from OpenProject to implement
- Generating boilerplate, scaffolding, or full feature implementations

## Development Conventions

### Git Workflow
- **Branch naming:** `feature/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- **Commit style:** Imperative mood, explain WHY not WHAT
- **Co-author:** Auto-added via global commit template — do NOT add manually
- **PR flow:** Branch → commits → push → `gh pr create` → review → merge

### Code Standards
- **No comments by default** — only when WHY is non-obvious
- **No premature abstraction** — three similar lines beats a helper nobody understands
- **Security first** — validate at boundaries, never trust external input
- **Test what matters** — golden path + edge cases, skip obvious getters

### SSH Key Management
Match the correct host alias for each repo:

| Org | Host Alias | Key |
|---|---|---|
| vsjailabs | `github-vsjailabs` | `~/.ssh/id_github_vsjailabs` |
| Fairvalue-Insuretech | `github-work` | `~/.ssh/id_github_work` |
| Personal | `github-aksatyam` | `~/.ssh/id_github_aksatyam` |

Before push: `ssh-add <key>` and verify remote uses correct alias.

## AI Development Patterns

### Feature Implementation Flow
1. **Read the story** — pull requirements from OpenProject or conversation
2. **Explore** — understand existing code patterns, conventions, dependencies
3. **Plan** — identify files to create/modify, data flow, edge cases
4. **Implement** — write code following project conventions
5. **Self-review** — check for security, performance, correctness
6. **Test** — run tests, verify in browser if UI change
7. **Commit** — atomic commits with clear messages
8. **PR** — create with summary, test plan, link to story

### ERPNext Custom Development
For ERPNext customizations on the Utho server:

```bash
# Create custom app
ssh root@103.127.29.102 "cd /opt/erpnext/frappe_docker && \
  docker compose ... exec -T backend bench new-app <app_name>"

# Install on site
ssh root@103.127.29.102 "cd /opt/erpnext/frappe_docker && \
  docker compose ... exec -T backend bench --site erp.vsjailabs.in install-app <app_name>"

# Custom DocType / Script
# Use bench console for quick scripts, custom app for persistent changes
```

### Bench Console Script Pattern (ERPNext)
```bash
# Write script locally → scp → docker cp → execute → read output
scp /tmp/script.py root@103.127.29.102:/tmp/
ssh root@103.127.29.102 "docker cp /tmp/script.py frappe_docker-backend-1:/home/frappe/frappe-bench/"
ssh root@103.127.29.102 "cd /opt/erpnext/frappe_docker && \
  docker compose -f compose.yaml -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml -f overrides/compose.noproxy.yaml \
  --env-file .env exec -T backend bench --site erp.vsjailabs.in console" <<< \
  "exec(open('/home/frappe/frappe-bench/script.py').read())"
```

## Code Review Checklist
Before declaring a feature complete:
- [ ] No hardcoded secrets or credentials
- [ ] Input validation at system boundaries
- [ ] Error handling for external calls (APIs, DB, file I/O)
- [ ] No SQL injection, XSS, or command injection vectors
- [ ] Responsive/accessible if UI change
- [ ] Tests cover golden path + 2 edge cases minimum
- [ ] Commit messages explain WHY
- [ ] PR description links to story/requirement
