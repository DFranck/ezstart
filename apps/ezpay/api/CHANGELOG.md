# Changelog

All notable changes to `api-ezpay` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Pay docs sandbox infrastructure** (PAY_DOCS_DEMO_SANDBOX-001 #178 — mirror
  of #163's ezauth-side docs sandbox). Backs `/docs/pay/*` live previews
  (PricingPage, SubscriptionCard, PastDueBanner, DonationWall,
  PayAdminDashboard) with sandbox-isolated data that resets every 24h:
  - `scripts/seed-pay-docs-demo-data.ts` — seeds 3 plans (Free / Pro €19 /
    Enterprise €99) + 2 subscriptions (1 active + 1 past_due) + 4 payments
    (success / refund / past_due / large) + 5 donations + 2 invoices.
    Idempotent — plans persist via `(applicationId, name)` upsert, volatile
    entities flushed + recreated to a deterministic baseline. Sandbox docs
    carry `isTestMode: true` + `liveMode: false` + `paymentId` namespaced
    `pay-docs-demo-*` (no real Stripe API call ever fires).
  - `middleware/check-pay-demo-quotas.ts` — hard caps enforced on
    `/donate`, `/subscribe`, `/purchase`: 50 active subs / 200 payments per
    day / 100 donations per day. Strict no-op for non-demo traffic
    (detection via `apiKeyAppSlug` / `apiKeyApplicationId` /
    `body.projectId` / `body.applicationId`). Returns 429 with a clear
    "Demo capacity reached" message when a cap is hit; 503 if the sandbox
    Application is missing entirely (fail-closed).
  - `services/pay-docs-demo-reset.service.ts` — wipes all sandbox payments
    every 24h (next 4am UTC + every 24h thereafter) and re-seeds the
    deterministic baseline via `seedPayDocsDemoData({ skipPlans: true })`.
    Plans survive across resets. Skipped under `NODE_ENV=test`.
  - `routes/admin/pay-docs-demo-reset.ts` — `POST /api/admin/pay-docs-demo/reset`
    (superadmin only) for manual escape-hatch wipes. Audit-logged via
    `payments.cleanup` action.
  - 21 new vitest tests across 2 suites:
    - `__tests__/scripts/seed-pay-docs-demo-data.test.ts` (7 tests) —
      first-run shape, isTestMode partition, idempotence, skipPlans flag.
    - `__tests__/isolation/pay-docs-demo-isolation.test.ts` (14 tests) —
      cross-tenant isolation: 3 quota gates, no-op for live traffic,
      reset-only-touches-sandbox, plans-survive-reset, no-Stripe-call
      proof, multi-reset stability.
  - `seed:pay-docs-demo` script entry in `package.json`.
  - Wired in `index.ts` boot via `startPayDocsDemoResetScheduler()`
    (skipped under `NODE_ENV=test`).
  - `checkPayDemoQuotas` middleware mounted on the 3 mutation routes:
    `POST /donate`, `POST /subscribe`, `POST /purchase`.
  - Sister seed in api-ezauth (`seed:pay-docs-demo`) creates the
    `_pay-docs-demo` Application doc + 2 reserved keys (`pk_test` /
    `sk_test`) — already shipped 2026-04-30 (commit 6c3f8002).
- **`DELETE /api/connect/disconnect` endpoint** — closes the Stripe Connect
  flow loop (PAY_CONNECT_RESUME #84/#86 follow-up). The pay-sdk's
  `useConnectDisconnect` hook + `client.disconnectAccount()` were calling
  this route but it didn't exist server-side. Implementation:
  - Auth: `authJwtOrKey()` (Bearer JWT or EZPay API key).
  - RBAC: only the `ConnectedAccount.userId` (the user who linked it) OR a
    superadmin can disconnect. Scoped lookup by `applicationId + userId`.
  - Scoping: optional `?applicationId=` query param.
    - Provided → scoped lookup (the common path used by
      `<DeveloperConnectDashboard>`).
    - Omitted → enumerate the caller's accounts; 1 → disconnect, 0 → 404,
      2+ → 400 (disambiguation required).
  - Stripe deletion: `stripe.accounts.del(stripeAccountId)` for external
    accounts only (`isPlatformAccount: false`). Failures are logged as
    warnings and DON'T block the local cleanup — Stripe's API refuses
    deletion for live-mode Standard accounts and accounts with non-zero
    balances, but the user's intent is to disconnect from EZPay's side
    regardless.
  - Platform-owned accounts (`isPlatformAccount: true`) NEVER hit
    `stripe.accounts.del` — they all share the single EZStart LLC Stripe
    account, deleting it would break every dogfood app at once.
  - Hard-delete the local `ConnectedAccount` row after the Stripe attempt.
    The user can re-onboard from scratch anytime.
  - Audit log: persists `'connect.disconnected'` action with metadata
    `{ applicationId, stripeAccountId, accountType, isPlatformAccount,
stripeDeleted }` (the `'connect.disconnected'` action was already
    declared in the audit log enum but never emitted before this change).
  - 7 new vitest tests covering the model invariants (hard-delete, 404 on
    missing, 400 on multi-account ambiguity, single-account degenerate path,
    403 on cross-user attempts, platform-account skip-Stripe branch, local
    cleanup proceeds when Stripe fails). All 21 connect tests PASS.
