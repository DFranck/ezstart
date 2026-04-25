# @ezstart/logger

Structured logging with Pino for all @ezstart services.

## Install

`pnpm add @ezstart/logger`

## Usage

```typescript
import { logger } from '@ezstart/logger/server'

logger.info({ port: 6100 }, 'Server started')
logger.error({ err, userId }, 'Database error')
```

For client-side (browser, Next.js client components):

```typescript
import { logger } from '@ezstart/logger'

logger.info('User clicked button', { buttonId: '123' })
```

## Used by

- All API apps
- packages/api-core

## Notes

Sentry was removed in 2026-04-25 due to OpenTelemetry/Express CORS interference
on Railway (incident 2026-04-23). Use `logger.error()` for error tracking;
consider re-adding `@sentry/node-core` (without OTEL) if a centralized error
dashboard becomes valuable.
