# EZStart

Central hub and admin portal for the @ezstart ecosystem.

## Purpose

Provides a unified dashboard for monitoring all services, managing AI conversations, viewing deployment status, scheduling tasks, and tracking activity across the monorepo.

## Tech Stack

- **Web:** Next.js, next-intl, React Query, @ezstart/ui
- **API:** Express via @ezstart/express-core, MongoDB
- **Deploy:** Vercel (web) + Railway (API)

## Architecture

```
ezstart/
├── web/          # Next.js admin dashboard (port 6101)
├── api/          # Express API (port 6100)
│   └── routes/   # ai, audit, deployment, health, metrics, projects, scheduler, qr-codes
├── types/        # Shared types
└── config/       # Shared config
```

## Setup

```bash
cp api/.env.example api/.env.local
cp web/.env.example web/.env.local
pnpm dev ez
```

## Key Features

- Service health monitoring and performance metrics
- AI conversation management (centralized via @ezstart/ai-sdk)
- Deployment audit and history
- QR code generation
- Task scheduler with cron triggers

## Related

- [@ezstart/ai-sdk](../../packages/ai-sdk) — AI provider abstraction
- [@ezstart/express-core](../../packages/express-core) — API infrastructure
- [@ezstart/config](../../packages/config) — URLs and ports
