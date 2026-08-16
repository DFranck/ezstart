# Changelog

All notable changes to `@ezstart/auth-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [1.0.0] - 2026-05-20

Inaugural publishable release. After this entry the SDK ships to npm fully
agnostic of monorepo-private packages and hardened against the Wave D
adversarial audit (HAC / AUD security findings). This is the first version
external consumers can install without dragging `@ezstart/*` internals into
their bundle.

> **Migration overview (read before deploying):** four breaking changes need
> explicit action — (1) `apiUrl` is now always explicit (no monorepo
> auto-resolution), (2) `getEzauthUrl()` signature changed, (3) OAuth
> `redirectUris` are fail-closed per-Application (register them before
> deploy or OAuth logins fail), (4) weak/breached passwords are now rejected
> (422). Details in **Changed / BREAKING** below.

### Security

- **JWT `iss` + `aud` enforcement everywhere** (HAC-CRIT-2, RFC 7519
  §4.1.1 / §4.1.3). The platform shares a single `JWT_SECRET` across
  ezauth / ezpay / ezbill / green-pulse so any API can verify a session
  token. Previously ezauth-issued tokens carried no `iss` / `aud`, so the
  other APIs verified only the HS256 signature — an ezauth-only access token
  could be presented to ezpay and pass auth as the target user (cross-API
  privilege escalation, proven by PoC). Now every token is signed with
  `iss: 'ezauth'` and `aud: ['ezauth','ezpay','ezbill','green-pulse']`, and
  every verifier enforces `{ issuer: 'ezauth', audience: '<own-slug>' }`.
  The SDK's `server/auth-middleware.ts` exposes new `issuer` (default
  `'ezauth'`) and `audience` (required) options on `AuthMiddlewareConfig`.
- **BroadcastChannel hardened to signal-only** (HAC-HIGH-1,
  `standard-sdk-dx.md` §11bis). The cross-tab `onmessage` handler previously
  trusted `event.data.user` / `event.data.accessToken` directly — same-origin
  XSS, a malicious extension, or an attacker-controlled iframe could spoof
  `{ type: 'LOGIN', user: { globalRoles: ['superadmin'] } }` and escalate
  every open tab. Broadcasts are now **signals only** (`{ type: 'LOGIN' }` /
  `{ type: 'LOGOUT' }`, no user/token on the wire); the receive side
  re-fetches the authoritative user from the server (`fetchMe`) instead of
  trusting the payload. `LOGOUT` resets immediately (a spoofed logout can only
  cause denial of service, never escalation). A 1-fetch/sec debounce prevents
  spam-the-server DoS.
- **Per-Application OAuth `redirect_uri` allowlist** (HAC-HIGH-3, RFC 6749
  §3.1.2). `/authorize` previously validated `redirect_uri` against a
  platform-wide origin allowlist instead of the requesting Application's
  registered URIs (the Application model had no `redirectUris` field). Now
  validation is per-Application with strict exact-match (case, trailing slash,
  port, userinfo, IDN — all reject).
- **Authorization-code cross-check on exchange** (HAC-HIGH-4, RFC 6749
  §4.1.3). `exchangeCodeForToken` now cross-checks the `redirect_uri` passed
  to `/token` against the `redirectUri` stored at code issuance (mismatch /
  omitted / surprise-presence all reject with `invalid_grant`). Blocks
  authorization-code injection where an intercepted code is redeemed on an
  attacker-controlled `redirect_uri`. The cross-check runs **before** the code
  is marked used, so a legitimate retry with the correct `redirect_uri` still
  succeeds after a hostile attempt (the hostile attempt does not burn the
  code).
- **PKCE S256** (RFC 7636) on same-origin authorization-code flows. Password
  login and Google OAuth (when same-origin / first-party) now mint a
  `code_verifier` + S256 `code_challenge`; ezauth binds the challenge to the
  issued auth code and verifies it (timing-safe) on exchange. The challenge
  rides the **signed** OAuth `state` JWT (tamper-proof, anti-downgrade — a
  stripped or downgraded method yields a legacy mint, never a weak binding)
  and re-binds across the 2FA step. See _Notes — PKCE coverage_ for the
  cross-origin limitation.
- **Email-verified gate on 15 privileged routes** (HAC-HIGH-2). The
  `requireEmailVerified` middleware existed but had zero wirings — an
  unverified signup could still create API keys, change password / email,
  update profile, delete account, and enroll 2FA. Now wired (after
  `authMiddleware`, before handler) on API key create/revoke/rotate, auth
  change-password / change-email / update-profile / delete-account, 2FA
  setup/verify/disable, and Application create/update/archive/update-theme/
  regenerate-webhook-secret. Recovery and basic-auth routes are intentionally
  not gated (would deadlock the verification flow). The middleware reads
  `req.user.isVerified` from the JWT — header injection (`X-Email-Verified`)
  is ignored.
- **Server-side password strength enforcement** — zxcvbn score ≥ 3
  (scored on a 64-char prefix to bound CPU) + HaveIBeenPwned Pwned-Passwords
  via SHA-1 k-anonymity (only the 5-char prefix leaves the process, via
  `fetchExternal`; fail-open on network/5xx, skipped under `NODE_ENV=test`).
  Wired into register / reset-password / change-password; rejects with stable
  422 codes (`WeakPassword` / `Pwned`). Password length floor aligned to
  `min(12)` everywhere — reset-password previously used `min(8)`, allowing a
  policy bypass (signup strong → forgot-password → reset weak); it now uses
  the canonical `ResetPasswordRequestSchema` (HAC-HIGH-5).
- **Account enumeration closed** (HAC-HIGH-2). `validateCredentials` now runs
  exactly one bcrypt compare per attempt (real for existing accounts, dummy
  cost-12 for misses) **before** any lockout check. Wrong passwords always
  return a byte-identical generic 401 — even the attempt that trips the lock.
  `AccountLockedError` (423) is thrown only when the **correct** password hits
  a locked account, so an attacker without the password cannot distinguish
  existing from non-existent accounts. `loginWithToken` delegates to the same
  hardened path (kills a second unguarded compare).
- **Raw `error.message` leakage stopped** (HAC-MED-1). New
  `toSafeErrorMessage` allowlist applied to ~19 auth routes (login,
  login-cookie, token, sessions, me, change-email, delete-account,
  quick-signup, two-factor/\*, etc.): a Mongoose dup-key / validation / cast
  error no longer leaks collection / index / field names to the client. Status
  codes unchanged; typed business errors (`WeakPassword` / `Pwned` 422,
  `AccountLocked` 423) preserved.
- **CSRF Origin allowlist hardened** (HAC-HIGH-1). The old
  `[a-z0-9-]+-ezstart.vercel.app` pattern trusted attacker-registerable hosts
  (anyone can ship a Vercel project named `pwn-ezstart`). Replaced with a
  tight pin to the exact known staging slug; unknown / `pwn-` / `evil-`
  previews now fall through to the double-submit token check (403).
  Origin-trust is kept only for DNS-controlled domains (localhost,
  `*.ezstart.xyz`, project-pinned Railway hosts). Stopgap pending
  `SDK-CSRF-TOKEN-ALWAYS-001` (SDK always sending `X-CSRF-Token` on cookie-auth
  writes); in prod the vector is already neutralized by `SameSite=Lax`.
- **Logout race closed** (HAC-CRIT-1). The Wave C `bumpLogoutEpoch()` guard
  was dead code — `logout()` never called it, so an in-flight refresh started
  before the logout click could resolve post-logout and silently re-hydrate
  fresh tokens. `logout()` now calls `bumpLogoutEpoch()` as the very first
  side-effect, ahead of the 8-step logout flow (`standard-sdk-dx.md` §11ter).
- **Defensive client hardening.** `safeGet/Set/RemoveLocalStorage`
  consolidated into `core/safe-storage.ts` so the OAuth callback, `login()`,
  and account-deletion survive Safari private-mode `QuotaExceededError`
  (storage throw no longer derails the callback — falls back to default
  redirect). The remaining `console.warn` (auth-client localhost trap) is
  routed through the injected logger (silent no-op default). `parseErrorCode()`
  now threads the server error code into all `AuthError` throws; new
  `EMAIL_VERIFICATION_REQUIRED` constant + `isEmailVerificationRequiredError()`
  guard exported.

### Added

- `<RequireTwoFactor>` guard component (2FA_MANDATORY_ADMIN-001) — blocks
  elevated-role users (admin / superadmin, global or per-app) from rendering
  admin UI until they enroll 2FA. Exported from `@ezstart/auth-sdk/components`
  with `DEFAULT_REQUIRE_TWO_FACTOR_TEXTS`. Defense-in-depth: the backend
  `requireTwoFactor()` middleware on every `/api/admin/*` route is the security
  source of truth; the guard just stops the UI from mounting so the user sees
  a friendly CTA to `/settings?tab=2fa` instead of every request 403'ing. JWT
  payload now carries the optional `twoFactorEnabled` claim, surfaced on
  `AuthUser.twoFactorEnabled` by `getMe()`. Backward compatible — claim/field
  are optional; legacy tokens coerce to `false` (default-deny).
- Documentation sandbox support (DOCS_DEMO_SANDBOX_BACKEND-001) — the
  components rendered in `/docs/components/*` can be wired to a hard-isolated
  sandbox Application (reserved slug `_docs-demo`, hard quotas, strict
  rate-limiting, 24h reset cron). Consumers wire one env var
  (`NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY`). The SDK itself is unchanged.
- JWT `isVerified` claim (JWT-ISVERIFIED-CLAIM-001) — consumers can gate
  verified-only features straight from the decoded token without a `/me`
  round trip. Optional on `JWTPayload`; legacy tokens omit it (decoder returns
  `undefined`).
- Card UI surface — `<SignInCard>`, `<SignUpCard>`, `<ForgotPasswordCard>`,
  `<ResetPasswordCard>`, `<VerifyEmailCard>`: embeddable Modal-shell variants
  with sticky header/footer + scrollable body, mobile-first.
- `'server-only'` guard at the top of every `src/server/*.ts` file — throws at
  build time if a client component imports a server helper, preventing
  cookie / token leaks into the browser bundle. The custom Node-safe guard
  (`./_internal/server-only.js`) is used instead of the npm `server-only`
  package, which crashes raw-Node Express servers at boot.
- PKCE schemas in `@ezstart/api-contracts` (additive) — optional
  `code_challenge` + `code_challenge_method` (`z.literal('S256')`, plain
  rejected) on Login/Register requests and `code_verifier` on the Token
  request (43–128 base64url). Strictly additive — no existing field changed.
- Declared Node.js `>=18.0.0` engine requirement.

### Changed

- **BREAKING — SDK no longer depends on `@ezstart/config` / `@ezstart/logger`
  at runtime** (AUD-CRIT-1, AUD-CRIT-2). The `core/` and `react/` layers are
  now agnostic per `standard.md` §0bis, so the SDK is publishable standalone
  without dragging monorepo-private packages into external bundles.
  - `createAuthClient` / `<AuthProvider>` no longer auto-resolve the API URL
    via `getApiUrl()`. **The consumer must pass `apiUrl` explicitly.** Inside
    the monorepo, resolve it at the call site (e.g. `getApiUrl('ezauth')`) and
    pass it in.
  - The Next.js `createAuthMiddleware` drops its `@ezstart/config/urls` +
    `@ezstart/logger` runtime imports and adds two options: `ezauthUrl?:
string` (caller resolves the URL; the httpOnly path that needed it falls
    through with a `logger.warn` when omitted — non-breaking) and `logger?:
AuthMiddlewareLogger` (type-only alias of `ClientLogger`, silent no-op
    default). The 4 in-repo consumer middlewares (ezbill / fengshui /
    gacha-analyzer / green-pulse) were migrated to pass
    `ezauthUrl: getWebUrl('ezauth')` at the call site.
  - The internal `isEzstartDomain` helper was inlined to drop the last
    `@ezstart/config` call site.
- **BREAKING — `getEzauthUrl()` signature changed** (AUD-CRIT-2). The
  `@ezstart/config` `getWebUrl` import was dropped from `react/sso.ts`; the
  function now takes the ezauth web URL explicitly:
  `getEzauthUrl(ezauthWebUrl, path, locale?, app?)`. Zero in-repo migration
  impact (the only call sites were the definition + the barrel export).
- **BREAKING — OAuth `redirectUris` are fail-closed per-Application.**
  Applications created before this release have `redirectUris: []` (Mongoose
  default), so OAuth flows are **disabled** until the owner registers callback
  URLs. The legacy global `getAllowedOrigins('ezauth')` allowlist is no longer
  consulted by OAuth routes. **Ops action required:** register the redirect
  URIs of every existing Application via the dashboard **before** deploying,
  otherwise OAuth logins fail (fail-closed by design — implicit allowlists
  were the vulnerability).
- **BREAKING — weak / breached passwords now rejected (422).** Previously
  accepted weak or HIBP-breached passwords are rejected on
  register / reset / change. The `min(12)` real-length floor stays.
- **BREAKING — pre-release tokens (no `iss` / `aud`) are rejected**, forcing
  re-login. Access tokens have a 15-min TTL so the blast radius is bounded;
  refresh tokens are invalidated by the post-Wave-C rotation flow.
- **BREAKING — `@ezstart/capture-sdk` moved from `dependencies` to optional
  `peerDependencies`.** It was only consumed by `<AccountModal>` /
  `<AccountModalV2>` (avatar crop UI) — never by `core/` or `server/`. npm
  consumers using those components must now install `@ezstart/capture-sdk`
  explicitly; workspace consumers are unaffected (pnpm resolves workspace
  peers automatically).
- `<AuthCardShell>` simplified — title row dropped, theme switcher hidden on
  mobile (visible `md+`). `<AccountModal>` V1 / `<AuthCardShell>` behavior
  preserved otherwise.

### Changed (internal — no public API change)

- Oversize files split into co-located modules to satisfy `standard.md` §3
  (functions < 50 lines, components < 300, files < 400). **Public surface is
  byte-identical** (barrels + generated registry unchanged, `.d.ts` diff
  confirms 74/74 public symbols preserved) — no consumer import breaks.
  - Core: `auth-client.ts` 989→319 (methods extracted by domain, `apiUrl` /
    `appName` getters stay observable mid-call), `types.ts` 570→80 barrel,
    `react/store.ts` 422→150 (signal-only broadcast extracted, factory +
    Context SSR pattern preserved).
  - Server: `auth-middleware.ts` 708→263 (JWT verify with iss/aud, scope/role
    guards, mappers extracted — each carries the server-only guard),
    `api-key-middleware.ts` 419→263, `react/auth-provider.tsx` 890→395
    (lifecycle effects/hooks/helpers extracted; effect order, `initialUser`
    bootstrap, injected logger + `fetchMe` wiring intact — no mounted guard).
  - Auth forms: `SignUpForm` 683→253, `SignInForm` 585→278,
    `ResetPasswordForm` 465→249, `TwoFactorSettings` 485→257,
    `oauth-providers-section` 436→235.
  - Admin / dashboard: `AuthErrorLogsSection` 611→233, `SettingsSection`
    485→43, `OverviewSection` 415→84, `EditUserModal` 414→176,
    `dashboard/section-renderer` 429→99, `UserDashboard` 387→131,
    `ApplicationDetailView` 366→175.
  - User menu: `UserMenuV2` 531→233, `UserMenu` (v1) 477→170 — 8-step logout
    flow preserved.
- `<UsageBadge>` refactored internally to use `<ProgressBadge>` from
  `@ezstart/ui` — public API + visual contract unchanged (`>= 50%` warning,
  `>= 80%` destructive). Data side (`useApiKeyUsage()`) stays in auth-sdk.

### Deprecated

- `UserMenu` (V1) → `UserMenuV2`. Emits a `useDeprecationWarning` at mount;
  removal planned 2026-08-01. Migration:
  `import { UserMenuV2 } from '@ezstart/auth-sdk/components'`.
- `AccountModal` (V1) → `AccountModalV2`. Removal planned 2026-08-01.
- `AuthErrorBanner` → `ErrorAlert` from `@ezstart/ui/components`. Re-exported
  with a deprecation warning; removal 2026-08-01.
- `ScopeContextIndicator` → `ScopeContextSwitcher` from `@ezstart/ui`. Removal
  2026-08-01.
- `PasswordStrength` → `@ezstart/ui/components`. Removal 2026-08-01.
- `TurnstileWidget` → `@ezstart/api-sdk/integrations` (captcha is a generic
  third-party integration, not auth-specific). Removal 2026-08-01.
- `MaintenanceBanner` → split into `useMaintenanceStatus`
  (`@ezstart/api-sdk/react`) + `MaintenanceBanner` (`@ezstart/ui/components`).
  Re-exported as a deprecated wrapper composing both for backward-compat.
  Removal 2026-08-01.
- `useMaintenanceStatus` → `@ezstart/api-sdk/react` (auth-sdk export is now a
  backward-compat shim, preserving the legacy `apiUrl?` →
  `NEXT_PUBLIC_EZAUTH_API_URL` fallback). Removal 2026-08-01.

### Documentation

- README rewritten to `standard.md` §6 format: 3-level quickstart
  (components > hooks > core) with generic `myapp` + `https://api.example.com`
  examples (no monorepo-specific names). API reference reorganized by entry
  point (core / react / components / server / middleware / rbac).
- New `examples/` directory: `examples/nextjs-minimal/` (Next.js 15 App
  Router with SSR bootstrap via `getServerAuth`) and
  `examples/vanilla-standalone/` (browser TS + Vite using
  `createCoreAuthClient` directly, zero React).

### Notes

- **PKCE coverage.** PKCE S256 is active for **same-origin** auth flows
  (first-party login: password + Google OAuth) — the `code_verifier` is kept
  in-memory (password) or sessionStorage (OAuth, cleared only after a
  successful exchange, retry-safe). **Cross-origin consumer SSO** stays on the
  legacy authorization-code path because a verifier cannot cross origins; that
  path is protected by the per-Application `redirect_uri` exact-match
  cross-check (above). Backward-compat: no verifier / `crypto.subtle`
  unavailable falls through to the legacy flow. Tracked as
  `PKCE-SSO-CROSS-ORIGIN-001`.

### Decided (no change)

- `DevModeBanner` kept in `@ezstart/auth-sdk` — it consumes `useAuth()` +
  `useAuthContext()` to display the active auth scope (test/live/admin) +
  publishable key, which is auth-domain specific, and returns `null` in
  production builds (zero shipped-bundle footprint). Moving it to
  `@ezstart/ui` would force auth context into a generic primitive — net
  negative.

[Unreleased]: https://github.com/DFranck/ezstart/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/DFranck/ezstart/releases/tag/v1.0.0
