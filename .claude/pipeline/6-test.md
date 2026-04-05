# Step 6 — Test

## Automated tests

```bash
# TypeScript (confirm clean)
npx tsc --noEmit

# Unit/Integration tests for modified packages
pnpm --filter [package] test
# or: cd apps/[app]/api && pnpm test

# Common test suites
cd apps/ezauth/api && pnpm test   # 48 tests (if auth touched)
cd apps/ezpay/api && pnpm test    # 27 tests (if pay touched)
```

## MCP browser tests (if UI modified)

1. Read `apps/[app]/E2E-TESTS.md` for test cases
2. Read test credentials from `apps/[app]/api/.env.local` (TEST*USER*\* vars)
3. Navigate and test via chrome-devtools MCP
4. Update E2E-TESTS.md with results (date + status)
5. Add new test cases for new features

## Checklist

- [ ] All existing tests still pass (no regressions)
- [ ] New functionality tested (unit or MCP)
- [ ] E2E-TESTS.md updated with results
- [ ] BACKLOG.md updated with progress
