# Changelog

All notable changes to `@ezstart/api-contracts` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-16

First production release. Wire single-source-of-truth for the @ezstart SaaS platform — envelope, error codes, pagination, auth flows, money primitives, idempotency contract, API versioning, common DTOs (Application/ApiKey/Plan), and a typed ApiError class.

### Added — new schemas, helpers, and constants

- **ApiError class** + `isApiError()` guard (moved from `@ezstart/api-sdk`). The canonical typed error class can now be thrown by api-core without depending on api-sdk.
- **Application** + `ApplicationSchema` (Zod, new) + `ApplicationStatus` + `ApplicationTheme` + optional `Application.isTestMode` (moved from `@ezstart/auth-sdk`).
- **ApiKey shapes**: `ApiKeyItem`, `ApiKeyUsageResponse`, `CreateApiKeyRequest`, `CreateApiKeyResponse` + `ApiKeyType` / `ApiKeyEnv` / `ApiKeyScope` enums (moved from `@ezstart/auth-sdk`). Scope enum widened to 5 values (`admin/user/readonly/test/live`) to match the Mongoose enum and wire emission.
- **Plan** + `PlanSchema` + `PlanMetadata` + `PlanInterval` + optional `Plan.stripeProductId` + optional `Plan.isTestMode` (moved from `@ezstart/pay-sdk`).
- **Money / Currency primitives**: `AmountCentsSchema` (integer cents, max 999_999_999), `CurrencyCodeSchema` (ISO 4217 enum, 10 currencies), `MoneySchema` (pair), `formatMoney()` helper with `Intl.NumberFormat` + locale fallback to `'en'` on invalid BCP 47 input.
- **Idempotency contract**: `IdempotencyKeySchema` (any RFC 4122 UUID variant — runtime accepts v1/v3/v4/v5/v6/v7/v8/nil), `IDEMPOTENCY_KEY_HEADER` constant, `IDEMPOTENCY_CACHE_TTL_SECONDS = 86_400` (24h).
- **API versioning**: `API_VERSION_HEADER = 'EZStart-API-Version'`, `ApiVersionSchema` (`YYYY-MM-DD`), `CURRENT_API_VERSION`, `SUPPORTED_API_VERSIONS`. Stripe-Version-style header for breaking-wire-change deprecation windows.
- **Cursor pagination**: `CursorPaginationQuerySchema`, `CursorPaginationMetaSchema`, `CursorPaginatedResponse<T>` (alongside the existing offset/page schema).
- **15 new error codes**: `PAY_CARD_DECLINED`, `PAY_INSUFFICIENT_FUNDS`, `PAY_3DS_REQUIRED`, `PAY_INVALID_PROMO`, `PAY_PROMO_EXHAUSTED`, `WEBHOOK_INVALID_SIGNATURE`, `WEBHOOK_REPLAY_DETECTED`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_KEY_INVALID`, `RATE_LIMITED`, `MAINTENANCE_MODE`, `API_VERSION_UNSUPPORTED`, `API_VERSION_INVALID`, `APPLICATION_NOT_FOUND`, `APPLICATION_ACCESS_DENIED`. Append-only — existing codes preserved.
- **`redactAuthUser()` helper** + `SENSITIVE_AUTH_USER_KEYS` (21 keys harvested from real ezauth Mongoose models). Strip server-side accidental leaks of `password`, `passwordHash`, `tempToken`, `totpSecret`, `recoveryCodes`, `magicLinkToken`, `oauthAccessToken`, `oauthRefreshToken`, `accessToken`, `refreshToken`, `tokenHash`, `webhookSecret`, `backupCodes`, `secret`, `emailVerificationToken`, `passwordResetToken`, etc.
- **`safeRedirectUri()` helper** + Zod schema with IDN/userinfo/control-char/dangerous-scheme rejection (extracted to `auth/redirect-uri.ts`).
- **`./auth` subpath export** in `package.json` exports map. Consumers can now `import from '@ezstart/api-contracts/auth'` per Stripe / Clerk SDK pattern.

### Hardened — Zod schemas now reject 23 known attack vectors

- **LoginResponseSchema** → `z.discriminatedUnion('requires2FA')`. Closes the 2FA bypass where a server response satisfying both `AuthCode` and `2FAChallenge` branches silently dropped `tempToken` under the previous `z.union`.
- **AuthUserSchema** → `.passthrough()` + 12 missing security fields (`twoFactorEnabled`, `globalRoles`, `appRoles`, `hasSetOwnPassword`, `mustChangePassword`, etc.) explicitly declared.
- **RefreshResponseSchema** → `expiresIn: int().positive().finite().max(86_400)`, tokens `.min(1).max(2048)`. Closes `Infinity`, negative, `NaN`, empty-token, oversized-token attacks.
- **RegisterRequestSchema.password** → `.min(12).max(128)`. Login keeps `.min(1)` for legacy hash-compare compat (documented in JSDoc).
- **EmailOverrideSchema** → `subject` / `heading` / `preheader` reject CRLF + NUL via `NO_CONTROL_CHARS`, `.max(998)` (RFC 5322); `bodyHtml.max(50_000)`; rejects `<script>` tags, `on*=` event handlers (tag-scoped only — plain text `<p>onclick=</p>` accepted), `javascript:` scheme with whitespace bypass (`java\tscript:` etc.). JSDoc explicit that runtime sanitization (DOMPurify) remains required for entity-decoded vectors.
- **Username / app slug / token / code** → strict allowlist regex (anti path traversal, log injection, HTML, Unicode tricks). Username `^[a-zA-Z0-9_\-.]{3,32}$`, app slug `^[a-z0-9\-]{2,32}$`, token `^[a-zA-Z0-9\-_.]{1,256}$`, code `^[a-zA-Z0-9]{6,12}$`.
- **safeRedirectUri** → reject userinfo (`evil.com@trusted`), control chars (`\n\r\t\0`), IDN raw (ASCII-only via NFKC, punycode accepted), `javascript:` / `data:` / `file:` schemes, `#javascript:` fragment XSS.
- **PaginationQuerySchema** → strict coerce union (`number | regex-string`). Rejects hex `'0x10'`, scientific `'1e2'`, arrays, booleans, valueOf objects, whitespace. `limit.max(100)`. `offset.max(10_000)` (was 1M — DoS reduction). Default `limit: 50` (was 20 — alignment with `standard-saas-data.md` §3).
- **CursorPaginationQuerySchema.cursor** → `NO_CONTROL_CHARS` filter rejects `\x00-\x1F` and `\x7F` (log injection / wire corruption).
- **PlanSchema.amount** → integer cents only via `PlanAmountCentsSchema` (was `z.number().positive()` accepting floats like `19.99`). `PlanSchema.currency` → `CurrencyCodeSchema` ISO 4217 enum (rejects lowercase `'eur'`, unknown codes).
- **LoginRequestSchema.email** → `NO_CONTROL_CHARS` filter (CRLF log injection defuse).
- **ApiKeyItemSchema** → drift with runtime closed: scope enum 3→5 values (`+user, +readonly`); `applicationId.nullable().optional()` (route emits `null`); `type` + `env` declared (were stripped on parse).

### Changed

- `auth.ts` split into 4 submodules + 1 barrel for the 400-line soft cap:
  - `auth/auth-shared.ts` (322 LOC) — primitives, `AuthUserSchema`, `EmailOverrideSchema`, regex constants
  - `auth/auth-requests.ts` (264 LOC) — 10 client→server schemas
  - `auth/auth-responses.ts` (168 LOC) — 5 server→client schemas
  - `auth/redact-auth-user.ts` (79 LOC) — `redactAuthUser()` + `SENSITIVE_AUTH_USER_KEYS`
  - `auth/redirect-uri.ts` (114 LOC) — `safeRedirectUri()` + rejection regexes
  - `auth.ts` itself becomes a 62-line barrel `export *` — every existing import path keeps resolving (zero breaking change).
- `auth/index.ts` barrel added for the new `./auth` subpath export.
- Engine requirement: `node >=18.0.0` (was unspecified).

### Deprecated (will be removed in 2.0.0)

- `ApiError` import from `@ezstart/api-sdk` → import from `@ezstart/api-contracts`. Origin package keeps re-export with `@deprecated`.
- `Application` (type) import from `@ezstart/auth-sdk` → import from `@ezstart/api-contracts`.
- `ApiKeyItem`, `CreateApiKeyRequest`, `CreateApiKeyResponse`, `ApiKeyUsageResponse`, `ApiKeyType`, `ApiKeyEnv`, `ApiKeyScope` import from `@ezstart/auth-sdk` → import from `@ezstart/api-contracts`.
- `Plan` (and sub-types) import from `@ezstart/pay-sdk` → import from `@ezstart/api-contracts`.

All deprecated re-exports remain functional through one minor release. Will be removed in `v2.0.0`.

### Migrations applied across the monorepo

- **23 inline `z.coerce.number()` pagination callsites** in `apps/*/api/` migrated to `PaginationQuerySchema` import. Affected apps: api-ezauth (2), api-ezpay (7), api-ezstart (13), api-gacha-analyzer (1). Side-effect security wins: 3 previously-unbounded `limit` parameters now capped at 100 (`activity/list`, `health/history`, `health/project-history` — DoS surface eliminated).
- **ESLint rule `no-inline-pagination-schema`** added to `@ezstart/eslint-plugin-ezstart` and activated at `error` level in `@ezstart/eslint-config/base`. Detects `z.coerce.number().int().min(...).max(...)` standalone and `limit/offset/pageSize: z.coerce.number()` in object schemas. Sibling `page` exemption preserves the legitimate page+limit pagination pattern.

### Stats

- 269 → 569 tests (+300 over 11 files).
- 23 hacker findings closed end-to-end via the `dev → auditor → hacker → fix loop` pipeline (8 critical + 7 high + 5 medium + 3 P2).
- 3 hardening regressions caught by hacker and fixed before commit (`bodyHtml` whitespace over-correction, `SENSITIVE_AUTH_USER_KEYS` incomplete, `ApiKey` scope/applicationId drift).
- Cross-consumer regression: zero. Pre-existing baselines hold exactly (auth-sdk 586/587, pay-sdk 372/383). All 6 affected API test suites green post-migration.
