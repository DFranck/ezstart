import pino, { type Logger as PinoLogger, type LoggerOptions, type DestinationStream } from 'pino'
import pretty from 'pino-pretty'

/**
 * Server-side logger powered by Pino.
 *
 * **Use this only on the server** (Node.js APIs, Next.js server components,
 * background scripts). For browser code, prefer the universal entry point
 * `@ezstart/logger` which auto-resolves to a console-based wrapper at
 * bundle time.
 *
 * @example
 * ```ts
 * import { logger } from '@ezstart/logger/server'
 *
 * logger.info({ port: 6100 }, 'Server started')
 * logger.error({ err }, 'Database error')
 * ```
 *
 * @packageDocumentation
 */

/**
 * Supported log levels (severity ordered low-to-high).
 *
 * @public
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Universal logger interface — same shape on browser and server variants.
 *
 * Each method accepts BOTH legacy `(message, data)` and Pino-native
 * `(data, message)` call signatures so consumers can mix styles freely.
 *
 * SDK packages that accept a `logger?: Logger` prop should re-export this
 * type rather than declare their own `LoggerLike` shape.
 *
 * @public
 */
export interface Logger {
  /** Verbose diagnostic information (filtered out in production by default). */
  debug: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  /** Routine operational events. */
  info: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  /** Recoverable problems that warrant attention. */
  warn: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  /** Error conditions — always logged at default levels. */
  error: (msgOrObj: string | object, dataOrMsg?: unknown) => void
}

/**
 * Default Pino options derived from environment variables.
 *
 * - `LOG_LEVEL` overrides the default level when set.
 * - In development (`NODE_ENV !== 'production'`), uses `pino-pretty` and
 *   defaults to `info`.
 * - In production, emits structured JSON and defaults to `warn`.
 *
 * @internal
 */
function defaultOptions(): LoggerOptions {
  const isDev = process.env.NODE_ENV !== 'production'
  return {
    level: process.env.LOG_LEVEL || (isDev ? 'info' : 'warn'),
  }
}

/**
 * Build the destination stream. In dev we attach `pino-pretty` SYNCHRONOUSLY
 * (no worker thread) — Next.js dev mode terminates worker threads between
 * requests, which crashes the worker-based `transport: { target: 'pino-pretty' }`
 * setup with `Error: the worker has exited`. Using `pino-pretty` as a sync
 * stream avoids the worker entirely while keeping the colorized output.
 *
 * @internal
 */
function defaultStream(): DestinationStream | undefined {
  const isDev = process.env.NODE_ENV !== 'production'
  if (!isDev) return undefined
  return pretty({
    colorize: true,
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'pid,hostname',
    sync: true,
  })
}

/**
 * Wrap a Pino instance behind the universal {@link Logger} interface.
 *
 * Exposed as a factory so callers (and tests) can substitute their own
 * Pino instance — useful for sinks, redaction, child loggers, or asserting
 * on log output without having to spy on `process.stdout`.
 *
 * @public
 *
 * @example
 * ```ts
 * import pino from 'pino'
 * import { createLogger } from '@ezstart/logger/server'
 *
 * const sink = pino({ level: 'debug' }, pino.destination('/var/log/app.log'))
 * const logger = createLogger(sink)
 * logger.info({ ready: true }, 'Booted')
 * ```
 */
export function createLogger(pinoInstance: PinoLogger): Logger {
  return {
    debug: (msgOrObj, dataOrMsg) => {
      if (typeof msgOrObj === 'string') {
        pinoInstance.debug((dataOrMsg as object) || {}, msgOrObj)
      } else {
        pinoInstance.debug(msgOrObj, dataOrMsg as string)
      }
    },
    info: (msgOrObj, dataOrMsg) => {
      if (typeof msgOrObj === 'string') {
        pinoInstance.info((dataOrMsg as object) || {}, msgOrObj)
      } else {
        pinoInstance.info(msgOrObj, dataOrMsg as string)
      }
    },
    warn: (msgOrObj, dataOrMsg) => {
      if (typeof msgOrObj === 'string') {
        pinoInstance.warn((dataOrMsg as object) || {}, msgOrObj)
      } else {
        pinoInstance.warn(msgOrObj, dataOrMsg as string)
      }
    },
    error: (msgOrObj, dataOrMsg) => {
      if (typeof msgOrObj === 'string') {
        pinoInstance.error((dataOrMsg as object) || {}, msgOrObj)
      } else {
        pinoInstance.error(msgOrObj, dataOrMsg as string)
      }
    },
  }
}

/**
 * Default Pino instance backing the package-level {@link logger}.
 *
 * Exported for advanced use cases (child loggers, redaction config) — most
 * consumers should use the {@link logger} singleton directly.
 *
 * @public
 */
export const pinoLogger: PinoLogger = (() => {
  const stream = defaultStream()
  return stream ? pino(defaultOptions(), stream) : pino(defaultOptions())
})()

/**
 * Universal logger instance — server variant.
 *
 * Wraps {@link pinoLogger} behind the {@link Logger} interface so the same
 * call signatures work on the server and the browser.
 *
 * Configuration lives entirely in environment variables:
 * - `LOG_LEVEL` — explicit level override (e.g. `debug`, `warn`)
 * - `NODE_ENV` — selects the default level (`info` dev, `warn` prod) and
 *   the transport (`pino-pretty` dev, JSON prod)
 *
 * @public
 *
 * @example
 * ```ts
 * import { logger } from '@ezstart/logger/server'
 *
 * logger.info({ userId: '123' }, 'User logged in')
 * logger.error({ err, paymentId }, 'Payment processing failed')
 * ```
 */
export const logger: Logger = createLogger(pinoLogger)

// ─── Deprecation helper ─────────────────────────────────────────────────────

const warnedDeprecations = new Set<string>()

/**
 * Server-side mirror of the browser `warnDeprecation` helper. Surfaces
 * deprecation notices ONCE per process (for SSR contexts and Node scripts).
 *
 * **Always** emits via Pino — including in production. Production warns are
 * intentional: once an error tracker / log sink consumes Pino output (Sentry,
 * Better Stack, Datadog, etc.), deprecated API usage becomes visible without
 * shipping a behavior change. A silent no-op would mean losing the signal in
 * the environment that matters most.
 *
 * Note that server-side has no toast notion — operators rely on the log line
 * being indexed and queryable.
 *
 * Use the browser variant (`@ezstart/logger`, no `/server` suffix) inside
 * `'use client'` components — it accepts an optional `toast` callback so the
 * dev sees a visible toast on navigation, in addition to the console warn.
 *
 * @public
 *
 * @example
 * ```ts
 * import { warnDeprecation } from '@ezstart/logger/server'
 *
 * export function legacyApiHandler() {
 *   warnDeprecation('legacyApiHandler', 'newApiHandler from @ezstart/api-core')
 *   // ...
 * }
 * ```
 */
export function warnDeprecation(name: string, replacement?: string): void {
  if (warnedDeprecations.has(name)) return
  warnedDeprecations.add(name)

  const message = replacement
    ? `[${name}] is deprecated. Use \`${replacement}\` instead.`
    : `[${name}] is deprecated.`

  // ALWAYS warn — including in production. This is intentional: an error
  // tracker / log sink hooked into Pino picks up deprecated API usage
  // without us shipping a behavior change. Silent no-op in prod would mean
  // losing the signal where it matters most.
  pinoLogger.warn({ deprecated: name, replacement }, `[DEPRECATED] ${message}`)
}
