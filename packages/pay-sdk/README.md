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

## Choosing your payment UX

EZPay wraps **Stripe Checkout (hosted)** by default — that's the recommended pattern for 99% of use cases. Stripe Elements (embedded) is supported via direct Stripe SDK integration, but EZPay focuses on the hosted flow.

### Pattern A — Hosted Stripe Checkout (recommended)

User clicks "Subscribe" → redirected to a Stripe-hosted checkout page → after payment, lands back on your app via SDK callback pages.

```tsx
// 1. In your pricing page
import { SubscribeButton, DonateModal, PurchaseButton } from '@ezstart/pay-sdk/components'

<SubscribeButton
  planId="plan_pro"
  successUrl="/subscribe/success"
  cancelUrl="/subscribe/cancel"
/>

<DonateModal
  amounts={[5, 10, 25, 100]}
  successUrl="/donate/success"
/>

<PurchaseButton
  productId="ebook_pro"
  amount={29}
  successUrl="/purchase/success"
/>

// 2. Add SDK callback pages (drop-in, zero config)
// src/app/subscribe/success/page.tsx
import { SubscribeSuccessPage } from '@ezstart/pay-sdk/components'
export default () => <SubscribeSuccessPage redirectTo="/dashboard" />

// src/app/subscribe/cancel/page.tsx
import { SubscribeCancelPage } from '@ezstart/pay-sdk/components'
export default () => <SubscribeCancelPage backToPricingHref="/#pricing" />

// Same for: <DonateSuccessPage>, <DonateCancelPage>, <PurchaseSuccessPage>, <PurchaseCancelPage>
```

**Pros:**

- Zero PCI compliance burden (Stripe handles)
- Auto multi-currency, EU VAT, Apple Pay, Google Pay, etc.
- Always up-to-date payment methods
- Mobile-optimized natively
- Built-in 3D Secure / SCA
- Drop-in SDK = ~5 min integration vs days of Elements custom code

**Cons:**

- Redirect to Stripe domain (1 brand visible)
- Less control over checkout UI

**Best for:** 99% of products. Indie SaaS, marketplaces, B2C, B2B. Default choice.

### Pattern B — Embedded Stripe Elements (advanced)

For cases where you absolutely need checkout on YOUR domain (some Enterprise compliance, ultra-custom UX), you can integrate Stripe Elements directly. EZPay does NOT provide pre-wired Elements components — you'd use Stripe's `@stripe/react-stripe-js` directly + EZPay backend API for subscription/payment creation.

```tsx
// You handle Elements yourself (advanced)
import { Elements, PaymentElement } from '@stripe/react-stripe-js'
import { usePayClient } from '@ezstart/pay-sdk'

// Create payment intent via EZPay backend
const client = usePayClient()
const { clientSecret } = await client.createPaymentIntent({ amount: 999 })

<Elements stripe={stripePromise} options={{ clientSecret }}>
  <PaymentElement />
</Elements>

// Then handle confirm via stripe.confirmPayment()
```

**Pros:** 100% your domain, full UX control, no redirect.
**Cons:** PCI compliance burden, more code, must handle 3DS / SCA / etc.

**Best for:** Enterprise compliance requirements, ultra-custom checkout UI. Rare.

### Pattern C (recommended) — Use Hosted by default

Just use Pattern A (hosted Stripe Checkout). EZPay was designed for this. It's what 99% of products need.

### Why not embed everything?

Stripe Checkout (hosted) handles:

- PCI DSS compliance (massive cost savings vs DIY)
- EU VAT, US sales tax (Stripe Tax)
- Apple Pay, Google Pay, Link, BNPL automatically
- 3D Secure, SCA (EU compliance)
- Receipts, invoices in Stripe Customer Portal
- Multi-currency display
- Localization 30+ languages
- Mobile-optimized
- Ongoing updates (you don't maintain UI)

Embedding all this yourself = months of work + ongoing maintenance. EZPay's hosted approach = minutes of work + Stripe maintains.

### Components matrix

| Component                                           | Use case                                                   |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `<SubscribeButton />`                               | Recurring subscription via Stripe Checkout                 |
| `<DonateButton />`                                  | One-shot donation                                          |
| `<DonateModal />`                                   | Donation with amount picker                                |
| `<PurchaseButton />`                                | One-shot product purchase                                  |
| `<PricingPage />`                                   | Auto-fetch + display plans + Subscribe buttons             |
| `<SubscribeSuccessPage />`                          | `/subscribe/success` callback handler                      |
| `<SubscribeCancelPage />`                           | `/subscribe/cancel` callback handler                       |
| `<DonateSuccessPage />`, `<DonateCancelPage />`     | Donate callbacks                                           |
| `<PurchaseSuccessPage />`, `<PurchaseCancelPage />` | Purchase callbacks                                         |
| `<BillingDashboard />`                              | User's subscriptions + history + payment methods           |
| `<ManageSubscriptionButton />`                      | Link to Stripe Customer Portal (cancel, update card, etc.) |
| `<InvoiceHistorySection />`                         | User's invoices (DataTable + filter + download)            |
| `<PayAdminDashboard />`                             | Cross-tenant admin (federated)                             |

All components accept:

- `texts?: Partial<XTexts>` — i18n override (English defaults)
- `onSuccess` / `onError` callbacks where relevant
- `className` for style overrides

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
- `PayAdminDashboard` -- canonical 5-tab admin console (Overview / Payments / Subscriptions / Plans / Promos), auto-scoped server-side via JWT
- `UserPaymentDashboard`
- `FeatureGate`, `PromoCodeInput`, `RefundButton`, `ConfirmActionDialog`
- `PaymentSuccessPage`, `PaymentHistory`, `ProductCard`, `ProductGrid`
- `SubscribeSuccessPage`, `SubscribeCancelPage`, `DonateSuccessPage`, `DonateCancelPage`, `PurchaseSuccessPage`, `PurchaseCancelPage` — drop-in Stripe Checkout callback landings
- `PayDeveloperPortal`, `CreatePayKeyModal` — API keys CRUD (create / rotate / revoke) scoped to an Application
- `PayNotConfiguredCard` — graceful fallback rendered by pay-sdk components when the SDK is unconfigured or a downstream fetch fails

### Stripe Checkout callback pages

Drop-in landing pages for Stripe Checkout `success_url` / `cancel_url` redirects. Each component reads `?session_id=` from the URL, displays the appropriate confirmation, and (on success) optionally auto-redirects after a short delay. All strings are overridable via the `texts` prop with English defaults.

```tsx
'use client'
import { SubscribeSuccessPage, SubscribeCancelPage } from '@ezstart/pay-sdk/components'

// app/subscribe/success/page.tsx
export default function Success() {
  return <SubscribeSuccessPage redirectTo="/dashboard" redirectDelayMs={3000} />
}

// app/subscribe/cancel/page.tsx
export default function Cancel() {
  return <SubscribeCancelPage backToPricingHref="/#pricing" />
}
```

With i18n (next-intl example) — pass `{seconds}` / `{id}` placeholders through verbatim so the component can interpolate them at render time:

```tsx
'use client'
import { useLocale, useTranslations } from 'next-intl'
import { SubscribeSuccessPage } from '@ezstart/pay-sdk/components'

export default function Page() {
  const t = useTranslations('subscribe.success')
  const locale = useLocale()
  return (
    <SubscribeSuccessPage
      redirectTo={`/${locale}/dashboard`}
      texts={{
        title: t('title'),
        description: t('description'),
        // {seconds} stays literal so the SDK can interpolate the live countdown
        redirectingLabel: t('redirecting', { seconds: '{seconds}' }),
        ctaLabel: t('goToDashboard'),
        stepsTitle: t('whatNext'),
        steps: [t('emailConfirmation'), t('accessGranted'), t('receiptAvailable')],
        referenceLabel: t('reference', { id: '{id}' }),
      }}
    />
  )
}
```

Available callback components — props mirror this shape:

| Component              | Hero icon            | Auto-redirect default | Primary CTA default |
| ---------------------- | -------------------- | --------------------- | ------------------- |
| `SubscribeSuccessPage` | `lucide:CheckCircle` | 3000 ms               | "Go to dashboard"   |
| `SubscribeCancelPage`  | `lucide:XCircle`     | —                     | "Back to pricing"   |
| `DonateSuccessPage`    | `lucide:Heart`       | off (0 ms)            | "Back to home"      |
| `DonateCancelPage`     | `lucide:XCircle`     | —                     | "Try Again"         |
| `PurchaseSuccessPage`  | `lucide:ShoppingBag` | off (0 ms)            | "Back to home"      |
| `PurchaseCancelPage`   | `lucide:XCircle`     | —                     | "Try Again"         |

Set `redirectDelayMs={0}` to disable the success-page auto-redirect. Pass `onComplete` to fire a callback (analytics, log) right before the router push.

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

### PayAdminDashboard

Canonical pay-sdk admin console. Drop-in component that ships the entire ezpay admin surface as 5 internal tabs:

1. **Overview** -- platform analytics (revenue by currency, total payments, active subscriptions, MRR proxy, 30-day revenue trend, top apps by revenue) hitting `GET /admin/analytics/overview`
2. **Payments** -- completed/failed/refunded/pending payments with refund actions
3. **Subscriptions** -- active subscriptions + MRR + cancel actions
4. **Plans** -- subscription plan CRUD
5. **Promos** -- promo code CRUD

Auto-scoped server-side via JWT -- superadmin sees every tenant, app-owner sees their owned apps, regular user sees only their own records. The component accepts NO scoping props.

```tsx
'use client'
import { PayAdminDashboard, PayProvider } from '@ezstart/pay-sdk'

export default function AdminPage() {
  return (
    <PayProvider publishableKey={process.env.NEXT_PUBLIC_EZPAY_KEY}>
      <PayAdminDashboard />
    </PayProvider>
  )
}
```

With i18n (next-intl) -- `texts` deep-merges into all 5 sections:

```tsx
const t = useTranslations('admin.pay')
<PayAdminDashboard
  texts={{
    tabOverview: t('tabs.overview'),
    tabPayments: t('tabs.payments'),
    tabSubscriptions: t('tabs.subscriptions'),
    tabPlans: t('tabs.plans'),
    tabPromos: t('tabs.promos'),
    overview: { title: t('overview.title'), totalRevenue: t('overview.totalRevenue') },
    payments: { totalRevenue: t('payments.totalRevenue'), refund: t('payments.refund') },
    plans: { createPlan: t('plans.create') },
  }}
/>
```

Test mode (sandbox dashboards) -- enables a top banner + bulk destructive actions (refund-all, cancel-all, delete-all):

```tsx
<PayAdminDashboard testMode />
```

#### Breaking changes vs the previous API

The dashboard is now **auto-scoped server-side** via JWT. The following props were removed:

| Removed prop    | Why                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------ |
| `scope`         | Server derives from caller role: `superadmin` -> all, app-owner -> myApps, user -> mine.   |
| `appName`       | Use the `<PayProvider publishableKey>` -- the SDK resolves the matching app automatically. |
| `applicationId` | Same as above; provider context drives the scope.                                          |
| `showAppFilter` | Per-app filtering is now done by issuing different publishable keys to different mounts.   |

The `texts` prop changed shape from a flat dictionary to a nested object grouped by section (`overview`, `payments`, `subscriptions`, `plans`, `promos`) to keep i18n keys organized as the dashboard grows.

The Overview tab requires `GET /admin/analytics/overview` on the ezpay API. When the endpoint returns 404, the tab renders a "coming soon" placeholder so the dashboard stays usable in environments where the analytics endpoint hasn't been deployed yet.

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
