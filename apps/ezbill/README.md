# EZBill

Invoice management application for freelancers and small businesses.

## Purpose

Streamlines invoice creation, client management, and billing workflows with AI-assisted features like quote generation and receipt tracking.

## Tech Stack

- **Web:** Next.js, next-intl, React Query, @ezstart/ui
- **API:** Express via @ezstart/express-core, MongoDB, @ezstart/ai-sdk
- **Deploy:** Vercel (web) + Railway (API)

## Architecture

```
ezbill/
├── web/          # Next.js frontend (port 6121)
├── api/          # Express API (port 6120)
│   └── routes/   # ai, clients, companies, invoices, quotes, receipts, payment-methods, users
├── types/        # Shared types
└── config/       # Shared config
```

## Setup

```bash
cp api/.env.example api/.env.local
cp web/.env.example web/.env.local
pnpm dev bill
```

## Key Features

- Invoice and quote CRUD with PDF generation
- Client and company management
- AI-powered invoice assistance
- Receipt tracking
- Payment method management

## Related

- [@ezstart/ai-sdk](../../packages/ai-sdk) — AI features
- [@ezstart/auth-sdk](../../packages/auth-sdk) — SSO authentication
- [@ezstart/pay-sdk](../../packages/pay-sdk) — Payment integration
