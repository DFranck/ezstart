# @ezstart/logger

Structured logging with Pino for all @ezstart services.

## Install

`pnpm add @ezstart/logger`

## Usage

```typescript
import { createLogger } from '@ezstart/logger'

const log = createLogger('my-service')
log.info('Server started', { port: 6100 })
```

## Used by

- All API apps
- packages/express-core
