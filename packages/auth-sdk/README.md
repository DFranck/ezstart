# @ezstart/auth-sdk

Drop-in authentication SDK for React + Express apps with email/password, OAuth, 2FA, sessions, RBAC, and API key management.

## Install

```bash
npm install @ezstart/auth-sdk
# Peer deps for the components entry: react, react-dom, sonner, @ezstart/ui
```

## Quickstart — React with components

The fastest path: wrap your app in `<AuthProvider>` and drop in pre-built UI.

```tsx
'use client'
import { AuthProvider } from '@ezstart/auth-sdk'
import { LoginButton, UserMenu } from '@ezstart/auth-sdk/components'

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider apiUrl="https://api.example.com" appName="myapp" authMode="httpOnly">
      <header>
        <UserMenu fallback={<LoginButton>Sign in</LoginButton>} />
      </header>
      {children}
    </AuthProvider>
  )
}
```

For a Next.js App Router setup with **zero login flash on first paint**, resolve
the user server-side via `getServerAuth()` and pass it as `initialUser`:

```tsx
// app/[locale]/layout.tsx — Server Component
import { headers } from 'next/headers'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { Providers } from '@/components/providers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieHeader = (await headers()).get('cookie') ?? undefined
  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL!,
    cookieHeader,
  })
  return <Providers initialUser={initialUser}>{children}</Providers>
}
```

```tsx
// components/providers.tsx — Client Component
'use client'
import { AuthProvider, type AuthUser } from '@ezstart/auth-sdk'

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: AuthUser | null
}) {
  return (
    <AuthProvider
      apiUrl={process.env.NEXT_PUBLIC_AUTH_API_URL!}
      appName="myapp"
      authMode="httpOnly"
      initialUser={initialUser}
    >
      {children}
    </AuthProvider>
  )
}
```

See [`examples/nextjs-minimal`](./examples/nextjs-minimal) for a complete starter.

## Quickstart — React hooks only

If you want full UI control with the auth state hook (no `@ezstart/ui` peer dep):

```tsx
'use client'
import { AuthProvider, useAuth } from '@ezstart/auth-sdk/react'

function Header() {
  const { user, isAuthenticated, login, logout } = useAuth()
  if (!isAuthenticated) {
    return <button onClick={() => login({ email, password })}>Sign in</button>
  }
  return (
    <>
      <span>Hello, {user.username}</span>
      <button onClick={logout}>Sign out</button>
    </>
  )
}

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider apiUrl="https://api.example.com" appName="myapp" authMode="httpOnly">
      <Header />
      {children}
    </AuthProvider>
  )
}
```

## Quickstart — Core only

For Vue, Svelte, vanilla JS, Node, or React Native — zero framework deps:

```ts
import { createCoreAuthClient } from '@ezstart/auth-sdk/core'

const client = createCoreAuthClient({
  apiUrl: 'https://api.example.com',
  appName: 'myapp',
})

const user = await client.loginWithCookie('user@example.com', 'password')
const me = await client.getCurrentUser()
await client.logout()
```

See [`examples/vanilla-standalone`](./examples/vanilla-standalone) for a complete browser starter.

## API

### Core (`@ezstart/auth-sdk/core`)

- `createCoreAuthClient(config)` — Factory for the framework-agnostic client. Returns `login`, `logout`, `refresh`, `getCurrentUser`, `updateProfile`, etc.
- `AuthError` — Typed error class with `code` and `status`. The client now threads the server's `error.code` into `AuthError.code` so consumers can `switch` on it instead of matching error strings.
- `EMAIL_VERIFICATION_REQUIRED` / `isEmailVerificationRequiredError(err)` — Constant + type guard for the `403` returned by the `requireEmailVerified` server gate on privileged routes. Use the guard to surface a "verify your email" prompt (`<EmailVerificationBanner>` / resend CTA) instead of a generic error.
- `TokenManager` — Pluggable token persistence interface.
- `createLocalStorage()` / `createMemoryStorage()` — Built-in storage backends.

### React (`@ezstart/auth-sdk/react`)

- `<AuthProvider>` — Context provider with auto-refresh. Owns the per-tree Zustand store. Accepts `initialUser` for SSR bootstrap (no login flash).
- `useAuth()` — Main hook returning `{ user, isAuthenticated, login, logout, ... }`.
- `useAuthStore(selector?)` — Bound hook reading the per-Provider Zustand store.
- `useAuthStoreApi()` — Returns the store instance for imperative `getState()` / `setState()` access inside the React tree.
- `useAuthStoreGetSnapshot()` — Stable `() => state` reader for closures passed to non-React APIs.
- `<RequireAuth>` — Route protection wrapper. Auto-redirects to `/{locale}/login?redirect_uri=...` by default; accepts `loginPath`, `redirectTo`, or `fallbackComponent`.
- `<SignedIn>` / `<SignedOut>` — Conditional rendering for partial UI (no redirect).
- `<AccessDenied>` — Default fallback component for unauthorized access.

### Components (`@ezstart/auth-sdk/components`)

**Auth flows**

- `<SignInForm>`, `<SignUpForm>`, `<QuickSignUpForm>` — Login and registration forms with OAuth + 2FA support.
- `<ForgotPasswordForm>`, `<ResetPasswordForm>` — Password recovery.
- `<TwoFactorPrompt>`, `<TwoFactorSettings>` — TOTP enrollment and challenge.
- `<VerifyEmailFlow>`, `<EmailVerificationStatus>` — Email verification flow + inline status.
- `<MagicLinkButton>` — Passwordless email login.
- `<EmailChangeForm>` — Change email with verification + cooldown.
- `<OAuthButtons>`, `<OAuthProvidersSection>` — OAuth sign-in buttons + connected providers manager.
- `<LoginButton>`, `<RegisterButton>` — Header CTAs with theme handoff (`?theme=` propagation).
- `<AuthCallbackPage>` — OAuth/SSO callback handler page.

**User account**

- `<AccountModal>` — Clerk-like account management modal.
- `<UserMenu>`, `<UserAvatar>` — Header dropdown + avatar with initials fallback.
- `<UserSettings>`, `<UserDashboard>` — Settings and dashboard pages.
- `<SessionsManager>` — Active sessions list with revoke.
- `<DeleteAccountSection>` — Soft-delete with confirmation + grace period.
- `<AuditLogSection>` — User activity log.

**Admin**

- `<AuthAdminDashboard>` — All-in-one admin console (Overview / Users / Applications / Settings tabs). Auto-scoped server-side via JWT (`req.derivedScope`): superadmin sees all tenants, app admin sees owned Applications, regular user sees own account.
- `<MaintenanceBanner>` — Maintenance window status banner.

**Developer (API keys)**

- `<DeveloperPortal>` — Full developer dashboard (keys CRUD + usage).
- `<ApiKeysTable>`, `<CreateKeyModal>`, `<KeyCreatedModal>` — Key management primitives.
- `<UsageDetailsModal>`, `<UsageBadge>` — Per-key usage drill-down.

**Applications (multi-tenant)**

- `<ApplicationsList>`, `<ApplicationCard>` — Owner's Applications list.
- `<CreateApplicationModal>` — New Application wizard.
- `<ApplicationDetailView>` — Application settings + theme + keys.

### Server (`@ezstart/auth-sdk/server`)

Server-only helpers (`import 'server-only'` guards). Safe to call from any Server Component or Route Handler.

- `getServerAuth({ apiUrl, cookieHeader })` — Resolve current user from the session cookie. Returns `null` for anonymous requests.
- `getServerApiKeys({ apiUrl, cookieHeader })` — List API keys for the current user.
- `getServerApplication({ apiUrl, cookieHeader, id })` — Fetch a single Application.
- `getServerApplications({ apiUrl, cookieHeader })` — List Applications owned by the current user.
- `getServerAuditLog({ apiUrl, cookieHeader })` — Fetch audit log entries.
- `hasFeature(user, flag)` — Server-side feature flag check.

### Middleware (`@ezstart/auth-sdk/middleware`)

- `createAuthMiddleware(config)` — Express middleware that accepts JWT cookie + Bearer + `X-API-Key` on the same routes. Bundles JWT verification, API-key lookup, monthly quota cache, scope policy, and best-effort tracking.

```ts
import { createAuthMiddleware } from '@ezstart/auth-sdk/server'

const authJwtOrKey = createAuthMiddleware({
  appName: 'myapp',
  jwtSecret: process.env.JWT_SECRET!,
  cookieName: 'access_token',
  getApiKeyModel,
  getApiKeyUsageModel,
  getAuthUserModel,
})

router.get('/me', authJwtOrKey(), controller)
router.get('/admin/users', authJwtOrKey({ requireKeyScope: 'admin' }), controller)
```

### RBAC (`@ezstart/auth-sdk/rbac`)

- `hasRole(user, role)` / `hasGlobalRole(user, role)` — Role checks.
- `requireRole(role)`, `requireAdmin()`, `requireSuperadmin()` — Express middleware factories.
- `<RequireRole>` — React guard component.

### i18n — `texts` prop pattern

The components layer is **agnostic of any i18n library**. All user-facing strings are accepted via a `texts?: Partial<...Texts>` prop with English defaults baked in. Locale is auto-detected from the URL pathname (`/fr/login` → `'fr'`).

```tsx
import { SignInForm } from '@ezstart/auth-sdk/components'
;<SignInForm
  appName="myapp"
  texts={{
    emailOrUsername: 'Email or username',
    password: 'Password',
    submit: 'Continue',
  }}
/>
```

Bundled defaults: `en`, `fr`, `vi`. Pass `locale="fr"` to force a specific language without overriding `texts`.

### Hosted vs Embedded auth UX

Two patterns supported:

**Pattern A — Hosted login** (redirect to a hosted EZAuth-style page): drop `<LoginButton>` + `<AuthCallbackPage>`. Zero auth UI code, central security, cross-app SSO trivial.

**Pattern B — Embedded forms** (stay on your domain): build your own `/login`, `/register`, etc. pages and drop in `<SignInForm>`, `<SignUpForm>`, etc. 100% your branding, no redirect.

You can mix both in the same app.

## Configuration safety

`<AuthProvider>` fails fast with `AuthError({ code: 'CONFIG_ERROR' })` instead of silently falling back to localhost when run off-localhost. Throws when:

1. No URL signals (off-localhost, no `apiUrl`, no `publishableKey`, no `firstParty: true`).
2. `publishableKey` without `apiUrl` off-localhost.
3. `firstParty: true` without an explicit `appName` off-localhost.
4. `webUrl` resolves to `localhost` off-localhost (usually means `NEXT_PUBLIC_AUTH_WEB_URL` env is missing).

Localhost (`localhost`, `*.localhost`, `127.0.0.1`, `0.0.0.0`, `::1`) keeps permissive defaults so zero-config dev still works.

## Roadmap

`@ezstart/auth-sdk` ships a complete MVP for email/password + OAuth Google + 2FA + sessions + RBAC + API keys management.

- Magic Link (passwordless email login) — shipped.
- Passkey / WebAuthn — planned.
- Additional OAuth providers (GitHub, Discord, Microsoft, Apple) — planned.
- GDPR data export — planned.

## Related

- [`@ezstart/api-sdk`](../api-sdk) — HTTP client primitives consumed internally.
- [`@ezstart/api-contracts`](../api-contracts) — wire-level request/response schemas.
- [`@ezstart/ui`](../ui) — UI primitives consumed by the `components/` entry.
- [`@ezstart/pay-sdk`](../pay-sdk) — Companion payments SDK with the same 3-layer architecture.
