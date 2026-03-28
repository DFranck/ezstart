# @ezstart/auth-sdk

React SDK for EZAuth centralized authentication (SSO).

## Install

`pnpm add @ezstart/auth-sdk`

## Usage

```typescript
import { AuthProvider, useAuth } from '@ezstart/auth-sdk'
// Server-side
import { verifyToken } from '@ezstart/auth-sdk/server'
```

## Docs

- [HTTPONLY-MIGRATION.md](./HTTPONLY-MIGRATION.md) — Cookie migration guide

## Used by

- apps/asc-tcd, ezauth, ezbill, ezstart, fengshui, gacha-analyzer, green-pulse (web)
- apps/ezauth (api)
- packages/rbac
