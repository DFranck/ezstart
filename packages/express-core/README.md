# @ezstart/express-core

Express.js infrastructure and utilities for all @ezstart API services (MongoDB, middleware, error handling).

## Install

`pnpm add @ezstart/express-core`

## Usage

```typescript
import { createApp, createRouter, connectDB } from '@ezstart/express-core'
import { corsMiddleware } from '@ezstart/express-core/cors'
```

## Docs

- [MONGODB-ARCHITECTURE.md](./MONGODB-ARCHITECTURE.md) — MongoDB patterns and conventions

## Used by

- apps/ezauth, ezbill, ezpay, ezstart, gacha-analyzer, green-pulse (api)
