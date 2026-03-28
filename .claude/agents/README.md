# Agent Roles — @ezstart Monorepo

Specialized agent profiles for auditing and improving the monorepo.
Each role file defines the expertise, rules, and checklist for a specific domain.

## Usage

When launching an agent, include the role file content in the prompt:
```
Read `.claude/agents/[role].md` for your role definition, then audit [target].
```

## Available Roles

| Role | File | Focus |
|------|------|-------|
| Security | `security.md` | Auth, injection, secrets, CORS, rate limiting |
| Performance | `performance.md` | Bundle size, lazy loading, caching, DB queries |
| API Standards | `api-standards.md` | Response format, pagination, validation, error handling |
| UI/UX | `ui-ux.md` | Accessibility, responsive, loading states, empty states |
| Infrastructure | `infrastructure.md` | CI/CD, Docker, env vars, deployment, monitoring |
| Documentation | `documentation.md` | README, API docs (minimal but useful), no bloat |
| Code Quality | `code-quality.md` | Types, duplication, naming, dead code, consistency |
| Testing | `testing.md` | Unit tests, integration, coverage, mocking |
