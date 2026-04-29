# Changelog

All notable changes to `@ezstart/ui` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
