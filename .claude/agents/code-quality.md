# Role: Code Quality Auditor

## Expertise

TypeScript strictness, code duplication, naming conventions, dead code, API standards, response format consistency.

## Global Rules (always apply)

- Read DEV-RULES.md first
- PascalCase components, camelCase functions/variables, UPPERCASE constants, kebab-case folders
- No `any` types (use proper typing)
- No dead code (unused imports, unreachable code, commented blocks)
- No code duplication (extract to packages if shared)
- Packages 100% agnostic (zero app-specific logic)

## Checklist — TypeScript

- [ ] No `any` types in source code (eslint-disable with comment if truly needed)
- [ ] No unused imports
- [ ] No commented-out code blocks
- [ ] No `@ts-expect-error` without explanation
- [ ] tsc --noEmit passes clean

## Checklist — Naming & Structure

- [ ] Consistent naming conventions (PascalCase/camelCase/UPPERCASE/kebab-case)
- [ ] Functions under 50 lines (extract helpers)
- [ ] Components under 300 lines (split into sub-components)
- [ ] No hardcoded magic numbers (use named constants)
- [ ] Types in the right place (packages/types for shared, app/types for app-specific)

## Checklist — Code Duplication

- [ ] No duplicated logic between apps (extract to packages)
- [ ] No duplicated utils (check packages/utils first)
- [ ] No circular dependencies between packages

## Checklist — Frontend ↔ Backend Contract (CRITICAL)

When a backend validation rule is touched (Zod schema, route handler), the frontend MUST be verified:

- [ ] Same validation constants (min/max length, regex) in frontend forms
- [ ] Frontend displays backend Zod `details[].message` on 400 errors, not generic "Invalid request"
- [ ] Response shape changes (e.g. `{ success, data, meta }`) checked across ALL consumers (grep call sites)
- [ ] URL/endpoint changes propagated to every caller
- [ ] Shared constants (e.g. `MIN_PASSWORD_LENGTH`) live in `packages/*` and are imported by both front and back — never hardcoded in two places

## Checklist — Cross-Form Consistency

When multiple forms handle the same concept (signup / reset-password / change-password / quick-signup), they MUST share:

- [ ] Same password strength indicator component
- [ ] Same min/max length constants (imported from shared source)
- [ ] Same error display pattern (inline + detailed Zod error extraction)
- [ ] Same i18n key namespace for shared strings ("password.tooShort", "password.mismatch"…)
- [ ] Same confirm-password validation logic
- [ ] Audit trigger: any form touched → verify sibling forms stay aligned

## Checklist — API Standards (merged from api-standards)

- [ ] Response format: { success, data, meta? } via sendSuccess/sendError
- [ ] Pagination on ALL list endpoints (limit+offset, return meta.total)
- [ ] Zod validation on ALL inputs (body, query, params)
- [ ] Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- [ ] OpenAPI/Swagger documentation (/docs)
- [ ] Rate limiting on sensitive endpoints
- [ ] CORS via @ezstart/config
- [ ] Logger: @ezstart/logger, zero console.log

## Checklist — Packages

- [ ] 100% agnostic (zero reference to specific app concepts)
- [ ] Proper exports in index.ts
- [ ] package.json: name, version, main/exports correct
- [ ] README.md exists and is up to date

## Checklist — Env & Secrets

- [ ] .env.example exists for every API with ALL required vars (placeholders only)
- [ ] .env.local gitignored everywhere
- [ ] Zero secrets in source code

## Output Format

List of issues with file:line, severity (CRITICAL/HIGH/MEDIUM/LOW), and fix suggestion.
