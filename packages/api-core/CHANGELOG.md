# Changelog

All notable changes to `@ezstart/api-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-16

Major hardening release — Wave B of the SaaS Pro Publishability plan. 20 hacker findings closed (3 critical + 6 high + 6 medium + 5 low) and one new foundation primitive added (`createTenantScopeMiddleware`). One **intentional default change** on `createCsrfMiddleware.sameSite` ('strict' → 'lax').

### Added

- **`createTenantScopeMiddleware`** — new foundation primitive that resolves `req.applicationId` from one of 3 sources (`'apiKey'`, `'body'`, `'param'`) and optionally verifies the authenticated user owns the target Application. Same `applicationLoader` injection pattern as `createAuthMiddleware`. Errors with `404 + APPLICATION_NOT_FOUND` or `403 + APPLICATION_ACCESS_DENIED` (codes from `@ezstart/api-contracts`). Superadmin bypass opt-in (default true). Failfast config (throws if source body/param without loader). Unblocks the pay-sdk C-3 cross-tenant exploit fix in Wave E.
- **`isValidObjectId(s)`** — exported helper that combines `OBJECT_ID_REGEX` regex match with explicit rejection of the canonical all-zero ObjectId `'000000000000000000000000'` (M3).
- **`CreateApiAuthOptions`** type — optional `issuer` and `audience` for JWT `iss`/`aud` claim enforcement (L1). Backward compat preserved: defaults skip iss/aud check.
- **`sanitizeErrorForLog(err)`** — exported helper that strips PII from Mongoose `ValidationError.errors[*].value` and `MongoServerError` E11000 `keyValue`/`keyPattern` before logging. Keeps `name + message + stack`, returns `validationFields: [{field, kind}]` / `duplicateFields: string[]` for forensics (L5).
- **`CreateCsrfMiddlewareOptions`** type — new options surface (`cookieName`, `domain`, `sameSite`, `secure`). Factory throws when `sameSite: 'none'` + `secure: false` (browser cookie spec).
- **`TRUST_PROXY_HOPS` env var** + `config.trustProxyHops` option — 3-level precedence (config > env > default 2 hops). Accepts number, `true` (trust all), or `0` (no proxy). Invalid → `logger.error` + fallback 2 (H5).
- **`config.disableCspWarning`** — opt-out for the new CSP-not-configured warning (H8).
- **`DeepHealthHandlerConfig.cacheMs`** — option to tune the new `/health/deep` response cache TTL (default 1000ms) (M5).
- `maxEntries` option on `createKeyHashRateLimiter` (default 10_000) — LRU eviction when the per-key Map reaches cap, evict-oldest via Map insertion-order semantics (H3).
- `disabled?: boolean` option on `createRateLimiter` + `createKeyHashRateLimiter` — explicit opt-in to bypass rate-limiting (H4 — replaces the previous implicit `NODE_ENV=test` bypass).

### Hardened

- **CORS case-fold bypass closed** (H1) — `app.set('case sensitive routing', true)` + lowercase `isCookiePath` compare. `POST /api/auth/Login` (capital L) now 404 instead of triggering the login handler AND being treated as Tier 1+2 by `isCookiePath` (which would reflect `ACAO: <evil-origin>` + credentials on the Set-Cookie response — full CSRF login bypass before this fix).
- **CSRF middleware uses `crypto.timingSafeEqual`** (was string `!==`) with length-check first via `||` short-circuit to prevent the TypeError that `timingSafeEqual` throws on length mismatch. Standard defense per `standard-saas-security.md` §6.
- **MongoDB Atlas connection fail-close in production** (H2) — `connect-to-mongo.ts` 3-branch behavior:
  - `NODE_ENV === 'production'` → throw `'MongoDB connection failed in production — see logs. Aborting boot.'` (no fallback)
  - `NODE_ENV === 'test'` → throw (tests must use MongoMemoryServer per `data-protection.md`)
  - dev → keep localhost fallback for DX, **LOUD** `logger.warn`. Never silent.
- **Rate-limiter LRU max-size** + explicit `disabled` opt-in (H3, H4 — see Added).
- **CSP-not-configured warning** at boot (H8) — `logger.warn` when `NODE_ENV=production` + `security !== false` + `disableCspWarning !== true`. Catches the "forgot to mount CSP" prod regression.
- **Idempotency middleware**:
  - Don't cache transient errors (H6): new `isTransientStatus()` helper skips cache write on 5xx/408/425/429 (client can retry immediately).
  - Preserve full response headers (H7): `snapshotHeaders()` captures `res.getHeaders()` (Set-Cookie array, Location, X-\*) + filters hop-by-hop headers per RFC 7230 §6.1. `IdempotencyRecord.headers` widened to `Record<string, string | string[] | number>` for the Set-Cookie array case.
  - Multi-pod prod warning (L7): one-shot `logger.warn` at construction when using the default in-memory store with `NODE_ENV=production`.
- **Helmet `crossOriginResourcePolicy: 'same-origin'`** (was `'cross-origin'`) — restores defense in depth combined with H1 fix (H9).
- **Health endpoint hardening**:
  - `/health` returns bare `{ status: 'ok' }` in production (kills service-name fingerprinting) (M4)
  - `/health/deep` gains a 1-second response cache with **inFlight coalescing** (N concurrent requests trigger 1 backing connector ping) + strict rate-limit (5 req/min) (M5)
- **`createVersionedRouter` double-prefix guard** — `/api/v1/v1/<route>` now returns 404. Both `/api/<route>` (legacy) and `/api/v1/<route>` (canonical) still work (M1).
- **`auditLog` extractIp uses `req.ip`** (proxy-aware, respects `TRUST_PROXY_HOPS`) instead of raw `X-Forwarded-For` leftmost-value parser — attacker can no longer spoof audit-log IP (M2).
- **Error handler sanitizes Mongoose errors** before log to defuse PII leak (L5 — see Added).
- **Rate-limiter skips OPTIONS** preflights (M6) — prevents attacker preflight-flood DoS that would otherwise burn through a victim IP's rate budget.
- **`OBJECT_ID_REGEX`** still exported (shape unchanged), but new `isValidObjectId` helper adds explicit reject for the 24-zero canonical "uninitialized" ObjectId (M3).
- **`extractRawApiKey` trims** header + query values (L2) — accidental whitespace from copy-paste no longer causes silent auth failure.
- **`createApiAuth` JSDoc** corrected (B3-E) — removed mention of a "dev `X-User-Id` fallback" that never existed in the codepath. Truthful description: Bearer header OR `ezauth_token` httpOnly cookie.
- **`testModeScopePlugin` JSDoc** documents the "NOT auto-scoped" methods (L3, L4): `aggregate()`, `deleteOne()`, `deleteMany()`, `bulkWrite()` — caller responsibility to add `{ isTestMode: ... }` filter.
- **`ttlPlugin` tests** added (22 tests across 6 describe blocks — closes the auditor "ttlPlugin has zero tests" P0 publish blocker). Source untouched.

### Changed

- **BREAKING (intentional)** — `createCsrfMiddleware` default `sameSite` changed `'strict'` → `'lax'` (L6). Lax allows top-level GET navigations from other origins to send the cookie, unblocking the common SSO link-click flow (password reset email, magic link from third-party mailbox). Paranoid callers can opt back into strict via `createCsrfMiddleware({ sameSite: 'strict' })`. Existing ezauth call sites automatically get the new lax default — which is the desired behavior for ezauth's email/SSO link flows.
- **BREAKING (intentional)** — `NODE_ENV=test` no longer bypasses rate-limiting silently (H4). Tests that relied on the bypass must opt-in explicitly via `disabled: true`. `RATE_LIMIT_FORCE` env var removed.
- Idempotency middleware 5xx responses no longer cached (H6 — client retry behavior change, considered improvement).
- `crossOriginResourcePolicy` default `'cross-origin'` → `'same-origin'` (H9 — see Hardened).

### Stats

- 410 → 581 tests (+171 across the wave).
- 20 hacker findings closed end-to-end via the strict `dev → auditor → hacker → fix loop` pipeline.
- 1 new foundation primitive (`tenantScope`) unblocking Wave E.
- Cross-consumer regression: zero. api-ezauth 649/649, api-ezpay 672/672, api-ezstart 119/119, api-gacha-analyzer 161/161, api-ezbill 67/67 — baselines preserved exactly across 13 commits.
- 2 internal regressions caught by the pipeline before commit (B3-C lint-staged revert chain + B3-A rate-limit downstream ezauth tests fixed with unique XFF per spec).

## [0.1.5] - prior

### Added

- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).
- `deprecatedRoute()` middleware for marking API endpoints as deprecated.
  Sets RFC 8594 HTTP headers (`Sunset`, `Deprecation`, `Warning`, `Link`)
  and emits a structured warn entry through the injected logger (silent
  no-op by default to keep the agnostic core dependency-free; pass
  `logger` from `@ezstart/logger/server` to surface entries to Pino /
  Sentry / Better Stack). Pairs with the browser-side
  `useDeprecationWarning()` hook in `@ezstart/ui`. See
  `.claude/rules/standard-ui.md` §10.8.
