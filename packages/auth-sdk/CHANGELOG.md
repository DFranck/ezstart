# Changelog

All notable changes to `@ezstart/auth-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Cards UI surface restored: `<SignInCard>`, `<SignUpCard>`, `<ForgotPasswordCard>`, `<ResetPasswordCard>`, `<VerifyEmailCard>` — embeddable Modal-shell variants with sticky header/footer and scrollable body, mobile-first.
- `'server-only'` guard at the top of every file in `src/server/` (`index.ts`, `features.ts`, `get-server-auth.ts`, `get-server-api-keys.ts`, `get-server-application.ts`, `get-server-applications.ts`, `get-server-audit-log.ts`). Throws at build time if a client component accidentally imports a server helper, preventing cookie / token leaks to the browser bundle.
- `server-only@^0.0.1` added to `dependencies` so the guard resolves cleanly for standalone publish + monorepo consumers.

### Changed

- `<AuthCardShell>` simplified — title row dropped, theme switcher hidden on mobile (visible `md+`).
- **BREAKING** — `@ezstart/capture-sdk` moved from `dependencies` to optional `peerDependencies`. The package was only consumed by `<AccountModal>` / `<AccountModalV2>` (avatar crop UI) — never by the `core/` or `server/` layers. Per `.claude/rules/standard.md` §0bis (SDK 3-layer split), components-only deps belong in `peerDependencies` so consumers who import only `@ezstart/auth-sdk/core` or `@ezstart/auth-sdk/server` aren't forced to install a UI-only crop sdk. **npm consumers using `<AccountModal>` must now install `@ezstart/capture-sdk` explicitly.** Workspace consumers (apps inside the monorepo) are unaffected — pnpm resolves workspace peers automatically.

### Deprecated

- `AuthErrorBanner` — moved to `@ezstart/ui` as `ErrorAlert`. Re-exported with deprecation warning. Removal planned 2026-08-01. Migration: `import { ErrorAlert } from '@ezstart/ui/components'`.
- `ScopeContextIndicator` — moved to `@ezstart/ui` as `ScopeContextSwitcher`. Re-exported with deprecation warning. Removal planned 2026-08-01. Migration: `import { ScopeContextSwitcher } from '@ezstart/ui/components'`.
- `PasswordStrength` — moved to `@ezstart/ui`. Re-exported with deprecation warning. Removal planned 2026-08-01. Migration: `import { PasswordStrength } from '@ezstart/ui/components'`.
- `TurnstileWidget` — moved to `@ezstart/api-sdk` as a generic Cloudflare integration (`@ezstart/api-sdk/integrations`). Cloudflare Turnstile is captcha, not auth-specific, so it now lives next to the other third-party integrations the SDK exposes. Re-exported with deprecation warning. Removal planned 2026-08-01. Migration: `import { TurnstileWidget } from '@ezstart/api-sdk/integrations'`.

## [1.0.0] - 2026-04-29

Initial public release. See git history for the full list of features and fixes
that landed in 1.0 (registry generator, SSR backdrop placeholder, Cards →
Modals refactor, self-contained Card components, SaaS-pro consolidation —
SSR + Zustand factory + V2 menus + server helpers, dogfood pattern, white-label
theme, dual-mode httpOnly cookies migration, RBAC server middleware,
`<DevModeBanner>`, `<EZAuthDashboard>` with key scopes, OAuth callback
hardening, and more).

[Unreleased]: https://github.com/DFranck/ezstart/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/DFranck/ezstart/releases/tag/v1.0.0
