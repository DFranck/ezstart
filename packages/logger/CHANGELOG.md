# Changelog

All notable changes to `@ezstart/logger` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `detectErrorTracker()` — pure provider detection helper that returns `'sentry' | 'logtail' | null` based on env vars (`NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` / `NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN` / `LOGTAIL_SOURCE_TOKEN`). Used by Next.js apps + Express APIs to know which error sink (if any) is wired without coupling to the underlying SDK. Sentry takes precedence over Logtail when both are set. Browser-safe (no Node-only APIs). Re-exported from both `@ezstart/logger` (browser entry) and `@ezstart/logger/server`.
- 9 vitest cases covering the full priority matrix (none / sentry / logtail / both).
- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers). Previously pinned to `20.18.x` (dev pin), now broadened to `>=18.0.0` so external npm consumers on Node 18 LTS can install without warning.

### Changed

- `warnDeprecation()` (browser + server entries) now emits a `console.warn` /
  `pinoLogger.warn` in **every environment, including production**. Previously
  the helper was a silent no-op in production. The behavior change makes
  deprecated API usage visible to error trackers (Sentry, Better Stack,
  Datadog, ...) once they are wired — without requiring a code-level toggle.
  - Toasts (browser only, via the optional `options.toast` callback) remain
    gated to non-production environments to avoid UX noise for end users
    who can't act on the notice.
  - Per-session dedup (`Set<string>` keyed by `name`) is unchanged.
  - No public API surface change — callers don't need to update.
