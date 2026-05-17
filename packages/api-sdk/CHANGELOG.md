# Changelog

All notable changes to `@ezstart/api-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-17

Inaugural public release. First version published to npm.

### Documentation

- README rewritten following `standard.md` §6 format: quickstarts split by
  integration level (vanilla TS via `apiCall` / `createApiClient`, React via
  `apiQuery`, third-party via `/integrations`). Examples use generic
  `myapp` + `https://api.example.com` (no monorepo-specific names).

### Added

- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).
- New `./integrations` entry point exposing third-party service wrappers
  designed to be drop-in across any consumer app or SDK.
- `TurnstileWidget` (`@ezstart/api-sdk/integrations`) — Cloudflare Turnstile
  captcha React wrapper. Renders nothing when `siteKey` is empty so apps
  can ship without captcha and enable it later via env var. Lazy-injects
  the Cloudflare script (idempotent), supports HMR / StrictMode unmount,
  and accepts a silent-by-default `logger` prop. Originally lived in
  `@ezstart/auth-sdk` — moved here because Cloudflare Turnstile is a
  generic captcha integration usable on any form (contact, signup,
  passwordless flows, etc.), not auth-specific.
- `useMaintenanceStatus` (`@ezstart/api-sdk/react`) — public maintenance
  status hook with React Query. Polls a `/maintenance-status`-style
  endpoint and silently degrades to "no maintenance" on any network or
  parse failure so a misconfigured upstream never breaks the consumer
  banner. Pairs with `<MaintenanceBanner>` from `@ezstart/ui/components`
  (data layer / presentation split). Originally lived in `@ezstart/auth-sdk`
  — moved here because maintenance status is a platform-wide concern,
  not auth-specific. The hook is fully agnostic: consumer passes an
  explicit `apiUrl`, no monorepo-specific URL resolution. Also exposes
  `MaintenanceStatus` type for ergonomic typing on the consumer side.
- `idempotencyKey?: string | 'auto'` option on `ApiCallOptions` with retry-safe
  UUID baking — when set to `'auto'`, a UUID v4 is generated once and reused
  across automatic retries so the server-side dedup window holds (Lot 4).
- `bumpLogoutEpoch()` exported `@internal` from `core/internal/refresh.js` for
  auth-sdk to call before clearing the token store, guaranteeing in-flight
  refreshes cannot re-hydrate tokens post-logout (CRIT-2).
- `resetRefreshBreaker()` exported `@internal` from `core/internal/refresh.js`
  for tests to reset the circuit breaker state between cases (CRIT-3).
- `CreateRefreshHelperOptions` now threads `credentials` + `logger` so the
  refresh fetch shares the consumer's cookie policy and observability sink
  (HIGH-2).
- `RefreshOptions` accepts `signal?: AbortSignal` and propagates it into the
  refresh `fetch` so navigation-cancelled requests do not silently re-hydrate
  the token store after the user moved on (CRIT-1).
- `useInfiniteQuery` now throws synchronously when the consumer's `query`
  option contains reserved `limit` or `offset` keys, instead of silently
  letting them collide with hook-managed pagination (MED-7).

### Changed

- `appendQuery` now preserves URL `#fragment` via `indexOf('#')` split-then-reattach
  so `?key=val` is inserted before the fragment instead of corrupting it (CRIT-4).
- `parseApiError` adds a PRIORITY-1.5 path that unwraps nested
  `payload.error.details[0].message` (Zod validation errors wrapped in the
  envelope error object), recovering actionable messages that previously
  fell through to generic "Validation failed" (HIGH-3).
- `buildHeaders` performs case-insensitive merge for `Accept`, `Content-Type`
  and `Authorization` via a new `hasHeaderCI` helper, preventing duplicate
  headers when the consumer passes `accept` and the SDK adds `Accept`
  (MED-5).
- `buildHeaders` defaults `Accept: application/json` when `options.json === true`
  and no explicit `Accept` header is provided by the caller (MED-6).
- `useMaintenanceStatus` queryFn now accepts React Query's `{ signal }` and
  propagates it to the underlying `fetch`. `AbortError` is re-thrown instead
  of being swallowed by the silent-degrade fallback, so React Query's
  cancellation semantics work correctly (MED-1).
- `createApiClient` now forwards `resolved.credentials` and `resolved.logger`
  into the refresh helper so cookie policy + observability stay consistent
  between primary fetches and refresh fetches (AUDIT-1).

### Fixed

- Refresh fetch was missing `credentials: 'include'`, breaking cookie-based
  refresh schemes (httpOnly refresh token never sent over the wire) (CRIT-1).
- Refresh started by an aborted apiCall silently re-hydrated tokens after the
  user navigated away — refresh now honours the caller's `AbortSignal` (CRIT-1).
- Logout/refresh race could re-log a user back in: `bumpLogoutEpoch()` guard
  via a module-level epoch snapshot taken pre-fetch + verified post-fetch
  drops the result when the user logged out mid-flight (CRIT-2).
- Pathological 401 storms could trigger refresh storms — a circuit breaker
  (3 failures within a 60 s rolling window) now refuses further refresh
  attempts and lets the consumer surface the auth failure (CRIT-3).
- Throwing logger transports (e.g. pino down, network log drain) converted
  a soft refresh fallback into a hard promise rejection — all internal
  warnings now go through `safeWarn()` which catches transport errors
  (VULN-1, standard-sdk-dx §11bis.2).
- `AbortError` from navigation-cancelled fetches tripped the breaker
  (3 navigations = 60 s self-DoS) — an abort carve-out skips
  `recordRefreshFailure()` for aborted requests (VULN-2).

### Deprecated

- `__resetRefreshPromiseForTests` from `ezstart-client` — use
  `createApiClient(...).refreshHelper.reset()` or `resetRefreshBreaker()`
  from `core/internal/refresh` instead (HIGH-5).
- Monorepo wrapper exports `apiCall` / `apiStream` / `apiQuery` / `ezstartClient`
  — use the `createApiClient` factory from `@ezstart/api-sdk/core` instead.
  A runtime warn fires once per session per export. The wrapper requires
  the monorepo-only `@ezstart/config` + `@ezstart/logger` (now optional
  peer dependencies). Full removal scheduled for Wave D / next major bump.

### Security

- **Authorization header policy change** — caller-supplied `Authorization`
  header now overrides the token store (`tokenStore.getAccessToken()` only
  fills the gap when no explicit `Authorization` is present in `headers`).
  The prior behaviour (token-store wins) was an inverted threat model
  (a compromised consumer already has token-store access) and blocked
  legitimate use cases (Basic auth override, delegated tokens, per-request
  service-account tokens). New behaviour matches Axios, Ky, Stripe SDK,
  Clerk SDK and WHATWG fetch conventions. Captured by the inverted
  `security/header-injection.test.ts` VULN-2c regression test.

### Build

- Build script switched to `tsc -b --clean && tsc -b` to wipe stale `dist/`
  artifacts before each build (eliminates the `dist/core/react-query.js`
  orphan left over from the prior src-layout shuffle).

### Dependencies

- `@ezstart/config` and `@ezstart/logger` moved from `dependencies` to
  `peerDependencies` with `optional: true`. External npm consumers install
  only `@ezstart/api-sdk` + `@ezstart/api-contracts` and use `createApiClient`
  from `@ezstart/api-sdk/core`. Monorepo apps continue to resolve the
  optional peers via pnpm workspace. Bundlers tree-shake the wrapper module
  thanks to `sideEffects: false`; native Node ESM consumers must use the
  `/core` entry point to avoid the optional-peer import.
