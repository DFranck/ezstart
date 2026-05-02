# Changelog

All notable changes to `@ezstart/pay-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Deprecated

- **PAY_SDK_PHASE_1_MIGRATE-001 (#179)** — 10 generic components moved to
  `@ezstart/ui` and re-exported from `@ezstart/pay-sdk` for 90 days
  (planned removal 2026-08-01). Each re-export emits a runtime
  `useDeprecationWarning` so consumers see the migration path:
  - `PaymentSuccessPage` → `PaymentSuccessTemplate` from `@ezstart/ui/components`.
  - `SubscribeSuccessPage` → `SubscribeSuccessTemplate`.
  - `DonateSuccessPage` → `DonateSuccessTemplate`.
  - `PurchaseSuccessPage` → `PurchaseSuccessTemplate`.
  - `SubscribeCancelPage` → `SubscribeCancelTemplate`.
  - `DonateCancelPage` → `DonateCancelTemplate`.
  - `PurchaseCancelPage` → `PurchaseCancelTemplate`.
  - `ConfirmActionDialog` → `ConfirmActionDialog` from `@ezstart/ui/components`
    (same name, same API).
  - `ProductCard` → `ProductCard` from `@ezstart/ui/components`. The new
    primitive is presentation-only: the action button is caller-provided
    via the `actionSlot` prop. The pay-sdk wrapper preserves the legacy
    payment-shaped props (`priceId`, `projectId`, `userId`, `userEmail`,
    `userName`, `onBuy`, ...) by wiring `<PurchaseButton>` /
    `<SubscribeButton>` from `@ezstart/pay-sdk/components` into the
    actionSlot for backward-compat.
  - `ProductGrid` → `ProductGrid` from `@ezstart/ui/components`. Same
    wrapper strategy — pay-sdk version keeps the legacy product shape and
    renders the deprecated pay-sdk `<ProductCard>` per item, while the
    `@ezstart/ui` primitive expects each `products[i]` to include an
    `actionSlot: ReactNode`.

  The full behaviour suite (auto-redirect, session_id reference, dialog
  state transitions, search / type filters, ...) is now in the
  `@ezstart/ui` template tests. Pay-sdk keeps minimal contract tests on
  the deprecated re-exports so the 90-day backward-compat window stays
  covered. Internal pay-sdk consumers (`PayPaymentsSection`,
  `PayPlansSection`, `PayPromosSection`, `PaySubscriptionsSection`,
  `RefundButton`, `SubscriptionCard`) updated to import
  `ConfirmActionDialog` from `@ezstart/ui/components` directly so they
  don't trigger their own deprecation warnings.

### Added

- **Pay docs sandbox** (PAY_DOCS_DEMO_SANDBOX-001 #178). pay-sdk now supports
  `applicationId='_pay-docs-demo'` for `/docs/components` live previews on
  the docs site. Sandbox-isolated subscriptions / payments / donations /
  invoices that never touch a live Stripe account. 24h reset cron + baseline
  re-seed (3 plans + 2 subs + 4 payments + 5 donations + 2 invoices). Hard
  quotas: 50 active subs / 200 payments per day / 100 donations per day.
  Backed by ezauth seed `seed:pay-docs-demo` (creates the Application + 2
  reserved keys) + ezpay seed `seed:pay-docs-demo` (creates the sandbox
  data). Manual reset endpoint `POST /api/admin/pay-docs-demo/reset`
  (superadmin only).
- **Connect flow now end-to-end functional** (PAY_CONNECT_RESUME #84/#86
  follow-up). `client.disconnectAccount()` accepts an optional
  `{ applicationId }` parameter so the new `DELETE /api/connect/disconnect`
  endpoint (api-ezpay) can be scoped explicitly when the user owns multiple
  Connect accounts (the API returns 400 otherwise). `useConnectDisconnect()`
  mirrors the same signature: `disconnect({ applicationId })`. The
  `<DeveloperConnectDashboard>` component always passes its `applicationId`
  prop down so the per-Application disconnect button unambiguously targets
  the right account. 4 new vitest tests (376/376 PASS) cover the SDK-level
  forwarding (`disconnectAccount` URL query, `useConnectDisconnect` hook
  with/without `applicationId`). Backward-compatible — existing callers
  that omit `applicationId` keep working in the degenerate single-account
  case.
- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).
- **Stripe Tax — full B2B EU compliance wiring** (STRIPE_TAX_SETUP_EU #172).
  When a consumer passes `automaticTax: true` on `createCheckoutSession` or
  `createSubscriptionCheckout`, the StripeProvider now sets THREE Checkout
  flags instead of one:
  - `automatic_tax: { enabled: true }` (already shipped P9-C).
  - `tax_id_collection: { enabled: true }` — Stripe Checkout collects the
    customer's VAT ID and validates it against VIES (EU VAT Information
    Exchange System). Valid B2B VAT ID → reverse-charge exemption applied
    automatically; invalid or missing → standard B2C VAT rate applies.
  - `customer_update: { shipping: 'auto', address: 'auto' }` — required by
    Stripe whenever `automatic_tax` is on and a `Customer` already exists,
    so the address collected at checkout syncs back to the Customer for
    accurate tax recomputation on subsequent invoices.

  Backward-compatible: `automaticTax: false` (or omission) keeps the previous
  behaviour and emits zero tax-related fields. The tax invoice numbering,
  HT/VAT/TTC breakdown, and B2B reverse-charge legal mention are produced by
  Stripe itself — no provider-side code change required, only the one-time
  Stripe Dashboard config documented in `apps/ezpay/STRIPE_TAX_SETUP.md`
  (operator walkthrough: OSS registration, per-product `tax_code`s, invoice
  template footer for "Article 196 CE Directive 2006/112/CE").

  Tests: +5 cases in `__tests__/providers/stripe.test.ts` covering
  `tax_id_collection` + `customer_update` on both subscription and one-shot
  Checkouts, opt-out via `automaticTax: false`, and default-off when omitted.

### Removed (BREAKING)

- `@ezstart/config` removed from `dependencies`. The package was unused at
  runtime and inside the SDK source tree (verified via `grep -r
'@ezstart/config' src/` returning zero matches). Removing the dependency
  enforces the rule from `.claude/rules/standard.md` §0bis that the SDK
  `core/` layer must remain agnostic of monorepo-specific packages.
  - Consumers that pull in `@ezstart/pay-sdk` and need `@ezstart/config`
    for their own code must declare it directly in their own
    `dependencies`.
  - `@ezstart/logger` was already declared as an optional peer dependency
    (used only as a `type`-only import in `react/pay-provider.tsx`). No
    change needed there.
