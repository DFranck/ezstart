# Changelog

All notable changes to `api-ezauth` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **DOCS_DEMO_SANDBOX_BACKEND-001** — Reserved Application slug `_docs-demo`
  for the documentation live previews on `/docs/components/*`. Visitors of
  the docs can sign up / sign in with REAL components, but every byte of
  data is sandbox-isolated:
  - **Reserved namespace** — the slug regex now allows an optional leading
    `_`, but the `POST /api/applications` route blocks any non-superadmin
    attempt to create an `_*` slug (403). Tenants cannot squat on
    platform-controlled feature names.
  - **Hard quotas on the Application document** —
    `quotas: { maxUsers: 100, maxEventsPerDay: 500 }`. New
    `middleware/check-demo-quotas.ts` enforces both gates and returns
    429 with a clear "Demo capacity reached" / "Demo daily limit
    reached" message. Strict no-op for non-demo traffic (no Mongo
    lookup, full passthrough).
  - **24h reset cron** — `services/docs-demo-reset.service.ts` exports
    `startDocsDemoResetScheduler()` (mounted in `index.ts onReady`) plus
    the core `resetDocsDemoData()` function. Every 24h the cron wipes
    `apps: ['_docs-demo']` AuthUsers + their refresh tokens + audit logs
    older than 24h. The Application document and its API keys are always
    preserved.
  - **Manual reset endpoint** — `POST /api/admin/docs-demo/reset` for
    superadmin pre-demo cleanup or incident response. Audit-logged.
  - **Seed script** — `pnpm --filter api-ezauth seed:docs-demo`
    (idempotent) creates the `_docs-demo` Application + 2 keys
    (`pk_test`, `sk_test`). Self-heals an Application that predates
    this seed (back-fills `quotas` / `reservedSlug` / `isPlatformOwned`
    / `isTestMode` in place).
  - **Tests** — +8 unit tests for the seed script + 15 cross-tenant
    isolation tests (`__tests__/isolation/docs-demo-isolation.test.ts`)
    proving:
    - Reserved slug protection (regular tenant 403, superadmin 200).
    - Quota gates (max users + max events per 24h).
    - Strict no-op for non-demo traffic even when sandbox is full.
    - Reset deletes ONLY `_docs-demo` data; live tenant data is
      untouched (users + audit logs + refresh tokens).
    - Reset preserves the Application + API keys (sandbox skeleton).
- New `Application.reservedSlug?: boolean` + `Application.quotas?:
{ maxUsers?, maxEventsPerDay? }` fields. Optional + backward-compatible
  (existing tenants keep `null`).

### Changed

- `APPLICATION_SLUG_REGEX` widened from `/^[a-z0-9-]{2,32}$/` to
  `/^(?:_[a-z0-9-]{1,31}|[a-z0-9-]{2,32})$/` so platform-internal `_*`
  slugs (e.g. `_docs-demo`) can be persisted. The route layer enforces
  that only superadmins may create them.
- `POST /api/auth/register`, `POST /api/auth/login`, and
  `POST /api/auth/login-cookie` now run the `checkDemoQuotas` middleware
  between the rate limiter and the controller. Strict no-op for non-demo
  (`req.body.app !== '_docs-demo'`) traffic.
