# @ezstart/auth-sdk

React SDK for EZAuth centralized authentication system.

## Overview

`@ezstart/auth-sdk` provides React hooks and utilities for integrating with the EZAuth centralized authentication service. It enables Single Sign-On (SSO) across all @ezstart applications.

## Installation

```bash
pnpm add @ezstart/auth-sdk
```

## Features

- ✅ **Centralized SSO** - Single Sign-On across all @ezstart apps
- ✅ **httpOnly Cookies** - Secure authentication (XSS protection)
- ✅ **OAuth2 Flow** - Industry-standard authorization code flow
- ✅ **Protected Routes** - Next.js middleware for auth-required pages
- ✅ **TypeScript** - Full type safety
- ✅ **React Hooks** - Simple `useAuth()` hook
- ✅ **Auto-Refresh** - Automatic token verification and refresh

## Quick Start

### 1. Setup AuthClient

```tsx
import { AuthClient, AuthProvider } from '@ezstart/auth-sdk'

const authClient = new AuthClient({
  baseURL: 'http://localhost:8001/api/auth',
  appName: 'ezbill', // your app name
  redirectUri: 'http://localhost:3000/auth/callback'
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider client={authClient}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 2. Create Auth Callback Page

```tsx
// app/auth/callback/page.tsx
'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const { handleCallback } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      handleCallback(code).then(() => {
        router.push('/dashboard')
      }).catch((error) => {
        console.error('Auth callback failed:', error)
        router.push('/login')
      })
    }
  }, [handleCallback, router, searchParams])

  return <div>Processing authentication...</div>
}
```

### 3. Use Authentication Hooks

```tsx
import { useAuth, useUser } from '@ezstart/auth-sdk'

export default function Dashboard() {
  const { isAuthenticated, login, logout } = useAuth()
  const { user, isLoading } = useUser()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={login}>Login</button>
      </div>
    )
  }

  return (
    <div>
      <h1>Welcome {user?.email}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## Protected Routes (Next.js Middleware)

### Overview

The SDK provides a **centralized authentication middleware** that protects routes without duplicating code across apps.

**Features:**
- ✅ Checks httpOnly cookie for auth
- ✅ Redirects to EZAuth login with return URL
- ✅ Works with next-intl i18n
- ✅ Preserves original destination after login
- ✅ Zero boilerplate per app

### Setup

**1. Create middleware.ts in your app:**

```ts
// apps/ezbill/web/src/middleware.ts
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create i18n middleware
const intlMiddleware = createIntlMiddleware(routing)

// Create auth middleware with protected paths
export default createAuthMiddleware({
  appName: 'ezbill',
  protectedPaths: ['/dashboard', '/clients', '/invoices', '/settings'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware, // Optional: Apply i18n after auth check
})

// IMPORTANT: Next.js requires a literal object for static analysis
export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
```

**2. Configure AuthProvider with httpOnly cookies:**

```tsx
// apps/ezbill/web/src/app/[locale]/layout.tsx
import { AuthProvider } from '@ezstart/auth-sdk'

export default function RootLayout({ children }) {
  return (
    <AuthProvider appName="ezbill" useHttpOnlyCookies={true}>
      {children}
    </AuthProvider>
  )
}
```

### Configuration Options

```ts
interface AuthMiddlewareConfig {
  appName: string                         // Required: 'ezbill', 'ezpay', etc.
  protectedPaths: string[]                // Required: ['/dashboard', '/settings']
  locales?: readonly string[]             // Optional: ['en', 'fr'] (default)
  defaultLocale?: string                  // Optional: 'en' (default)
  cookieName?: string                     // Optional: 'ezauth_session' (default)
  intlMiddleware?: (req) => Response      // Optional: next-intl middleware
}
```

### How It Works

1. **User visits protected path** (e.g., `/dashboard`)
2. **Middleware checks cookie** (`ezauth_session`)
3. **If not authenticated:**
   - Redirect to `https://ezauth.ezstart.xyz/login`
   - Pass `app=ezbill`, `redirect_uri=/auth/callback`, `return_to=/dashboard`
4. **After EZAuth login:**
   - User redirected to `/auth/callback?code=...`
   - Token exchanged, cookie set
   - User redirected back to `/dashboard` (original destination)

### Path Matching

```ts
protectedPaths: ['/dashboard', '/clients']

// Matches:
✅ /dashboard
✅ /dashboard/stats
✅ /clients
✅ /clients/123
✅ /en/dashboard (with locales)
✅ /fr/clients/456 (with locales)

// Does NOT match:
❌ /
❌ /login
❌ /public
```

### Examples

**Minimal (no i18n):**

```ts
export default createAuthMiddleware({
  appName: 'myapp',
  protectedPaths: ['/dashboard'],
})
```

**With i18n:**

```ts
const intlMiddleware = createIntlMiddleware(routing)

export default createAuthMiddleware({
  appName: 'ezbill',
  protectedPaths: ['/dashboard', '/settings'],
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  intlMiddleware,
})
```

**Custom cookie name:**

```ts
export default createAuthMiddleware({
  appName: 'ezpay',
  protectedPaths: ['/payments'],
  cookieName: 'custom_auth_session',
})
```

## API Reference

### AuthClient

#### Constructor Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseURL` | `string` | ✅ | EZAuth API base URL |
| `appName` | `string` | ✅ | Application identifier |
| `redirectUri` | `string` | ✅ | OAuth callback URL |

#### Methods

- `login()` - Redirect to EZAuth login page
- `logout()` - Clear session and logout
- `handleCallback(code: string)` - Handle OAuth callback
- `getToken()` - Get current JWT token
- `getUser()` - Get current user info

### useAuth Hook

```tsx
const {
  isAuthenticated,  // boolean - Auth status
  login,           // () => void - Redirect to login
  logout,          // () => void - Logout user
  handleCallback   // (code: string) => Promise<void>
} = useAuth()
```

### useUser Hook

```tsx
const {
  user,        // User | null - Current user
  isLoading    // boolean - Loading state
} = useUser()
```

### User Type

```tsx
interface User {
  id: string
  email: string
  createdAt: string
  // Additional fields based on your EZAuth setup
}
```

## OAuth2 Flow

1. **Login Redirect** - User clicks login → Redirected to EZAuth
2. **Authentication** - User authenticates on EZAuth service  
3. **Authorization Code** - EZAuth redirects back with code
4. **Token Exchange** - SDK exchanges code for JWT token
5. **Session Storage** - Token stored securely for API calls

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your App      │    │   EZAuth API    │    │   EZAuth Web    │
│                 │    │   (port 8001)   │    │   (port 8080)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ @ezstart/       │    │ OAuth2 Endpoints│    │ Login Interface │
│ auth-sdk        │◄──►│ Token Management│◄──►│ User Management │
│                 │    │ User Validation │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Configuration Examples

### Development

```tsx
const authClient = new AuthClient({
  baseURL: 'http://localhost:8001/api/auth',
  appName: 'ezbill',
  redirectUri: 'http://localhost:3000/auth/callback'
})
```

### Production

```tsx
const authClient = new AuthClient({
  baseURL: 'https://auth.ezstart.com/api/auth',
  appName: 'ezbill',
  redirectUri: 'https://billing.ezstart.com/auth/callback'
})
```

## Standard Integration with Theme Provider

Typically used with `@ezstart/next-theme` for complete setup:

```tsx
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider appName="my-app">
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
```

## Applications Using This SDK

- ✅ **ezstart/web** - Main application (with i18n)
- ✅ **ezauth/web** - Auth service UI
- ✅ **ezbill/web** - Billing management
- ✅ **tower-defense/web** - Tower Defense game
- ✅ **fengshui/web** - Feng Shui application
- ✅ **asc-tcd/web** - ASC-TCD application

## Development

```bash
# Build package
pnpm build

# Watch mode  
pnpm dev

# Type check
pnpm typecheck
```

## Related Packages

- [`@ezstart/next-theme`](../next-theme/README.md) - Theme provider for dark/light mode
- [`@ezstart/ui`](../ui/README.md) - UI components library
- [EZAuth API](../../apps/ezauth/api/README.md) - Authentication service
- [EZAuth Web](../../apps/ezauth/web/README.md) - Authentication interface