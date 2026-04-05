# Agent Roles — @ezstart Monorepo

## Pipeline

Every feature follows this pipeline. Claude (manager) orchestrates, agents execute:

1. **PLAN** — Claude drafts plan, user validates
2. **CODE** — Coding agents execute (DEV-RULES in prompt)
3. **TEST** — tsc --noEmit + vitest + secrets grep
4. **AUDIT** — Parallel audit agents before PR:
   - `code-quality.md` — types, naming, API standards, dead code, packages
   - `i18n-compliance.md` — all user-facing text translated, all languages
   - `ux-quality.md` — states, toasts, logging, design tokens, React Query
   - `security.md` — auth, secrets, injection (when routes/auth touched)
5. **FIX** — If audit finds issues → fix agents → re-audit (loop until clean)
6. **PR** — gh pr create (never direct push to master)

## Available Roles

| Role            | File                 | When                                                               |
| --------------- | -------------------- | ------------------------------------------------------------------ |
| Code Quality    | `code-quality.md`    | Every PR                                                           |
| i18n Compliance | `i18n-compliance.md` | Every PR                                                           |
| UX Quality      | `ux-quality.md`      | Every PR (if frontend touched)                                     |
| Security        | `security.md`        | When auth/routes/secrets touched                                   |
| Testing         | `testing.md`         | When setting up test infrastructure                                |
| Full Audit      | `full-audit.md`      | Major milestones, new apps, periodic health check                  |
| Coding Rules    | `coding-rules.md`    | Mandatory briefing for ALL coding agents — include in every prompt |

## Usage

Include the role file content in the agent prompt:

```
Read `.claude/agents/[role].md` for your role definition, then audit [target].
```
