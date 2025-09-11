# @ezstart/auth-sdk

React SDK for EZAuth centralized authentication system.

## Overview

`@ezstart/auth-sdk` provides React hooks and utilities for integrating with the EZAuth centralized authentication service. It enables Single Sign-On (SSO) across all @ezstart applications.

## Installation

```bash
pnpm add @ezstart/auth-sdk
```

## Quick Start

### 1. Setup AuthClient

```tsx
import { AuthClient, AuthProvider } from '@ezstart/auth-sdk'

const authClient = new AuthClient({
  baseURL: 'http://localhost:8001/api/auth',
  appName: 'ez-billing', // your app name
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
  appName: 'ez-billing',
  redirectUri: 'http://localhost:3000/auth/callback'
})
```

### Production

```tsx
const authClient = new AuthClient({
  baseURL: 'https://auth.ezstart.com/api/auth',
  appName: 'ez-billing',
  redirectUri: 'https://billing.ezstart.com/auth/callback'
})
```

## Integration with @ezstart/next-core

When using `@ezstart/next-core`, authentication is automatically configured:

```tsx
import { SimpleWebProviders } from '@ezstart/next-core/providers'

// Auth is automatically enabled
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SimpleWebProviders appName="my-app">
      {children}
    </SimpleWebProviders>
  )
}
```

## Applications Using This SDK

- ✅ **ez-billing/web** - Billing management
- ✅ **tower-defense/web** - Tower Defense game  
- ✅ **fengshui/web** - Feng Shui application
- ✅ All apps via `@ezstart/next-core`

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

- [`@ezstart/next-core`](../next-core/README.md) - Web application infrastructure
- [`@ezstart/ui`](../ui/README.md) - UI components library
- [EZAuth API](../../apps/ezauth/api/README.md) - Authentication service
- [EZAuth Web](../../apps/ezauth/web/README.md) - Authentication interface