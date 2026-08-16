# EZPay

Universal payment service with Stripe integration for the @ezstart ecosystem.

## Purpose

Handles donations, one-time purchases, and subscriptions via Stripe. Any app can integrate payments through @ezstart/pay-sdk.

## Tech Stack

- **Web:** Next.js, next-intl, @ezstart/ui
- **API:** Express via @ezstart/api-core, MongoDB, Stripe SDK
- **Deploy:** Vercel (web) + Railway (API)

## Architecture

```
ezpay/
├── web/          # Payment UI and admin (port 6131)
├── api/          # Payment API (port 6130)
│   └── routes/   # donations, payments, plans, promos, purchases, subscriptions, webhooks
├── types/        # Shared types
└── config/       # Shared config
```

## Setup

```bash
cp api/.env.example api/.env.local    # Requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
cp web/.env.example web/.env.local
pnpm dev pay
```

## Key Features

- Stripe Checkout for donations, purchases, and subscriptions
- Plan and promo code management
- Webhook processing for payment events
- Admin dashboard for payment tracking

## Related

- [@ezstart/pay-sdk](../../packages/pay-sdk) — Client SDK for integrating payments
- [FengShui](../fengshui) — Example app using EZPay
- [ROADMAP.md](./ROADMAP.md) — Feature roadmap and gap analysis vs Stripe/Lemon/Paddle
