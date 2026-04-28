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
│   ├── AuthAdminDashboard.tsx  # all-in-one console (Tabs orchestrator)
│   ├── admin/
│   │   ├── _internal/          # OverviewSection, UsersSection, ApplicationsSection, SettingsSection
│   │   ├── AdminUsersTable.tsx
│   │   ├── AdminStatsCards.tsx
│   │   ├── AdminApplicationsTable.tsx
│   │   ├── EditRolesModal.tsx
│   │   ├── EditApplicationModal.tsx
│   │   └── MaintenanceBanner.tsx  # public, used outside admin
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
├── server/                # Server-only barrel: getServerAuth, hasFeature,
│                          # schemas + types — zero React, zero browser
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

## Quickstart — SSR auth (Next.js App Router)

Eliminate the **`<LoginButton>` flash** that occurs on the first paint when
running in `httpOnly` cookie mode. The session cookie isn't readable from
JavaScript, so the client `<AuthProvider>` defaults to
`isAuthenticated: false` until its async `/me` call resolves — for ~50–200ms
the chrome shows the wrong UI (LoginButton instead of UserMenu). The fix is
the **Clerk-style pattern**: resolve the user server-side and seed the
provider synchronously via `initialUser`.

```tsx
// app/[locale]/layout.tsx (Server Component)
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { headers } from 'next/headers'
import { Providers } from '@/components/providers'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
    cookieHeader: headersList.get('cookie'),
  })

  return (
    <html>
      <body>
        <Providers initialUser={initialUser}>{children}</Providers>
      </body>
    </html>
  )
}
```

```tsx
// components/providers.tsx
'use client'
import { AuthProvider, type AuthUser } from '@ezstart/auth-sdk'

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser?: AuthUser | null
}) {
  return (
    <AuthProvider
      appName="myapp"
      authMode="httpOnly"
      apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL!}
      initialUser={initialUser}
    >
      {children}
    </AuthProvider>
  )
}
```

That's it — `<UserMenu>`, `<LoginButton>`, `<RequireAuth>`, `<SignedIn>`,
`<SignedOut>` and any `useAuth()` consumer all render the right state on
the very first frame. No flash on initial load, no flash on cross-group
navigations (e.g. `/dashboard` → `/`) when the chrome remounts.

`getServerAuth()` is server-only — import from `@ezstart/auth-sdk/server`.
It returns `null` for anonymous requests (no cookie, expired session,
network error), in which case the legacy client-side bootstrap takes over
seamlessly. Safe to call from any Server Component or Route Handler.

## Choosing your auth UX — Hosted vs Embedded

EZAuth supports **two patterns** for authentication UX. Pick the one that fits your product:

### Pattern A — Hosted login (redirect to ezauth)

User clicks "Sign in" → redirected to a hosted EZAuth login page → after auth, redirected back to your app with a session.

```tsx
// 1. In your app shell
import { LoginButton, AuthProvider } from '@ezstart/auth-sdk'
;<AuthProvider config={{ apiUrl: 'https://api.example.com', appName: 'myapp' }}>
  <LoginButton /> {/* That's it — handles redirect, callback, session */}
</AuthProvider>

// 2. Add the callback page
// src/app/auth/callback/page.tsx
import { AuthCallbackPage } from '@ezstart/auth-sdk/components'
export default () => <AuthCallbackPage />
```

✅ **Pros**: zero auth UI code, central security, cross-app SSO trivial, white-label theme automatic.
⚠️ **Cons**: redirect can disrupt UX, "powered by EZAuth" visible.

**Best for**: MVP / startup pressed, B2B multi-tenant, Enterprise SaaS, marketplaces with cross-app SSO.

---

### Pattern B — Embedded forms (in your app)

User stays on YOUR domain. You build your own `/login`, `/register`, etc. pages and drop in EZAuth form components.

```tsx
// src/app/login/page.tsx
'use client'
import { SignInForm } from '@ezstart/auth-sdk/components'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  return (
    <SignInForm
      appName="myapp"
      onSuccess={() => router.push('/dashboard')}
      texts={{ submit: 'Continue' /* ...customize */ }}
    />
  )
}

// Similarly for /register, /forgot-password, /reset-password, /verify-email
```

✅ **Pros**: 100% your branding, seamless UX (no redirect), better mobile/PWA, control everything.
⚠️ **Cons**: more pages to build (5+ pages), security spread across your domains, you maintain UI updates.

**Best for**: B2C consumer SaaS, indie products, mobile-first apps, brand-conscious products.

---

### Pattern C — Both (dev choice)

You can mix: hosted login button on landing + embedded forms in dashboard, or vice versa. EZAuth supports both natively.

### Choose by use case

| Your product                    | Recommended pattern         |
| ------------------------------- | --------------------------- |
| MVP / pressed startup           | A (Hosted) — zero work      |
| B2C consumer SaaS (Notion-like) | B (Embedded) — branding     |
| B2B multi-tenant                | A (Hosted) — cross-app SSO  |
| Marketplace                     | A + B mix                   |
| Mobile-first / PWA              | B (Embedded) — no redirect  |
| Enterprise SaaS                 | A (Hosted) — security audit |
| Indie product                   | B (Embedded) — conversion   |

### Components matrix

| Component                | Pattern | Drop-in location              |
| ------------------------ | ------- | ----------------------------- |
| `<LoginButton />`        | A       | App header / CTA              |
| `<RegisterButton />`     | A       | App header / CTA              |
| `<AuthCallbackPage />`   | A       | `/auth/callback` route        |
| `<SignInForm />`         | B       | Your `/login` page            |
| `<SignUpForm />`         | B       | Your `/register` page         |
| `<ForgotPasswordForm />` | B       | Your `/forgot-password` page  |
| `<ResetPasswordForm />`  | B       | Your `/reset-password` page   |
| `<VerifyEmailFlow />`    | B       | Your `/verify-email` page     |
| `<TwoFactorPrompt />`    | B       | Inside SignInForm flow (auto) |
| `<UserMenu />`           | A or B  | Header (works with both)      |
| `<EZAuthDashboard />`    | A or B  | Your `/dashboard` route       |

All form components accept:

- `texts?: Partial<XTexts>` — i18n override (English defaults)
- `onSuccess?: () => void` — callback
- `onError?: (err: Error) => void` — callback
- Standard `className` for style overrides

## API

### Core (`@ezstart/auth-sdk/core`)

- `createCoreAuthClient(config)` — Framework-agnostic auth client using raw `fetch()`
- `CoreAuthClient` — Class with login, logout, refresh, token exchange, profile update
- `AuthError` — Error class with HTTP status code
- `TokenManager` — Token persistence abstraction
- `createLocalStorage()` / `createMemoryStorage()` — Built-in storage backends

### React (`@ezstart/auth-sdk/react`)

- `<AuthProvider>` — Context provider with auto-refresh, **owns the per-tree
  Zustand store** (Clerk-style SSR setup — see _SSR + initialUser_ below)
- `useAuth()` — Main hook (user, login, logout, isAuthenticated)
- `useAuthStore()` — Bound hook reading the per-Provider store via Context.
  Throws when called outside `<AuthProvider>`. Accepts an optional selector.
- `useAuthStoreApi()` — Returns the store instance (for imperative
  `getState()`/`setState()`/`subscribe()` access from inside the React tree)
- `useAuthStoreGetSnapshot()` — Returns a stable `() => state` reader for
  closures passed to non-React APIs (e.g. `getToken={() => snap().accessToken}`)
- `createAuthStore(options)` — Low-level factory exposed for tests / advanced
  setups. **Always** wrap usage in `useState(() => createAuthStore(...))` —
  module-level instantiation breaks Next.js SSR.
- `<RequireAuth>` — Route protection wrapper (auto-redirects to login by default — see below)
- `<SignedIn>` / `<SignedOut>` — Conditional rendering for partial UI (no redirect)
- `<AccessDenied>` — Fallback component

#### SSR + `initialUser` (no LoginButton flash)

The Provider **owns** the Zustand store and creates it via
`useState(() => createAuthStore({ initialUser }))`. This guarantees one
store per React tree AND that `initialUser` is part of the very first
state snapshot React observes. Result: subscribers reading `useAuth()`
see the SSR-correct `isAuthenticated` value on the FIRST render — no
flash from `<LoginButton>` to `<UserMenu>` while the async `/me` resolves.

```tsx
// app/[locale]/layout.tsx — Server Component
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { Providers } from '@/components/providers'

export default async function LocaleLayout({ children }) {
  const initialUser = await getServerAuth()
  return <Providers initialUser={initialUser}>{children}</Providers>
}

// components/providers.tsx — Client Component
;('use client')
import { AuthProvider, type AuthUser } from '@ezstart/auth-sdk'

export function Providers({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null
  children: React.ReactNode
}) {
  return (
    <AuthProvider
      appName="myapp"
      publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}
      authMode="httpOnly"
      initialUser={initialUser}
    >
      {children}
    </AuthProvider>
  )
}
```

> **Breaking change vs ≤ 1.0.0** — `useAuthStore` is no longer a
> module-level Zustand singleton. `useAuthStore.getState()` /
> `useAuthStore.setState()` no longer exist. Use `useAuthStoreApi()` (or
> `useAuthStoreGetSnapshot()` for closures) inside the React tree.
> `configureAuthStorage()` is deprecated — pass `storageKey` to
> `<AuthProvider>` instead.

#### `<RequireAuth>` unauthenticated behavior

When the user is not authenticated, `<RequireAuth>` picks ONE behavior in
this priority order:

1. If `redirectTo` is set → `window.location.href = redirectTo`.
2. If `fallbackComponent` is set (even as `null`) → renders it.
3. **Default** → auto-redirects to `{locale}{loginPath}?redirect_uri={current path}`
   so the user is brought back here after sign-in.

```tsx
// 1. Default — auto-redirect to /{locale}/login?redirect_uri=...
<RequireAuth>
  <Dashboard />
</RequireAuth>

// 2. Custom login path (still auto-builds the locale prefix and redirect_uri)
<RequireAuth loginPath="/auth/signin">
  <Dashboard />
</RequireAuth>

// 3. Custom fallback UI (no redirect)
<RequireAuth fallbackComponent={<AccessDenied />}>
  <Dashboard />
</RequireAuth>

// 4. Silent opt-out (no redirect, render nothing) — use for conditional
//    UI elements like an install prompt that should only appear when
//    signed in. Prefer `<SignedIn>` for this case when possible.
<RequireAuth fallbackComponent={null}>
  <PWAInstallPrompt />
</RequireAuth>

// 5. Custom redirect destination (full URL or path)
<RequireAuth redirectTo="https://auth.example.com/sso">
  <Dashboard />
</RequireAuth>
```

`loginPath` defaults to `'/login'`. The locale prefix is detected from the
current `window.location.pathname` (matches `^/[a-z]{2,3}/`) and is omitted
when no locale segment is present.

### Components (`@ezstart/auth-sdk/components`)

**Auth flows**

- `<SignInForm>` — Login form with OAuth and 2FA support
- `<SignUpForm>` — Registration form with password strength and promo codes
- `<QuickSignUpForm>` — Passwordless signup (username + email only)
- `<ForgotPasswordForm>` / `<ResetPasswordForm>` — Password recovery
- `<TwoFactorPrompt>` / `<TwoFactorSettings>` — 2FA UI
- `<VerifyEmailFlow>` / `<EmailVerificationStatus>` — Email verification flow + inline status
- `<OAuthButtons>` / `<OAuthProvidersSection>` — OAuth sign-in buttons + connected providers manager
- `<LoginButton>` / `<RegisterButton>` — Header CTAs with theme propagation
- `<AuthCallbackPage>` — OAuth/SSO callback handler page

**User account**

- `<AccountModal>` — Clerk-like account management modal
- `<UserMenu>` — Dropdown user menu with avatar
- `<UserAvatar>` — Avatar with initials fallback
- `<UserSettings>` — Settings display page
- `<UserDashboard>` — Compound user dashboard
- `<SessionsManager>` — Active sessions list with revoke
- `<DeleteAccountSection>` — Soft-delete with confirmation + grace period
- `<AuditLogSection>` — User activity log

**Admin**

- `<AuthAdminDashboard>` — All-in-one admin console with internal tabs
  (Overview / Users / Applications / Settings). Auto-scoped server-side via
  JWT (`req.derivedScope`): superadmin sees all tenants, app admin sees
  owned Applications, regular user sees own account. Drop-in for both
  EZAuth's own `/admin` page and the EZStart hub's federated admin.
- `<MaintenanceBanner>` — Maintenance window status banner (public, used
  outside the admin console in app shells)

**Developer (API keys)**

- `<DeveloperPortal>` — Full developer dashboard (keys CRUD + usage)
- `<ApiKeysTable>` — Standalone keys table
- `<CreateKeyModal>` / `<KeyCreatedModal>` — Key creation flow
- `<UsageDetailsModal>` / `<UsageBadge>` — Per-key usage drill-down

**Applications (P6 — multi-tenant)**

- `<ApplicationsList>` / `<ApplicationCard>` — Owner's Applications list
- `<CreateApplicationModal>` — New Application wizard
- `<ApplicationDetailView>` — Application settings + theme + keys

**Feedback / utility**

- `<DevModeBanner>` — Dev environment indicator
- `<AuthErrorBanner>` — Inline destructive feedback
- `<RequireAuthLoader>` — Styled wrapper around `<RequireAuth>`

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
platform hub (Tier 3 — e.g. `apps/ezstart/web/admin`) can embed the full
admin console cross-origin while forwarding a platform-wide superadmin
JWT instead of the local session token.

```tsx
import { AuthAdminDashboard } from '@ezstart/auth-sdk/components'
;<AuthAdminDashboard apiUrl="https://auth.example.com" authToken={() => mySuperadminJwt} />
```

When `apiUrl` and `authToken` are omitted, the component falls back to the
surrounding `<AuthProvider>` configuration (single-app standalone mode).

The dashboard is **auto-scoped server-side** via the JWT — no `appName` /
`scope` props are required. The backend derives scope from `req.user`:

- `globalRoles: ['superadmin']` -> all tenants
- App-level `admin` role -> owned Applications only
- Regular user -> own account

Localize labels via the `texts` prop (per-tab nested objects):

```tsx
<AuthAdminDashboard
  texts={{
    tabOverview: "Vue d'ensemble",
    tabUsers: 'Utilisateurs',
    overview: { title: 'Statistiques plateforme' },
    users: { searchPlaceholder: 'Rechercher...' },
    applications: { createApplication: 'Nouvelle App' },
    settings: {
      featureFlags: { title: 'Drapeaux de fonctionnalite' },
      maintenance: { title: 'Mode maintenance' },
    },
  }}
/>
```

### Migration from pre-Wave 1B (Apr 2026)

The previous shape exposed five separate components — `<AuthAdminDashboard>`
(users only), `<AdminApplicationsDashboard>`, `<AdminAnalyticsSection>`,
`<AdminFeatureFlagsSection>`, `<AdminMaintenanceModeSection>`. They are
**replaced** by the single `<AuthAdminDashboard>` console with internal tabs.
Consumer apps (ezauth/web, ezstart/web) must drop the props
`appName` / `scope` / `applicationId` and assemble the per-tab text overrides
into a single `texts` object as shown above. `<MaintenanceBanner>` remains
a separate top-level export for use in app shells.

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

## Roadmap & Known Limitations

`@ezstart/auth-sdk` ships a complete MVP for email/password + OAuth Google + 2FA + sessions + RBAC + API keys management. It covers 80% of standard SaaS authentication needs out-of-the-box.

The following features are on the roadmap for future releases:

### Authentication methods

- 🔄 **Magic Link** (passwordless email login)
- 🔄 **Passkey / WebAuthn** (biometric / hardware key auth)
- 🔄 **Additional OAuth providers**: GitHub, Discord, Microsoft, Apple

### User account management

- 🔄 **Account deletion flow** with confirmation + grace period
- 🔄 **Email change flow** with new email verification
- 🔄 **GDPR data export** (download user data as JSON/ZIP)

### Compliance

- 🔄 **Consent banner / Cookie management** (GDPR/CCPA compliance widget)

If you need any of these features now, you can:

- Implement them on top of the SDK using the exposed `core/` client primitives
- Open an issue or PR on [GitHub](https://github.com/DFranck/ezstart/issues)
- Use the `auth-sdk/core` package standalone if you need a non-React integration

The SDK currently powers EZAuth.dev as its reference implementation. We dogfood every feature before it ships.

## Related

- [EZAuth API](../../apps/ezauth/api) — Reference auth service this SDK is built against
- [EZAuth web](../../apps/ezauth/web) — Reference dashboard / hosted login pages
- [@ezstart/pay-sdk](../pay-sdk) — Companion payments SDK (same 3-layer architecture)
- [@ezstart/api-contracts](../api-contracts) — Wire-level request/response schemas
- [@ezstart/api-sdk](../api-sdk) — HTTP client primitives (`apiCall`, `apiQuery`)
- [@ezstart/ui](../ui) — UI primitives consumed by the `components/` layer

## Used By

All web apps (ezstart, ezbill, green-pulse, gacha-analyzer, fengshui, asc-tcd, ezauth).
