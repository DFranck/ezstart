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
│   ├── AccountModal.tsx
│   ├── TwoFactorPrompt.tsx
│   ├── TwoFactorSettings.tsx
│   ├── VerifyEmailFlow.tsx
│   ├── AuthAdminDashboard.tsx
│   └── index.ts
│
├── ezstart-auth.tsx      # Monorepo wrapper (pre-wires @ezstart/config URLs)
├── middleware.ts          # Next.js auth middleware
├── server.ts             # Server-side schemas + client
└── index.ts              # Main barrel: re-exports everything
```

## Quickstart (monorepo)

```tsx
import { AuthProvider, useAuth } from '@ezstart/auth-sdk'

// Wrap app
;<AuthProvider appName="myapp" authMode="httpOnly">
  <App />
</AuthProvider>

// Use in components
const { user, login, logout, isAuthenticated } = useAuth()
```

## Quickstart (standalone React)

```tsx
import { createCoreAuthClient } from '@ezstart/auth-sdk/core'
import { AuthProvider, useAuth } from '@ezstart/auth-sdk/react'

const client = createCoreAuthClient({
  apiUrl: 'https://auth.example.com/api/auth',
  appName: 'myapp',
})

<AuthProvider client={client} appName="myapp">
  <App />
</AuthProvider>
```

## Quickstart (standalone any JS)

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
