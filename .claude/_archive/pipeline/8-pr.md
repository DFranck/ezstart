# Step 8 — PR

## Pre-push checklist

- [ ] All audits pass clean (Step 7)
- [ ] All tests pass — vitest + tsc (Step 6)
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
