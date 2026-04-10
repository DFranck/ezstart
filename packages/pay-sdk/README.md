# @ezstart/pay-sdk

React SDK for EZPay universal payment system.

## Purpose

Provides payment components (DonateModal, PurchaseButton, SubscriptionPlan), a PayProvider context, and server-side payment verification so any app can integrate Stripe payments via EZPay.

## Tech Stack

- React, Zustand (pay store), Zod schemas
- Server: Stripe payment verification

## Architecture

```
pay-sdk/src/
├── provider.tsx    # PayProvider context
├── providers/      # Payment provider adapters
├── store.ts        # Zustand payment state
├── components/     # DonateModal, PurchaseButton, SubscriptionPlan, AdminDashboard
├── hooks/          # usePay, useSubscription
├── server.ts       # Server-side verification
└── utils/          # Price formatting, currency helpers
```

## Usage

```typescript
// Client — wrap app with provider
import { PayProvider, DonateModal, usePay } from '@ezstart/pay-sdk'

// Server — verify payments
import { verifyPayment } from '@ezstart/pay-sdk/server'
```

## Used By

- apps/ezpay (web + API)
- apps/fengshui (web) — premium features

## Related

- [EZPay app](../../apps/ezpay) — The payment service this SDK connects to
