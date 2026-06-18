# AI SDLC — Phase 1: Planning & Requirements

## Purpose
Automate project planning, requirements gathering, work breakdown, and sprint management via OpenProject (pm.vsjailabs.in) and Claude Code.

## When to use
- User says "plan a feature", "create epic", "break down work", "create sprint", "estimate effort"
- Starting a new feature or project that needs structured planning
- Generating user stories, acceptance criteria, or technical specs from a brief

## Platform: OpenProject (pm.vsjailabs.in)

### Access
- **Server:** 103.127.29.102
- **App URL:** https://pm.vsjailabs.in (Docker all-in-one :8081, Nginx reverse proxy)
- **Admin:** admin / (credentials in memory)
- **API:** `https://pm.vsjailabs.in/api/v3/` with Basic Auth

### API Patterns

```bash
# List all projects
ssh root@103.127.29.102 "curl -s -u admin:<pw> https://pm.vsjailabs.in/api/v3/projects | python3 -m json.tool"

# Create a work package (task/story/epic)
ssh root@103.127.29.102 "curl -s -u admin:<pw> \
  -H 'Content-Type: application/json' \
  -X POST 'https://pm.vsjailabs.in/api/v3/projects/<project-id>/work_packages' \
  -d '{\"subject\":\"Feature title\",\"description\":{\"raw\":\"Description\"},\"_links\":{\"type\":{\"href\":\"/api/v3/types/<type-id>\"}}}'"

# List work packages in a project
ssh root@103.127.29.102 "curl -s -u admin:<pw> 'https://pm.vsjailabs.in/api/v3/projects/<id>/work_packages?pageSize=50' | python3 -m json.tool"

# Update work package status
ssh root@103.127.29.102 "curl -s -u admin:<pw> \
  -H 'Content-Type: application/json' \
  -X PATCH 'https://pm.vsjailabs.in/api/v3/work_packages/<wp-id>' \
  -d '{\"_links\":{\"status\":{\"href\":\"/api/v3/statuses/<status-id>\"}}}'"
```

### Rails Runner (direct DB operations)
```bash
ssh root@103.127.29.102 "docker exec openproject bash -lc 'cd /app && RAILS_ENV=production bundle exec rails runner \"<ruby>\"'"
```

## AI-Assisted Planning Workflow

### Step 1: Requirements Elicitation
When the user describes a feature:
1. Ask clarifying questions about scope, users, constraints
2. Generate structured requirements (functional + non-functional)
3. Identify dependencies and risks

### Step 2: Work Breakdown Structure
From approved requirements:
1. Create Epic in OpenProject
2. Break into User Stories with acceptance criteria (INVEST format)
3. Estimate story points (Fibonacci: 1, 2, 3, 5, 8, 13)
4. Tag with priority (Immediate / High / Normal / Low)

### Step 3: Sprint Planning
1. Create sprint/version in OpenProject
2. Assign stories to sprint based on velocity (default: 20 pts/sprint for team of 3)
3. Set start/end dates (2-week sprints)
4. Generate sprint goal statement

### Step 4: Technical Spec Generation
For complex features, generate:
- Architecture decision record (ADR)
- API contract (OpenAPI stub)
- Data model changes
- Sequence diagrams (Mermaid)
- Test strategy outline

## Templates

### User Story Template
```
As a [role],
I want to [action],
So that [benefit].

Acceptance Criteria:
- Given [context], When [action], Then [result]
- Given [context], When [action], Then [result]

Technical Notes:
- [implementation hints]

Story Points: [1-13]
Priority: [Immediate/High/Normal/Low]
```

### Sprint Goal Template
```
Sprint [N] Goal: [One sentence describing the sprint's primary objective]
Capacity: [X] story points | Duration: [start] – [end]
Key deliverables: [2-3 bullet points]
Risks: [known blockers or dependencies]
```
