# Changelog

All notable changes to `@ezstart/api-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- README rewritten following `standard.md` §6 format: quickstarts split by
  integration level (vanilla TS via `apiCall` / `createApiClient`, React via
  `apiQuery`, third-party via `/integrations`). Examples use generic
  `myapp` + `https://api.example.com` (no monorepo-specific names).

### Added

- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).
- New `./integrations` entry point exposing third-party service wrappers
  designed to be drop-in across any consumer app or SDK.
- `TurnstileWidget` (`@ezstart/api-sdk/integrations`) — Cloudflare Turnstile
  captcha React wrapper. Renders nothing when `siteKey` is empty so apps
  can ship without captcha and enable it later via env var. Lazy-injects
  the Cloudflare script (idempotent), supports HMR / StrictMode unmount,
  and accepts a silent-by-default `logger` prop. Originally lived in
  `@ezstart/auth-sdk` — moved here because Cloudflare Turnstile is a
  generic captcha integration usable on any form (contact, signup,
  passwordless flows, etc.), not auth-specific.
