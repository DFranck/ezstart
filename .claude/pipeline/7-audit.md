# Step 7 — Audit

## Pre-PR audit (MANDATORY — never skip)

Launch audit agents on ALL modified areas:

- [ ] `code-quality.md` — ALWAYS
- [ ] `i18n-compliance.md` — ALWAYS
- [ ] `ux-quality.md` — if frontend touched
- [ ] `security.md` — if auth/routes/secrets touched

## Audit loop

- If issues found -> fix agent -> re-audit
- Loop until 100% clean
- NEVER proceed to PR with known issues
