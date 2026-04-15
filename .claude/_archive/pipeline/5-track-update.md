# Step 5 — Track Update (after code + validate)

## Update tracking docs AFTER agents complete and validation passes

### Issues

- [ ] Update ISSUE-xxx status: open → fixed (with fix description)
- [ ] Mark which E2E tests need retesting (agent modified the code → ⏳)
- [ ] Add notes on what changed

### BACKLOG.md

- [ ] Check off completed sub-tasks
- [ ] Add any new sub-tasks discovered during coding
- [ ] Note blockers or decisions made

### E2E-TESTS.md

- [ ] New test cases added for new features
- [ ] Existing tests marked for retest if code changed
- [ ] Summary table updated (totals, pass/pending counts)

### Principle

Never proceed to testing with stale documentation.
The test step relies on E2E-TESTS.md being accurate.
