# @ezstart/auth-sdk

React SDK for EZAuth centralized SSO authentication.

## Purpose

Provides authentication components (SignIn, SignUp, QuickSignUp), an AuthProvider context, middleware helpers, and server-side token verification so any app can integrate with EZAuth in minutes.

## Tech Stack

- React, Zustand (auth store), Zod schemas
- Server: JWT verification, httpOnly cookie handling

## Architecture

```
auth-sdk/src/
├── provider.tsx       # AuthProvider context
├── store.ts           # Zustand auth state
├── components/        # SignIn, SignUp, QuickSignUp, PromoCode UI
├── middleware.ts       # Next.js auth middleware
├── server.ts          # Server-side token verification
├── login-button.tsx   # Quick login button
└── require-auth.tsx   # Route protection wrapper
```

## Usage

```typescript
// Client — wrap app with provider
import { AuthProvider, useAuth } from '@ezstart/auth-sdk'

// Server — verify tokens
import { verifyToken } from '@ezstart/auth-sdk/server'

// Middleware — protect routes
import { authMiddleware } from '@ezstart/auth-sdk'
```

## Used By

All web apps (ezstart, ezbill, green-pulse, gacha-analyzer, fengshui, asc-tcd, ezauth).

## Related

- [EZAuth app](../../apps/ezauth) — The auth service this SDK connects to
- [HTTPONLY-MIGRATION.md](./HTTPONLY-MIGRATION.md) — Cookie migration guide
