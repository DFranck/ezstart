# E2E Tests — Staging (2026-04-17)

## Environment
- **Branch**: staging
- **Web**: `*-git-staging-ezstart.vercel.app`
- **APIs**: `*-api-staging.up.railway.app`
- **User**: test-global@ezstart.dev (superadmin)
- **DB**: Staging cluster (separate from prod)

---

## Infra & Config

| # | Test | Status | Notes |
|---|------|--------|-------|
| I01 | ezauth API health | ✅ PASS | `ezauth-api-staging.up.railway.app/health` → `{"status":"ok"}` |
| I02 | DEPLOY_ENV=staging on Vercel | ✅ PASS | Added via API, branch-scoped to `staging` |
| I03 | SSO_ALLOWED_REDIRECTS staging | ✅ PASS | All 8 staging Vercel URLs added on Railway |
| I04 | Client-side env detection | ✅ PASS | Fix: `NODE_ENV=production` in browser was bypassing hostname detection. Fixed by making NODE_ENV check server-side only. |
| I05 | API URL resolution (browser) | ✅ PASS | `getCurrentEnvironment()` now correctly returns `staging` for `*-git-staging-*.vercel.app` hostnames |
| I06 | Vercel SSO protection disabled | ✅ PASS | Disabled on ezauth, ezpay, ezstart, green-pulse-web |

## Auth Flows (EZAuth)

| # | Test | Status | Notes |
|---|------|--------|-------|
| T01 | Login test-global via credentials | ✅ PASS | POST to staging API → 200, redirect callback OK |
| T02 | Admin Dashboard render | ✅ PASS | 1 user, Superadmins: 1, Online: 1 (green), badges OK, dark mode OK |
| T03 | Logout flash prevention | ⏳ NOT TESTED | Need to logout and verify no layout clip |
| T04 | QuickSignup new user | ⏳ NOT TESTED | |
| T05 | OAuth Google | ⏳ SKIP | Can't automate Google OAuth in MCP |
| T06 | Forgot password | ⏳ NOT TESTED | |
| T07 | Developer Portal (API Keys) | ❌ FAIL | Infinite spinner — `isAuthReady` not set after store rehydration. Bug: `onRehydrateStorage` callback doesn't fire or is too late. Page checks `isAuthReady` but it's not persisted. |
| T08 | Developer Billing page | ⏳ NOT TESTED | Blocked by T07 |
| T09 | Edit user (admin) | ⏳ NOT TESTED | |
| T10 | Delete user (admin) | ⏳ NOT TESTED | |
| T11 | Settings page | ⏳ NOT TESTED | |

## Payments (EZPay)

| # | Test | Status | Notes |
|---|------|--------|-------|
| T12 | EZPay landing page | ✅ PASS | Donations/Purchases/Subscriptions cards, SDK docs, dark mode OK |
| T13 | Login via SSO (EZPay → EZAuth) | ✅ PASS | Redirect to staging ezauth with `app=ezpay&redirect_uri=...staging...`, login OK, callback OK, logged in as test-global |
| T14 | Developer Portal (Connect) | ✅ PASS | Onboarding form (email, business name, account type), Platform Plans (Starter/Growth/Enterprise), dark mode OK |
| T15 | Connect onboarding submit | ⏳ NOT TESTED | Requires Stripe sandbox |
| T16 | EZPay Admin Dashboard | ⏳ NOT TESTED | |

## GreenPulse Chat

| # | Test | Status | Notes |
|---|------|--------|-------|
| T17 | GreenPulse staging load | ⏳ NOT TESTED | |
| T18 | Chat send message | ⏳ NOT TESTED | |
| T19 | Conversation sidebar | ⏳ NOT TESTED | |

## EZStart

| # | Test | Status | Notes |
|---|------|--------|-------|
| T20 | EZStart staging load | ❌ FAIL | "Something went wrong in EZStart" — crash on all pages. Likely related to `force-dynamic` on layout or missing API env vars. |

## Cross-App SSO

| # | Test | Status | Notes |
|---|------|--------|-------|
| T21 | SSO EZPay → EZAuth → callback | ✅ PASS | Full flow tested, redirect with staging URLs |

---

## Known Staging Issues

### 1. `isAuthReady` not set after rehydration (BLOCKER for developer pages)
- **Impact**: Developer Portal page on ezauth shows infinite spinner
- **Root cause**: `isAuthReady` is a runtime-only state (not persisted). After store rehydration from localStorage, `isAuthReady` stays `false`.
- **Fix needed**: Set `isAuthReady = true` in `onRehydrateStorage` callback, or change page guard to check `isAuthenticated && user` instead.

### 2. EZStart staging crashes
- **Impact**: All ezstart web pages show "Something went wrong"
- **Root cause**: Likely `force-dynamic` on locale layout or missing staging env vars for ezstart API
- **Fix needed**: Investigate error logs or test without `force-dynamic`

### 3. Cookie cross-domain (staging only)
- **Impact**: httpOnly cookies from Railway API don't propagate to Vercel web domains
- **Workaround**: Auth works via localStorage token (code flow). This is staging-only; prod uses shared `.ezstart.xyz` domain.

---

## Fixes Applied During Testing

1. **`getCurrentEnvironment()` NODE_ENV bypass** — Next.js sets `NODE_ENV=production` in client bundles, causing all browser env detection to resolve as `production`. Fixed by making NODE_ENV check server-side only.
2. **Vercel SSO protection** — Disabled on staging projects to allow public access.
3. **DEPLOY_ENV on Vercel** — Added `DEPLOY_ENV=staging` scoped to `staging` branch on all 4 Vercel projects.
4. **SSO_ALLOWED_REDIRECTS** — Added all staging Vercel URLs on Railway ezauth staging.
5. **Hostname staging detection** — Added `*-git-staging-*` pattern to `getCurrentEnvironment()` for Vercel preview deploys.
6. **test-global staging seed** — Registered + promoted to superadmin in staging DB.
