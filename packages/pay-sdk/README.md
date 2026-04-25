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
- `useDonations()`, `usePurchases()`, `useSubscriptions()`, `usePaymentHistory({ userId?, applicationId? })`
- `useSubscriptionStatus({ userId, applicationId? })` -- check active subscription + features

`usePaymentHistory` and `BillingDashboard` are **RBAC-scoped by `applicationId`**. When
the enclosing `<PayProvider publishableKey>` resolves an application context,
the scoping is automatic — each app's BillingDashboard only shows its own
payments, even if the user has paid on other ezstart apps. Pass
`applicationId: ''` to opt out (e.g. a superadmin cross-app view).

#### Resolution lifecycle — `applicationResolutionStatus`

`useApplicationContext()` exposes an `applicationResolutionStatus` field that
tracks the publishableKey resolution lifecycle:

- `idle` — provider mounted without `publishableKey` and without `applicationId` (legacy `appName`-only, cross-app possible, discouraged)
- `pending` — publishableKey resolve in flight
- `ready` — applicationId is known (explicit prop or successful resolve)
- `failed` — publishableKey resolve threw (network / auth / 5xx)

`usePaymentHistory` and `BillingDashboard` check this status and **refuse to
issue scoped queries** when `status === 'failed'` (fail-closed, not fail-open)
— this prevents cross-app payment leaks on transient resolve errors. A failed
state surfaces as a graceful `<PayNotConfiguredCard />` (see below); refresh
the page or create a new key to retry.

#### Graceful degradation — `<PayNotConfiguredCard />`

When the SDK is unconfigured (missing `applicationId` / `publishableKey`), or
when a downstream fetch fails with a network / 401 / 403 error, pay-sdk
components (`<DonationWall>`, `<DonationCard>`, `<BillingDashboard>`,
`<PricingPage>`) now render a graceful `<PayNotConfiguredCard />` with a
"Get your key" CTA linking to the ezpay developer portal — instead of a
scary red "Failed to fetch" banner.

The card picks one of four reasons automatically:

- `missing-key` — no publishable key / applicationId provided
- `resolve-failed` — `/keys/config` threw (invalid key / rate limit)
- `fetch-failed` — a downstream fetch threw a network error
- `invalid-key` — a downstream call returned 401 / 403

Each reason ships with English defaults (title, description, CTA). Consumers
override via the component's `notConfiguredTexts` prop.

To build the CTA link, `<PayProvider>` accepts a `payWebUrl` prop pointing
to the ezpay web origin (e.g. `https://ezpay.ezstart.xyz`). When omitted, it
auto-detects `http://localhost:6131` for localhost dev; in production the
consumer MUST pass it explicitly — otherwise the fallback card renders the
copy without the CTA button.

```tsx
<PayProvider
  applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID}
  config={{ apiUrl: process.env.NEXT_PUBLIC_EZPAY_API_URL }}
  payWebUrl={process.env.NEXT_PUBLIC_EZPAY_WEB_URL}
>
  <DonationWall projectId="myproject" locale={locale} />
</PayProvider>
```

Consumer components (`DonationWall`, `DonationCard`, `BillingDashboard`,
`PricingPage`) also accept an optional `locale` prop (defaults to `'en'`)
used to build the `{payWebUrl}/{locale}/developer` dashboard URL. SDK stays
i18n-agnostic — pass `useLocale()` from your i18n library.

The `fetch-failed` reason is silenced in production by default: users see a
muted "Temporarily unavailable" placeholder instead of "Payments service
unreachable". Override via `silentInProduction={false}` if you want the full
card on transient infra issues too.

### Components (`@ezstart/pay-sdk/components`)

- `DonateButton`, `DonateModal`, `DonationCard`, `DonationWall`
- `PurchaseButton`, `PurchaseCard`
- `SubscribeButton`, `SubscriptionCard`, `SubscriptionPlanCard`
- `PayAdminDashboard`, `UserPaymentDashboard`
- `FeatureGate`, `PromoCodeInput`, `RefundButton`, `ConfirmActionDialog`
- `PaymentSuccessPage`, `PaymentHistory`, `ProductCard`, `ProductGrid`
- `PayDeveloperPortal`, `CreatePayKeyModal` — API keys CRUD (create / rotate / revoke) scoped to an Application
- `PayNotConfiguredCard` — graceful fallback rendered by pay-sdk components when the SDK is unconfigured or a downstream fetch fails

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
- `verifyWebhookSignature({ provider, stripe, payload, signature, secret })` — provider-agnostic helper that wraps `stripe.webhooks.constructEvent` (today) and returns a normalised `WebhookEvent`. Throws on invalid signatures so handlers can return `400` directly.

```ts
import Stripe from 'stripe'
import { verifyWebhookSignature } from '@ezstart/pay-sdk/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

app.post('/webhooks/stripe', (req, res) => {
  try {
    const event = verifyWebhookSignature({
      provider: 'stripe',
      stripe,
      payload: req.rawBody,
      signature: req.headers['stripe-signature'] as string,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    })
    // `event.type` is one of WebhookEventType (typed)
    res.json({ received: true })
  } catch {
    res.status(400).end()
  }
})
```

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
