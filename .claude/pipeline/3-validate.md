# Step 3 — Validate (Post-Agent Checks)

Run ALL checks on modified files after EVERY agent. If ANY fails -> fix before proceeding.

## Automated checks (run via grep/bash)

```bash
# 1. No raw HTML tags outside packages/ui
grep -rn '<div \|<p \|<span \|<table \|<h[1-6] \|<button \|<input ' [files]
# Expected: 0 results (except packages/ui/)

# 2. No console.log
grep -rn 'console\.\(log\|warn\|error\)' [files]
# Expected: 0 results

# 3. No className outside packages/ui
grep -rn 'className=' [files in packages/ except ui]
# Expected: 0 results

# 4. No any types
grep -rn ': any\b\|as any\b' [files]
# Expected: 0 or justified with comment

# 5. TypeScript compiles
npx tsc --noEmit -p [tsconfig]
# Expected: clean

# 6. No secrets
grep -rn 'sk_live\|sk_test\|password.*=.*"' [files]
# Expected: 0 results
```

## Manual review (Claude reads the diff)

- [ ] @ezstart/ui components used (not raw HTML)
- [ ] DataTable for any data list/table
- [ ] React Query for data fetching (not useState+useEffect+fetch)
- [ ] All user-facing text uses i18n t()
- [ ] API responses use sendSuccess/sendError
- [ ] Loading/error/empty states present
- [ ] formatCurrency for all amounts

## If validation fails

1. Identify exact issue and file:line
2. Launch fixer agent with the specific error
3. Re-validate after fix
4. Loop until ALL checks pass
5. ONLY THEN commit
