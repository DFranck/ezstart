# Changelog

All notable changes to `@ezstart/logger` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
