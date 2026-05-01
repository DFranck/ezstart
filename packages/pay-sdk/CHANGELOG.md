# Changelog

All notable changes to `@ezstart/pay-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Declared Node.js >=18.0.0 engine requirement (supply chain compat signal for npm consumers).

### Removed (BREAKING)

- `@ezstart/config` removed from `dependencies`. The package was unused at
  runtime and inside the SDK source tree (verified via `grep -r
'@ezstart/config' src/` returning zero matches). Removing the dependency
  enforces the rule from `.claude/rules/standard.md` §0bis that the SDK
  `core/` layer must remain agnostic of monorepo-specific packages.
  - Consumers that pull in `@ezstart/pay-sdk` and need `@ezstart/config`
    for their own code must declare it directly in their own
    `dependencies`.
  - `@ezstart/logger` was already declared as an optional peer dependency
    (used only as a `type`-only import in `react/pay-provider.tsx`). No
    change needed there.
