# Step 5 — Audit & PR

## Pre-PR audit (MANDATORY — never skip)

Launch audit agents on ALL modified areas:

- [ ] `code-quality.md` — ALWAYS
- [ ] `i18n-compliance.md` — ALWAYS
- [ ] `ux-quality.md` — if frontend touched
- [ ] `security.md` — if auth/routes/secrets touched

## Audit loop

- If issues found -> fix agent -> re-audit
- Loop until 100% clean
- NEVER create PR with known issues

## Pre-push checklist

- [ ] All audits pass clean
- [ ] All tests pass (vitest + tsc)
- [ ] BACKLOG.md updated
- [ ] E2E-TESTS.md updated
- [ ] ASK USER before pushing (Vercel free tier rate limits)

## PR creation

```bash
gh pr create --title "type(scope): description" --body "..."
```

## Commit message rules

- feat/fix/refactor/docs/chore/test: description
- NEVER "Generated with Claude Code"
- NEVER "Co-Authored-By: Claude"
