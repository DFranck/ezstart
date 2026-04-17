# Pipeline — the only workflow

Every deliverable (feature, fix, refactor, new package) follows this pipeline. No shortcuts, no skipped steps.

---

## The 9 steps

```
1. Code          → agents dev implement
2. Quality       → audit + hacker + fix → 0 issues + ALL standards respected
3. Unit tests    → vitest → all pass
4. E2E plan      → create/update E2E-TESTS.md
5. E2E tests     → run ALL MCP browser tests, record results in E2E-TESTS.md
6. If ANY fails   → back to step 2 with FULL list of failures (fix all at once, not one by one)
7. Loop 5-6      → until 100% E2E pass
8. Docs          → update README, BACKLOG, etc.
9. Commit/PR     → push + PR
```

### Step 1 — Code

- Claude (architect) briefs agents with clear scope + relevant rules
- Agent `dev` reads standards, implements, writes tests
- Parallel agents for independent work (no file conflicts)
- Progress tracked in `tmp/agent-progress-*.md`

### Step 2 — Quality (the gate)

Three checks, ALL must pass:

1. **Auditor** — executes full `standard.md` checklist (7 criteria)
   - Also checks `standard-saas.md` for apps
   - Also checks `standard-ui.md` for UI components
2. **Hacker** — adversarial attack, writes tests that prove bugs
3. **Fix** — dev agent fixes all issues found

Loop: `audit → hack → fix → audit → hack → fix → ...`
Stop condition: **auditor PASS + hacker CLEAN, two times in a row**.

If ANY standard is not respected → FAIL → fix → re-audit.

### Step 3 — Unit tests

```bash
pnpm --filter <package> test
```

All tests must pass. Zero failures, zero skips (except documented).

### Step 4 — E2E test plan

Create or update `E2E-TESTS.md` at the repo root (or per-app).

Format:
```markdown
- [ ] T01 — Login credentials — 2026-04-18
- [ ] T02 — Admin dashboard render — 2026-04-18
- [x] T03 — SSO redirect flow — OK — 2026-04-18
```

Each test: checkbox / ID / description / result + comment if fail / date.

### Step 5 — E2E MCP tests

Run ALL tests via Chrome DevTools MCP on dev (localhost) or staging. Do not stop at the first failure — run the entire test suite and collect all results.
- Navigate to pages
- Fill forms, click buttons
- Verify renders, network requests, error states
- Take screenshots for evidence
- Record every result (pass/fail + details) in E2E-TESTS.md

### Step 6 — ANY E2E fails → back to step 2 with full failure list

**CRITICAL: if ANY E2E test failed, collect the FULL list of failures and go back to step 2 to fix them ALL at once — NOT one test at a time.**

Why: an E2E failure may reveal a standards violation that unit tests didn't catch. The fix must go through the full quality gate (audit + hacker + standards check) before re-testing. Fixing all failures in a single pass avoids redundant audit/test cycles.

### Step 7 — Loop until 100%

Repeat steps 5-6 until every test in E2E-TESTS.md is checked.

### Step 8 — Documentation

- Update `BACKLOG.md` (mark completed items)
- Update `README.md` if public API changed
- Update package READMEs if exports changed
- Update `E2E-TESTS.md` with final results

### Step 9 — Commit / PR

- Conventional commit message
- Feature branch + PR (unless hotfix)
- Never push without user approval
- No "Co-Authored-By: Claude"

---

## Multi-agent parallel

Multiple non-conflicting tasks → agents in parallel. Each agent follows steps 1-3 independently. Steps 4-9 are sequential after all agents complete.

**Rule**: never launch 2 agents that touch the same folder.

---

## The 3 agent roles

| Role | Job | File |
|------|-----|------|
| `dev` | Implements code + tests | `.claude/agents/dev.md` |
| `auditor` | Verifies ALL standards | `.claude/agents/auditor.md` |
| `hacker` | Breaks code, proves bugs | `.claude/agents/hacker.md` |

---

## Standards reference

ALL standards must be checked at step 2:

| Standard | Scope |
|----------|-------|
| `standard.md` | All packages (7 criteria) |
| `standard-saas.md` | SaaS apps (API + Web + Infra + Product) |
| `standard-ui.md` | UI components (responsive, patterns, design system) |
