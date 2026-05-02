# Changelog

All notable changes to `api-ezpay` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
