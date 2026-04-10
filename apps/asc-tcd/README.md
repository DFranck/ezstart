# ASC-TCD

Static association website. Web-only app (no dedicated API).

## Purpose

Public-facing website for the ASC-TCD association with informational content and member resources.

## Tech Stack

- **Web:** Next.js, next-intl, @ezstart/ui
- **Deploy:** Vercel

## Architecture

```
asc-tcd/
└── web/              # Next.js app (port 6141)
    └── src/
        ├── components/   # Page components
        ├── hooks/        # Custom hooks
        └── utils/        # Utilities
```

## Setup

```bash
cp web/.env.example web/.env.local
pnpm dev asc
```

## Related

- [@ezstart/auth-sdk](../../packages/auth-sdk) — SSO authentication
- [@ezstart/ui](../../packages/ui) — UI components
