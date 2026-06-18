# AI SDLC — Phase 3: Quality Assurance & Testing

## Purpose
AI-assisted test generation, test execution, VAPT security scanning, and quality gate enforcement for VSJ AI Labs projects.

## When to use
- User says "test this", "write tests", "run QA", "security scan", "VAPT"
- After a feature is implemented and needs verification
- Before a release or PR merge

## Testing Pyramid

### Unit Tests
- Test individual functions/methods in isolation
- Mock external dependencies (DB, APIs, file system)
- Aim for >80% coverage on business logic
- Framework: depends on project (pytest, jest, mocha, etc.)

### Integration Tests
- Test component interactions (API → DB, service → service)
- Use real database where possible (per project feedback)
- Test CRUD operations, auth flows, error paths

### End-to-End Tests
- Test full user workflows via browser
- Use Playwright or Cypress for web apps
- Cover: login, core feature flow, error states, permissions

## AI Test Generation Pattern

### From Requirements
Given a user story with acceptance criteria:
1. Parse each acceptance criterion into a test case
2. Generate test file with descriptive names
3. Add edge cases: empty input, boundary values, unauthorized access
4. Add negative tests: what should NOT happen

### From Code
Given implementation code:
1. Identify public API surface
2. Generate tests for each public method
3. Cover: happy path, error cases, boundary conditions
4. Check for untested branches

## VAPT Security Scanning

### Branch Scan Workflow
Per global CLAUDE.md — when scanning a branch:
1. `git fetch origin <branch>` → `git diff <base>...<branch> --stat`
2. Read ALL changed source files
3. Produce 3 deliverables:
   - Markdown Report (`VAPT-<BRANCH>-REPORT.md`)
   - DOCX Report (python-docx, 10 sections)
   - Post-Implementation Verification Prompt

### OWASP Top 10 Checklist
- [ ] A01 Broken Access Control — auth checks on every endpoint
- [ ] A02 Cryptographic Failures — no plaintext secrets, proper hashing
- [ ] A03 Injection — parameterized queries, no string interpolation in SQL/commands
- [ ] A04 Insecure Design — threat model reviewed
- [ ] A05 Security Misconfiguration — default creds removed, error pages sanitized
- [ ] A06 Vulnerable Components — dependencies up to date, no known CVEs
- [ ] A07 Auth Failures — rate limiting, MFA where applicable
- [ ] A08 Data Integrity — input validation, CSRF tokens
- [ ] A09 Logging Failures — security events logged, no sensitive data in logs
- [ ] A10 SSRF — URL validation on server-side requests

## ERPNext-Specific QA

### Functional Testing via API
```bash
# Test ERPNext endpoint availability
curl -s -o /dev/null -w '%{http_code}' https://erp.vsjailabs.in/api/method/frappe.auth.get_logged_user

# Test specific DocType CRUD
curl -b cookies.txt https://erp.vsjailabs.in/api/resource/Employee?limit_page_length=5

# Test payroll calculation accuracy
# Run via bench console — compare gross_pay against manual CTC calculation
```

### Regression Checks After Updates
After ERPNext/HRMS version update:
1. Verify all employees load (`/api/resource/Employee`)
2. Verify salary slips calculate correctly
3. Verify leave allocation displays
4. Verify email sending works (test with `frappe.sendmail`)
5. Verify portal login for 1 test employee

## Quality Gates
Before any release/deployment:
- [ ] All tests pass
- [ ] No Critical/High VAPT findings open
- [ ] Code review approved (PR has ≥1 approval)
- [ ] Documentation updated if API/schema changed
- [ ] Changelog entry added
- [ ] Rollback plan documented
