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
├── server.ts                # Server-safe exports (types + schemas + providers, no React)
└── index.ts                 # Main barrel (re-exports everything)
```

## Quickstart — React with components (full UI)

Drop-in pre-built UI. Requires `@ezstart/ui` as peer dep.

```tsx
import { PayProvider, DonateModal, PricingPage } from '@ezstart/pay-sdk'
;<PayProvider apiUrl="https://api.example.com/api" appName="myapp">
  <DonateModal projectId="proj_123" />
  <PricingPage />
</PayProvider>
```

## Quickstart — React hooks only (no UI)

Build your own UI. Only `react` + `zustand` as peer deps.

```tsx
import { PayProvider, useDonations, useSubscriptions } from '@ezstart/pay-sdk/react'
import { createPayClient } from '@ezstart/pay-sdk/core'

const client = createPayClient({
  apiUrl: 'https://api.example.com/api',
  appName: 'myapp',
})

<PayProvider client={client} appName="myapp">
  <App />
</PayProvider>
```

## Quickstart — Core only (any JS, no React)

Use from Vue, Svelte, vanilla JS, Node, React Native. Zero framework deps.

```ts
import { createPayClient } from '@ezstart/pay-sdk/core'

const client = createPayClient({
  apiUrl: 'https://api.example.com/api',
  appName: 'myapp',
})

const plans = await client.listPlans({ appName: 'myapp' })
const donation = await client.createDonation({ projectId: 'proj_123', amount: 500 })
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
- `PayDeveloperPortal`, `CreatePayKeyModal` — API keys CRUD (create / rotate / revoke) scoped to an Application

### Developer portal (API keys)

Drop-in UI for the `ez_pk_*` / `ez_sk_*` API key lifecycle, scoped to an ezauth Application.

```tsx
import { PayDeveloperPortal } from '@ezstart/pay-sdk/components'
;<PayDeveloperPortal
  applicationId="app_123"
  locale="en"
  showSuperadminScope={currentUser.role === 'superadmin'}
/>
```

Under the hood it uses the following hooks — usable standalone if you roll your own UI:

- `usePayKeys({ applicationId?, enabled? })` — list keys for the Application
- `useCreatePayKey({ onSuccess?, onError? })` — create a new key (the raw key is returned exactly once)
- `useRevokePayKey({ onSuccess?, onError? })` — revoke an active key
- `useRotatePayKey({ onSuccess?, onError? })` — atomically revoke + recreate, returns the fresh raw key
- `usePayKeyUsage(keyId, { enabled? })` — per-key usage snapshot (current month + daily breakdown + quota)

All user-facing strings are driven by the `texts` prop (English defaults provided). Zero i18n library dependency.

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
