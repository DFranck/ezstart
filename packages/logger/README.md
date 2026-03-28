# @ezstart/logger

> Structured logging with Pino for @ezstart monorepo

## Overview

Centralized logging package that provides structured JSON logs in production and pretty-printed logs in development. Built on top of [Pino](https://getpino.io/), one of the fastest Node.js loggers.

**Features:**
- ✅ **Structured JSON logs** - Searchable and analyzable in production
- ✅ **Pretty printing** - Colorized, human-readable logs in development
- ✅ **Backward compatible** - Works with both old and new logger formats
- ✅ **High performance** - Pino is 5x faster than Winston
- ✅ **Log levels** - info, warn, error, debug with configurable filtering

## Installation

```bash
pnpm add @ezstart/logger
```

## Usage

### Basic Usage

```typescript
import { logger } from '@ezstart/logger'

// Log with context (Pino format - preferred)
logger.info({ userId: '123', email: 'user@example.com' }, 'User logged in')
logger.error({ error, paymentId }, 'Payment processing failed')

// Log simple message (backward compatible)
logger.info('Server started')
logger.warn('Deprecated API called')
```

### With Context Objects

```typescript
// Good: Include relevant context
logger.info({
  userId,
  action: 'checkout',
  amount: 99.99
}, 'Payment initiated')

// Even better: Include request ID for tracing
logger.info({
  requestId,
  userId,
  endpoint: '/api/payments'
}, 'API request received')
```

### Error Logging

```typescript
try {
  await processPayment(paymentId)
} catch (error) {
  logger.error({
    error,  // Pino automatically serializes Error objects
    paymentId,
    userId
  }, 'Payment processing failed')
  throw error
}
```

### Conditional Logging

```typescript
// Debug logs only in development
logger.debug({ query, results }, 'Database query executed')

// Set log level via environment variable
// LOG_LEVEL=debug pnpm dev
```

## Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `info` | General information | Server started, user logged in |
| `warn` | Warning conditions | Deprecated API, slow query |
| `error` | Error conditions | Payment failed, database error |
| `debug` | Debug information | Query executed, cache hit |

## Environment Variables

```env
# Set log level (default: info)
LOG_LEVEL=debug

# Auto-detected: NODE_ENV determines output format
NODE_ENV=development  # Pretty-printed logs
NODE_ENV=production   # JSON logs
```

## Output Examples

### Development (Pretty Print)

```
[21:15:30] INFO: 🚀 Server started
    service: "EZAuth"
    url: "http://localhost:5010"
    port: 5010

[21:15:31] INFO: User logged in
    userId: "abc123"
    email: "user@example.com"
```

### Production (JSON)

```json
{"level":"info","time":1634567890,"service":"EZAuth","url":"http://localhost:5010","port":5010,"msg":"🚀 Server started"}
{"level":"info","time":1634567891,"userId":"abc123","email":"user@example.com","msg":"User logged in"}
```

## Migration from console.log

### Before (console.log)

```typescript
console.log('User logged in:', userId)
console.error('Payment failed:', error)
```

### After (@ezstart/logger)

```typescript
import { logger } from '@ezstart/logger'

logger.info({ userId }, 'User logged in')
logger.error({ error, paymentId }, 'Payment failed')
```

## Used By

### Packages
- `@ezstart/express-core` - HTTP server logs, MongoDB connection

### APIs
- `apps/ezauth/api` - Authentication logs
- `apps/ezpay/api` - Payment processing logs
- `apps/ezbill/api` - Invoice operations logs
- `apps/green-pulse/api` - AI conversation logs

## Performance

Pino is designed for high performance:
- **~30% faster** than Bunyan
- **~5x faster** than Winston
- **~10x faster** than log4js

Benchmarks on a modern laptop (Node.js 20):
- **50,000 logs/second** (JSON mode)
- **30,000 logs/second** (pretty print mode)

## Best Practices

✅ **DO:**
- Include relevant context as objects
- Use appropriate log levels
- Log errors with full context
- Use structured data (objects) instead of string concatenation

❌ **DON'T:**
- Log sensitive data (passwords, tokens)
- Over-log in production (use DEBUG level for verbose logs)
- Concatenate strings (`logger.info('User: ' + userId)`) - use objects instead

## Related Packages

- [`@ezstart/express-core`](../express-core/README.md) - Express infrastructure
- [`@ezstart/config`](../config/README.md) - Configuration management

## Resources

- [Pino Documentation](https://getpino.io/)
- [Best Practices for Node.js Logging](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)

---

**Created:** 2025-10-21
**Monorepo:** @ezstart
**License:** MIT
