# EZAuth

Centralized SSO authentication service for all @ezstart applications.

## Purpose

Provides a single sign-on system with OAuth support, user management, and admin controls shared across every app in the ecosystem.

## Tech Stack

- **Web:** Next.js, next-intl, @ezstart/ui
- **API:** Express via @ezstart/express-core, MongoDB, JWT (httpOnly cookies)
- **Deploy:** Vercel (web) + Railway (API)

## Architecture

```
ezauth/
├── web/          # Login/register UI (port 6111)
├── api/          # Auth API (port 6110)
│   └── routes/   # auth, oauth, admin
├── types/        # Shared types
└── config/       # Shared config
```

## Setup

```bash
cp api/.env.example api/.env.local
cp web/.env.example web/.env.local
pnpm dev ez   # or any app that depends on auth: pnpm dev bill, pnpm dev gp, etc.
```

## Key Features

- Email/password and OAuth authentication (Google, GitHub)
- JWT tokens via httpOnly cookies
- User admin panel (roles, bans, promo codes)
- Cross-app SSO via @ezstart/auth-sdk

## Related

- [@ezstart/auth-sdk](../../packages/auth-sdk) — Client SDK consumed by all apps
- [OAUTH-SETUP.md](./OAUTH-SETUP.md) — OAuth provider configuration
