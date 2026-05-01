# Changelog

All notable changes to `@ezstart/ui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- README rewritten following `standard.md` §6 format: Install + Quickstart
  (Theme + first component) + Components overview by atomic level (base /
  composed / complex) + API entry points + Customization. Examples use
  generic `myapp` (no monorepo-specific app names).

### Added

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
