# @ezstart/auth-sdk

Authentication SDK with 3-layer architecture: core (agnostic), React bindings, and pre-built UI components.

## Install

```bash
pnpm add @ezstart/auth-sdk
```

## Architecture

```
auth-sdk/src/
├── core/                 # Agnostic (zero React, zero @ezstart/*)
│   ├── auth-client.ts    # createCoreAuthClient({ apiUrl, appName })
│   ├── token-manager.ts  # Token storage abstraction
│   ├── types.ts          # AuthUser, AuthToken, LoginRequest, etc.
│   ├── errors.ts         # AuthError, isAuthError()
│   ├── schemas.ts        # Zod response schemas
│   └── index.ts          # Barrel: core-only exports
│
├── react/                # React bindings (peer dep: react)
│   ├── auth-provider.tsx # <AuthProvider> with auto-refresh
│   ├── hooks.ts          # useAuth()
│   ├── guards.tsx        # <RequireAuth>, <SignedIn>, <SignedOut>, <AccessDenied>
│   ├── store.ts          # Zustand auth store
│   └── index.ts          # Barrel: react exports
│
├── components/           # Pre-built UI (peer dep: react + @ezstart/ui)
│   ├── SignInForm.tsx
│   ├── SignUpForm.tsx
│   ├── QuickSignUpForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── ResetPasswordForm.tsx
│   ├── AccountModal.tsx        # orchestrator — sub-sections in account/
│   ├── account/                # AccountProfileSection, AccountSettingsSection, sso-handoff
│   ├── TwoFactorPrompt.tsx
│   ├── TwoFactorSettings.tsx
│   ├── VerifyEmailFlow.tsx
│   ├── AuthAdminDashboard.tsx  # orchestrator — sub-components in admin/
│   ├── admin/                  # AdminUsersTable, EditRolesModal, AdminStatsCards
│   ├── EZAuthDashboard.tsx     # orchestrator — sub-components in dashboard/
│   ├── dashboard/              # SectionRenderer, OverviewSection, BillingSection, ...
│   ├── UserDashboard.tsx
│   ├── UserSettings.tsx
│   ├── UserMenu.tsx
│   ├── UserAvatar.tsx
│   ├── internal-logger.ts      # silent no-op logger (no @ezstart/logger dep)
│   ├── developer/              # API keys management UI
│   └── index.ts
│
├── middleware/            # Next.js auth middleware
├── rbac/                 # Role-Based Access Control
├── i18n/                 # Built-in translations (en, fr, vi)
├── server.ts             # Server-side schemas + client
└── index.ts              # Main barrel: re-exports everything
```

## Quickstart — React with components (full UI)

Drop-in pre-built UI. Requires `@ezstart/ui` as peer dep.

```tsx
import { AuthProvider, SignInForm, useAuth } from '@ezstart/auth-sdk'
;<AuthProvider apiUrl="https://auth.example.com/api/auth" appName="myapp" authMode="httpOnly">
  <App />
</AuthProvider>

// In your app
function Page() {
  const { user, login, logout, isAuthenticated } = useAuth()
  return isAuthenticated ? <Dashboard /> : <SignInForm />
}
```

## Quickstart — React hooks only (no UI)

Build your own UI. Only `react` as peer dep.

```tsx
import { AuthProvider, useAuth } from '@ezstart/auth-sdk/react'
import { createCoreAuthClient } from '@ezstart/auth-sdk/core'

const client = createCoreAuthClient({
  apiUrl: 'https://auth.example.com/api/auth',
  appName: 'myapp',
})

<AuthProvider client={client} appName="myapp">
  <App />
</AuthProvider>
```

## Quickstart — Core only (any JS, no React)

Use from Vue, Svelte, vanilla JS, Node, React Native. Zero framework deps.

```ts
import { createCoreAuthClient } from '@ezstart/auth-sdk/core'

const client = createCoreAuthClient({
  apiUrl: 'https://auth.example.com/api/auth',
  appName: 'myapp',
})

const user = await client.loginWithCookie('user@example.com', 'password')
const me = await client.getCurrentUser()
```

## API

### Core (`@ezstart/auth-sdk/core`)

- `createCoreAuthClient(config)` — Framework-agnostic auth client using raw `fetch()`
- `CoreAuthClient` — Class with login, logout, refresh, token exchange, profile update
- `AuthError` — Error class with HTTP status code
- `TokenManager` — Token persistence abstraction
- `createLocalStorage()` / `createMemoryStorage()` — Built-in storage backends

### React (`@ezstart/auth-sdk/react`)

- `<AuthProvider>` — Context provider with auto-refresh
- `useAuth()` — Main hook (user, login, logout, isAuthenticated)
- `useAuthStore()` — Zustand store (direct access)
- `<RequireAuth>` — Route protection wrapper
- `<SignedIn>` / `<SignedOut>` — Conditional rendering
- `<AccessDenied>` — Fallback component

### Components (`@ezstart/auth-sdk/components`)

- `<SignInForm>` — Login form with OAuth and 2FA support
- `<SignUpForm>` — Registration form with password strength and promo codes
- `<QuickSignUpForm>` — Passwordless signup (username + email only)
- `<ForgotPasswordForm>` / `<ResetPasswordForm>` — Password recovery
- `<TwoFactorPrompt>` / `<TwoFactorSettings>` — 2FA UI
- `<VerifyEmailFlow>` — Email verification page
- `<AccountModal>` — Clerk-like account management modal
- `<UserMenu>` — Dropdown user menu with avatar
- `<UserAvatar>` — Avatar with initials fallback
- `<UserSettings>` — Settings display page
- `<AuthAdminDashboard>` — Admin user management with DataTable

### Middleware

- `createAuthMiddleware(config)` — Next.js middleware for protected routes
- `createProtectedMiddleware(config)` — SSR middleware with JWT decode

### Server

- Schemas for API validation (login, register, token, verify)
- Type exports for server-side code

## i18n — `texts` prop pattern (no i18n library required)

The components layer is **agnostic of any i18n library** — it does not import
`next-intl`, `react-intl`, or anything similar. All user-facing strings are
accepted via a `texts?: Partial<...Texts>` prop with English defaults baked in,
and the active locale is auto-detected from the URL pathname (e.g.
`/fr/login` → `'fr'`) so the bundled `en | fr | vi` dictionaries pick the
right language out of the box.

```tsx
import { useTranslations } from 'next-intl' // your i18n lib (or any other)
import { SignInForm } from '@ezstart/auth-sdk/components'

function LoginPage() {
  const t = useTranslations('auth.signIn')
  return (
    <SignInForm
      appName="myapp"
      texts={{
        emailOrUsername: t('emailLabel'),
        password: t('passwordLabel'),
        submit: t('submit'),
        // ... only override what you need; rest falls back to EN/FR/VI defaults
      }}
    />
  )
}
```

If you do not pass `texts`, the form renders with the bundled localized
defaults — pass `locale="fr"` (or any other supported tag) to force a
specific language without touching `texts`.

## Federated admin (cross-origin embedding)

`<AuthAdminDashboard>` accepts `apiUrl` and `authToken` overrides so a
platform hub (Tier 3 — e.g. `apps/ezstart/web/admin`) can embed the user
management table cross-origin while forwarding a platform-wide superadmin
JWT instead of the local session token.

```tsx
import { AuthAdminDashboard } from '@ezstart/auth-sdk/components'

;<AuthAdminDashboard
  apiUrl="https://auth.example.com"
  authToken={() => mySuperadminJwt}
  scope="all"
  appName="*"
/>
```

When `apiUrl` and `authToken` are omitted, the component falls back to the
surrounding `<AuthProvider>` configuration (single-app standalone mode).

## Theme handoff (`?theme=`)

`<LoginButton>` and `<RegisterButton>` propagate the consumer's current
light/dark scheme to the EZAuth web app via `?theme=<light|dark|system>` so
the auth pages render in the same scheme — zero flash on redirect. The
matching `<AuthCallbackPage>` reads the param on the way back and writes
the `theme` cookie that `next-themes` picks up, so a user who switched
scheme on the auth pages keeps the new preference on the consumer.

Override the auto-detected value with the optional `theme` prop:

```tsx
<LoginButton theme="dark">Sign in</LoginButton>
```

## Configuration safety

`resolveSDKConfig` (used internally by `<AuthProvider>`) **fails fast** with
`AuthError({ code: 'CONFIG_ERROR' })` instead of silently falling back to
localhost or a hardcoded vendor host when run off-localhost. This prevents
broken production flows that only surface at login time.

Throws when:

1. **No URL signals** — off-localhost with no `apiUrl`, no `publishableKey`,
   and no `firstParty: true`. Fix: pass an explicit `apiUrl` (or use a
   `publishableKey`).
2. **`publishableKey` without `apiUrl` off-localhost** — the SDK can't know
   where to call `/api/keys/config`. Fix: pass `apiUrl` alongside the key.
3. **`firstParty: true` without an explicit `appName` off-localhost** —
   defaulting to `'ezauth'` would cause cross-tenant request leaks (every
   auth call carries `app=ezauth`). Fix: always set `appName` explicitly
   when enabling first-party mode in staging/prod.
4. **`webUrl` resolves to `localhost` off-localhost** — usually means the
   `NEXT_PUBLIC_EZAUTH_WEB_URL` env var is missing or empty in the target
   environment. Without this guard the user would be redirected to
   `http://localhost:6111` at login/register time. Fix: set the env var or
   pass `webUrl` explicitly to your provider.

Localhost (`localhost`, `*.localhost`, `127.0.0.1`, `0.0.0.0`, `::1`) keeps
permissive defaults so zero-config dev still works.

### SSR / Next.js note

`isLocalhost()` returns `false` when `window` is `undefined` (server side),
so any of the cases above will throw during SSR/RSC if the corresponding
signal is missing. Two safe patterns:

- **Explicit apiUrl**: pass `apiUrl` (and `webUrl` when non-defaults are in
  play) as literal strings to the provider — it resolves identically on
  server and client.
- **Client-only provider**: render `<AuthProvider>` behind a `'use client'`
  boundary so the hostname check happens in the browser.

## Migration from flat structure

No migration needed. All existing imports from `@ezstart/auth-sdk` continue to work:

```ts
// These all still work unchanged:
import { AuthProvider, useAuth, useAuthStore } from '@ezstart/auth-sdk'
import { AuthClient, createAuthClient } from '@ezstart/auth-sdk'
import { SignInForm, SignUpForm } from '@ezstart/auth-sdk'
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import type { AuthUser, JWTPayload } from '@ezstart/auth-sdk/server'
```

New entry points for targeted imports:

```ts
import { createCoreAuthClient } from '@ezstart/auth-sdk/core' // No React needed
import { AuthProvider, useAuth } from '@ezstart/auth-sdk/react' // No @ezstart/ui needed
import { SignInForm } from '@ezstart/auth-sdk/components' // Full UI
```

## Related

- [EZAuth app](../../apps/ezauth) — The auth service this SDK connects to
- [@ezstart/api-contracts](../api-contracts) — Wire-level request/response schemas
- [@ezstart/ui](../ui) — UI components used by the components layer

## Used By

All web apps (ezstart, ezbill, green-pulse, gacha-analyzer, fengshui, asc-tcd, ezauth).
