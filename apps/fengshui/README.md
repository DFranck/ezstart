# FengShui

Feng Shui compass and analysis application with payment integration.

## Purpose

Provides Feng Shui directional analysis tools with premium features gated behind EZPay payments. Web-only app (no dedicated API).

## Tech Stack

- **Web:** Next.js, next-intl, @ezstart/ui, @ezstart/pay-sdk
- **Deploy:** Vercel

## Architecture

```
fengshui/
└── web/              # Next.js app (port 6151)
    └── src/
        ├── components/   # Compass, analysis UI
        ├── models/       # Feng Shui data models
        ├── services/     # Calculation logic
        └── hooks/        # Custom hooks
```

## Setup

```bash
cp web/.env.example web/.env.local
pnpm dev fs
```

## Key Features

- Feng Shui compass with directional analysis
- Premium features via EZPay integration
- Multi-language support (vi/en/fr)

## Related

- [@ezstart/pay-sdk](../../packages/pay-sdk) — Payment integration
- [@ezstart/auth-sdk](../../packages/auth-sdk) — SSO authentication
- [EZPAY_INTEGRATION.md](./EZPAY_INTEGRATION.md) — Payment setup details
