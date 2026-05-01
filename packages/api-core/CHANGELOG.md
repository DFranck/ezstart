# Changelog

All notable changes to `@ezstart/api-core` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).
- `deprecatedRoute()` middleware for marking API endpoints as deprecated.
  Sets RFC 8594 HTTP headers (`Sunset`, `Deprecation`, `Warning`, `Link`)
  and emits a structured warn entry through the injected logger (silent
  no-op by default to keep the agnostic core dependency-free; pass
  `logger` from `@ezstart/logger/server` to surface entries to Pino /
  Sentry / Better Stack). Pairs with the browser-side
  `useDeprecationWarning()` hook in `@ezstart/ui`. See
  `.claude/rules/standard-ui.md` §10.8.
