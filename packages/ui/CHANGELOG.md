# Changelog

All notable changes to `@ezstart/ui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **PAY_SDK_PHASE_1_MIGRATE-001 (#179)** — 10 generic components extracted
  from `@ezstart/pay-sdk` (the originals are kept as deprecated re-exports
  in pay-sdk for 90 days, removal 2026-08-01):
  - `checkout-templates/` folder with 7 Stripe success / cancel landing
    templates (was in `@ezstart/pay-sdk`):
    `PaymentSuccessTemplate`, `SubscribeSuccessTemplate`,
    `DonateSuccessTemplate`, `PurchaseSuccessTemplate`,
    `SubscribeCancelTemplate`, `DonateCancelTemplate`,
    `PurchaseCancelTemplate`. Pure presentational — read `?session_id=`
    via `next/navigation` and render localised copy + CTAs. The 6
    success/cancel templates share a private `_internal-callback-base.tsx`
    helper (not exported from the package barrel). Originally part of
    pay-sdk; generalised because the templates have zero payment coupling
    (Stripe is just one possible source for the `session_id` query param).
  - `ConfirmActionDialog` (`feedback/`) — generic confirm-action dialog
    with built-in loading / success / error states + auto-close on success
    - retry on error. Uses semantic theme tokens (`text-success` /
      `text-destructive`) and `sonner` for toast feedback. Originally lived
      in `@ezstart/pay-sdk`; primitive has zero payment coupling (it's a
      thin wrapper around `<AlertDialog>` + a `Promise`-returning confirm
      callback).
  - `ProductCard` + `ProductGrid` (`data-display/`) — generic product
    teaser card + responsive grid with optional search / type filter.
    Originally lived in `@ezstart/pay-sdk`. The new primitives are
    presentation-only: the action button (buy / subscribe / contact /
    custom) is caller-provided via the `actionSlot: ReactNode` prop.
    Pair with `<PurchaseButton>` / `<SubscribeButton>` from
    `@ezstart/pay-sdk/components` for the standard Stripe flow, or wire
    your own button for non-payment surfaces (catalog, marketplace
    teaser, store front, ...). `@ezstart/ui` `ProductCard` accepts an
    optional `formatCurrency` prop to inject an SSR-safe per-currency
    locale resolver (the default uses the built-in
    `@ezstart/ui/utils/format-currency`).
  - `next` declared as optional peer dependency (^15) — required by the
    new checkout templates (`useRouter` + `useSearchParams`) and the
    `<ProductCard>` (`next/image`).

- `<Card>` accepts an `intent` prop (`none` | `warning` | `success` | `info`
  | `destructive` | `primary`) — adds a semantic-color border and tinted
  background. Default `none` for zero-break backward compat. Pattern matches
  Mantine `color` / Chakra `colorScheme` for callout cards (notifications,
  demo mode, past-due billing, etc.). Composes with the existing `variant`
  prop (variant handles shadow / padding / elevation, intent handles the
  semantic accent color).

### Documentation

- README rewritten following `standard.md` §6 format: Install + Quickstart
  (Theme + first component) + Components overview by atomic level (base /
  composed / complex) + API entry points + Customization. Examples use
  generic `myapp` (no monorepo-specific app names).

### Added

- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).
- `ErrorAlert` (`@ezstart/ui/components`) — destructive alert wrapper for
  forms, modals and settings pages. Renders semantic `role="alert"` markup
  with destructive theme tokens (light/dark mode parity). Originally
  `AuthErrorBanner` in `@ezstart/auth-sdk` — generalized because the
  primitive has zero auth coupling and is needed by every consumer app.
- `ScopeContextSwitcher` (`@ezstart/ui/components`) — Stripe-pattern
  role/scope toggle (Personal account ↔ Platform admin) with badge + button.
  Pure presentational primitive, accepts `LinkComponent` for SPA navigation.
  Originally `ScopeContextIndicator` in `@ezstart/auth-sdk`.
- `PasswordStrength` (`@ezstart/ui/components`) — visual password strength
  indicator (4-tier weak/fair/good/strong from length + character variety).
  Pure algorithm + UI, semantic theme tokens. Originally in
  `@ezstart/auth-sdk` — generalized because the primitive has zero auth
  coupling.
- `MaintenanceBanner` (`@ezstart/ui/components`) — props-driven platform
  maintenance banner. Accepts a resolved `status` payload (`{ enabled,
message, startedAt, scheduledEnd }`) and renders a sticky warning
  surface when active. Zero data fetching: pair it with
  `useMaintenanceStatus()` from `@ezstart/api-sdk/react` (or any other
  status source). Originally lived in `@ezstart/auth-sdk` as a
  hook-coupled component — split into data layer + presentation so the
  primitive stays reusable across status sources (custom backend, env
  flag, feature-flag service, ...).
- `ProgressBadge` (`@ezstart/ui/components`) — generic usage / quota
  progress badge with semantic color thresholds (`success → warning →
destructive`). Renders a tiny progress bar + percentage badge for any
  "X / Y" usage metric (API calls, storage, seats, AI tokens, ...).
  Supports `compact` variant (badge-only), custom `threshold`, custom
  `label`, and accessible `aria-*` props. Originally inlined inside
  `@ezstart/auth-sdk`'s `<UsageBadge>` — extracted so any consumer app
  can reuse it for any quota surface; `<UsageBadge>` is now a thin
  wrapper around `<ProgressBadge>` to preserve its public API.

### Changed

- `useDeprecationWarning()` (`@ezstart/ui/hooks`) now surfaces deprecated
  usage via `console.warn` in **every environment, including production**
  (toast remains dev-only). Inherits the new contract from
  `@ezstart/logger`'s `warnDeprecation()`. Allows error trackers (Sentry,
  Better Stack, ...) to capture deprecated component usage in prod without
  shipping a behavior change. No public API surface change — components
  using the hook don't need to update.

### Changed (BREAKING)

- `@ezstart/config` and `@ezstart/logger` moved from `dependencies` to
  `peerDependencies` (both marked `optional: true`). Required to make
  `@ezstart/ui` truly publishable as a standalone package per
  `.claude/rules/standard.md` §1 (agnostic) + §4 (publishable).
  - `@ezstart/config` is only consumed by the optional theme entry points
    (`@ezstart/ui/theme/components`, `@ezstart/ui/theme/server`). Consumers
    that import these entries must add `@ezstart/config` to their own
    dependencies.
  - `@ezstart/logger` is consumed by deprecation warnings and a few
    error/analytics components. The default behavior is silent no-op when
    the peer is absent, so most consumers do not need to install it
    explicitly.
  - All apps inside the `@ezstart` monorepo already declare both packages in
    their own `dependencies`, so workspace consumers are unaffected.
