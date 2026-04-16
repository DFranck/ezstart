# @ezstart/pay-sdk

Payment SDK with 3-layer architecture: agnostic core, React bindings, and pre-built UI components.

## Install

```bash
pnpm add @ezstart/pay-sdk
```

## Architecture

```
pay-sdk/src/
├── core/                    # Agnostic (zero React, zero @ezstart/*)
│   ├── pay-client.ts        # createPayClient({ apiUrl, appName })
│   ├── types.ts             # Payment, Plan, Promo, Subscription, etc.
│   ├── schemas.ts           # Zod schemas for validation/OpenAPI
│   ├── format-currency.ts   # formatCurrency(), getCurrencySymbol()
│   └── providers/           # Server-side provider adapters (Stripe, Console)
│
├── react/                   # React bindings (peer dep: react, zustand)
│   ├── pay-provider.tsx     # <PayProvider>, usePay(), usePayContext()
│   ├── store.ts             # Zustand payment state
│   └── hooks/               # useDonations, usePurchases, useSubscriptions, etc.
│
├── components/              # Pre-built UI (peer dep: @ezstart/ui)
│   ├── DonateButton.tsx, DonateModal.tsx, DonationCard.tsx, DonationWall.tsx
│   ├── PurchaseButton.tsx, PurchaseCard.tsx
│   ├── SubscribeButton.tsx, SubscriptionCard.tsx, SubscriptionPlanCard.tsx
│   ├── PayAdminDashboard.tsx, UserPaymentDashboard.tsx
│   └── ... (FeatureGate, PromoCodeInput, RefundButton, etc.)
│
├── ezstart-pay.ts           # Monorepo wrapper (auto-resolves API URL via @ezstart/config)
├── server.ts                # Server-safe exports (types + schemas + providers, no React)
└── index.ts                 # Main barrel (re-exports everything)
```

## Quickstart (monorepo)

```typescript
import { PayProvider, DonateModal, useDonations } from '@ezstart/pay-sdk'

// Wrap your app
<PayProvider appName="myapp">
  <DonateModal projectId="proj_123" />
</PayProvider>
```

## Quickstart (external / standalone)

```typescript
import { createPayClient } from '@ezstart/pay-sdk/core'

const client = createPayClient({
  apiUrl: 'https://api.example.com/api',
  appName: 'myapp',
})

const plans = await client.listPlans({ appName: 'myapp' })
```

## API

### Core (`@ezstart/pay-sdk/core`)

- `createPayClient(config)` / `PayClient` -- HTTP client for all EZPay endpoints
- Types: `Payment`, `Plan`, `Promo`, `Subscription`, `Donation`, `Purchase`, etc.
- Schemas: Zod schemas for validation (`createDonationSchema`, `createPlanSchema`, etc.)
- Utils: `formatCurrency(amount, currency?)`, `getCurrencySymbol(currency?)`
- Providers: `StripeProvider`, `ConsoleProvider`, `PaymentProviderRegistry`

### React (`@ezstart/pay-sdk` main entry)

- `<PayProvider>` -- context provider wrapping PayClient
- `usePay()` -- payment operations with loading/error state
- `useDonations()`, `usePurchases()`, `useSubscriptions()`, `usePaymentHistory()`
- `useSubscriptionStatus()` -- check active subscription + features

### Components (`@ezstart/pay-sdk/components`)

- `DonateButton`, `DonateModal`, `DonationCard`, `DonationWall`
- `PurchaseButton`, `PurchaseCard`
- `SubscribeButton`, `SubscriptionCard`, `SubscriptionPlanCard`
- `PayAdminDashboard`, `UserPaymentDashboard`
- `FeatureGate`, `PromoCodeInput`, `RefundButton`, `ConfirmActionDialog`
- `PaymentSuccessPage`, `PaymentHistory`, `ProductCard`, `ProductGrid`

### Server (`@ezstart/pay-sdk/server`)

- Types + Zod schemas (no React deps)
- `StripeProvider`, `ConsoleProvider`, `PaymentProviderRegistry`

## Migration

The main entry point (`@ezstart/pay-sdk`) re-exports everything from all 3 layers, so existing imports continue to work unchanged.

New sub-path imports are available:

- `@ezstart/pay-sdk/core` -- agnostic layer only
- `@ezstart/pay-sdk/components` -- UI components only
- `@ezstart/pay-sdk/server` -- server-safe exports (unchanged)
- `@ezstart/pay-sdk/providers` -- provider adapters (unchanged)

## Related

- [EZPay app](../../apps/ezpay) -- The payment service this SDK connects to
- Used by: ezpay, ezstart, fengshui, green-pulse
