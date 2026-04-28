# @ezstart/logger

Universal structured logger for the @ezstart monorepo. Auto-resolves to Pino on
the server, console wrappers in the browser. **Single import works everywhere.**

## Install

```bash
pnpm add @ezstart/logger
```

`pino` and `pino-pretty` are bundled as direct dependencies — no extra
peer install required.

## Quickstart — Universal (recommended)

One import, runtime-appropriate impl auto-selected by the bundler. Works in
server components, client components, API routes, scripts, and edge runtimes.

```ts
import { logger } from '@ezstart/logger'

// Both call signatures are accepted on every method:
logger.info({ userId: '123' }, 'User logged in') // Pino native
logger.info('User logged in', { userId: '123' }) // Legacy
logger.error({ err }, 'Payment failed')
```

The package's `.` entry point uses conditional `browser` / `node` exports so:

| Bundle context             | Resolves to | Backend          |
| -------------------------- | ----------- | ---------------- |
| Next.js server components  | `./server`  | Pino (JSON)      |
| API routes (Node, Express) | `./server`  | Pino (JSON)      |
| `'use client'` (browser)   | `./index`   | console wrappers |
| Edge runtimes (no `pino`)  | `./index`   | console wrappers |

Pino never ships to the client bundle — the bundler tree-shakes the
unreachable branch at build time.

## Quickstart — Server-only (force Pino)

Use the explicit `/server` sub-path when you must guarantee Pino regardless
of bundler context (e.g. a Node CLI script, an unusual SSR setup).

```ts
import { logger } from '@ezstart/logger/server'

logger.info({ port: 6100 }, 'Server started')
logger.error({ err, paymentId }, 'Payment processing failed')
```

## Quickstart — Client-only (force console)

Use the explicit `/client` sub-path when you must guarantee the console
wrapper (e.g. a shared utility imported from both server and client code
that intentionally avoids Pino on the server).

```ts
import { logger } from '@ezstart/logger/client'

logger.info('User clicked', { buttonId: '123' })
```

## API

### `logger.debug(msgOrObj, dataOrMsg?)`

Verbose diagnostic information. Filtered out in production on the browser
variant; controlled by `LOG_LEVEL` on the server variant.

### `logger.info(msgOrObj, dataOrMsg?)`

Routine operational events. Filtered out in production on the browser
variant; default on the server in development.

### `logger.warn(msgOrObj, dataOrMsg?)`

Recoverable problems that warrant attention. Always logged.

### `logger.error(msgOrObj, dataOrMsg?)`

Error conditions. Always logged.

### `type Logger`

The shared interface implemented by both browser and server variants. SDK
packages that accept a `logger?: Logger` prop should re-export this type
rather than declare their own `LoggerLike` shape.

```ts
import { logger, type Logger } from '@ezstart/logger'

function makeFoo(opts: { logger?: Logger } = {}) {
  const log = opts.logger ?? logger
  log.info({ ready: true }, 'foo initialized')
}
```

### `type LogLevel`

Union of supported levels: `'debug' | 'info' | 'warn' | 'error'`.

### `createLogger(pinoInstance)` (server only)

Wrap an arbitrary Pino instance behind the universal {@link Logger}
interface. Useful for custom sinks, redaction, child loggers, or tests
that want to assert on log output without spying on `process.stdout`.

```ts
import pino from 'pino'
import { createLogger } from '@ezstart/logger/server'

const sink = pino({ level: 'debug' }, pino.destination('/var/log/app.log'))
const logger = createLogger(sink)
logger.info({ ready: true }, 'Booted')
```

### `pinoLogger` (server only)

The default Pino instance backing the package-level `logger` singleton.
Exposed so advanced consumers can derive child loggers or read the
resolved level for diagnostics.

```ts
import { pinoLogger } from '@ezstart/logger/server'

const child = pinoLogger.child({ requestId: 'abc' })
```

## Configuration

### Server variant (`@ezstart/logger/server`)

| Env var     | Default (dev) | Default (prod) | Description                                  |
| ----------- | ------------- | -------------- | -------------------------------------------- |
| `LOG_LEVEL` | `info`        | `warn`         | Pino level — overrides the env-based default |
| `NODE_ENV`  | —             | `production`   | Selects default level + transport            |

In development (`NODE_ENV !== 'production'`), the server variant uses
`pino-pretty` for a colorized, human-readable transport. In production it
emits structured JSON suitable for log aggregation (Railway, Datadog,
CloudWatch, etc.).

### Browser variant (`@ezstart/logger`, `@ezstart/logger/client`)

| Env var    | Behavior                                                |
| ---------- | ------------------------------------------------------- |
| `NODE_ENV` | When `production`, suppresses `debug` and `info` output |

`warn` and `error` are always emitted. Output is forwarded to
`console.log` / `console.warn` / `console.error` / `console.debug`, with a
fallback to `console.log` when `console.debug` is unavailable.

## How conditional resolution works

The `package.json` `exports` field declares three runtime conditions on the
`.` entry point:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "browser": "./dist/index.js",
      "node": "./dist/server.js",
      "default": "./dist/index.js"
    }
  }
}
```

| Bundler / runtime             | Picks                                    |
| ----------------------------- | ---------------------------------------- |
| Webpack / Next.js (server)    | `node` -> `./dist/server.js` (Pino)      |
| Webpack / Next.js (browser)   | `browser` -> `./dist/index.js` (console) |
| Vite, esbuild (server build)  | `node` -> `./dist/server.js`             |
| Vite, esbuild (browser build) | `browser` -> `./dist/index.js`           |
| Node REPL / scripts           | `node` -> `./dist/server.js`             |
| Edge runtimes                 | `default` -> `./dist/index.js`           |

If your tooling does not understand the `node` condition, it falls back to
`default` (the browser variant) — safe because the server variant is the
only one that pulls in Pino.

## Migration from `console.log`

```diff
- console.log('User logged in', { userId })
+ logger.info({ userId }, 'User logged in')

- console.warn('Slow query:', ms)
+ logger.warn({ ms }, 'Slow query')

- console.error('Crash:', err)
+ logger.error({ err }, 'Crash')

- if (process.env.NODE_ENV !== 'production') {
-   console.debug('trace', data)
- }
+ logger.debug(data, 'trace')
```

The `debug` / `info` calls are already production-gated on the browser
variant, so dropping the `NODE_ENV` guard is safe.

## Related

- [@ezstart/api-core](../api-core) — Express middleware that uses this
  package on the server side.
- [@ezstart/auth-sdk](../auth-sdk) — Accepts a `logger?: Logger` prop and
  re-exports the {@link Logger} type.
- [pino](https://github.com/pinojs/pino) — The Node-side backend.
- [pino-pretty](https://github.com/pinojs/pino-pretty) — Dev-only transport.
