/**
 * Browser-safe logger (no Pino dependency).
 *
 * **You should rarely import this file directly.** The package's `.` entry
 * point uses conditional `browser` / `node` exports to auto-resolve to the
 * right impl per runtime:
 *
 * - **Server bundle** (Next.js server components, API routes, scripts)
 *   resolves to `./server` (Pino, structured JSON).
 * - **Client bundle** (`'use client'` files compiled for the browser)
 *   resolves to this file (`./index`, console wrappers, no Pino).
 *
 * So `import { logger } from '@ezstart/logger'` works in both contexts
 * with zero runtime check on the consumer side. The bundler picks the
 * right variant at build time — Pino never ships to the client bundle.
 *
 * Use the explicit `@ezstart/logger/server` or `@ezstart/logger/client`
 * sub-paths only when you need to FORCE one impl regardless of context
 * (e.g. a Node-only script that must use Pino even in unusual bundler
 * setups).
 *
 * Filtering (this browser variant):
 * - `debug` / `info`: only log when `NODE_ENV !== 'production'`
 * - `warn` / `error`: always log
 *
 * @example
 * ```ts
 * import { logger } from '@ezstart/logger'
 *
 * // Both call signatures supported (Pino and legacy)
 * logger.info({ userId: '123' }, 'User clicked button')
 * logger.info('User clicked button', { userId: '123' })
 * logger.error({ err }, 'Payment failed')
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
 *
 * @example
 * ```ts
 * import { logger, type Logger } from '@ezstart/logger'
 *
 * function makeFoo(opts: { logger?: Logger } = {}) {
 *   const log = opts.logger ?? logger
 *   log.info({ ready: true }, 'foo initialized')
 * }
 * ```
 */
export interface Logger {
  /** Verbose diagnostic information (filtered out in production). */
  debug: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  /** Routine operational events (filtered out in production on the browser). */
  info: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  /** Recoverable problems that warrant attention. */
  warn: (msgOrObj: string | object, dataOrMsg?: unknown) => void
  /** Error conditions — always logged. */
  error: (msgOrObj: string | object, dataOrMsg?: unknown) => void
}

/**
 * Whether `info` / `debug` output is suppressed.
 *
 * Resolved once at module load from `process.env.NODE_ENV`. In environments
 * with no `process` (older browsers, edge runtimes), defaults to `dev`
 * (i.e. logs everything).
 *
 * @internal
 */
const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true

/**
 * Format and forward a log line to the underlying console method.
 *
 * Accepts both call signatures and emits a uniform `[LEVEL] message data?`
 * shape so dev tools can filter by level prefix easily.
 *
 * @internal
 */
function emit(
  consoleFn: (message: string, ...optional: unknown[]) => void,
  prefix: string,
  msgOrObj: string | object,
  dataOrMsg?: unknown
): void {
  if (typeof msgOrObj === 'string') {
    consoleFn(`${prefix} ${msgOrObj}`, dataOrMsg ?? '')
    return
  }
  consoleFn(`${prefix} ${String(dataOrMsg ?? '')}`, msgOrObj)
}

/**
 * Universal logger instance — browser variant.
 *
 * Uses `console.*` under the hood and filters `info` / `debug` in
 * production. See {@link Logger} for the type contract and call
 * signatures.
 *
 * @public
 *
 * @example
 * ```ts
 * import { logger } from '@ezstart/logger'
 *
 * logger.debug({ rendered: true }, 'Component mounted')
 * logger.warn('Slow render', { ms: 1200 })
 * logger.error({ err }, 'Failed to fetch user')
 * ```
 */
export const logger: Logger = {
  debug: (msgOrObj, dataOrMsg) => {
    if (!isDev) return
    // `console.debug` is missing on a few legacy/edge runtimes — fall back to log.
    if (typeof console.debug === 'function') {
      emit((m, ...rest) => console.debug(m, ...rest), '[DEBUG]', msgOrObj, dataOrMsg)
    } else {
      emit((m, ...rest) => console.log(m, ...rest), '[DEBUG]', msgOrObj, dataOrMsg)
    }
  },
  info: (msgOrObj, dataOrMsg) => {
    if (!isDev) return
    emit((m, ...rest) => console.log(m, ...rest), '[INFO]', msgOrObj, dataOrMsg)
  },
  warn: (msgOrObj, dataOrMsg) => {
    emit((m, ...rest) => console.warn(m, ...rest), '[WARN]', msgOrObj, dataOrMsg)
  },
  error: (msgOrObj, dataOrMsg) => {
    emit((m, ...rest) => console.error(m, ...rest), '[ERROR]', msgOrObj, dataOrMsg)
  },
}

// ─── Deprecation helper ─────────────────────────────────────────────────────

/** Tracks the deprecation messages already shown to dedupe across re-renders. */
const warnedDeprecations = new Set<string>()

/**
 * Surface a deprecation notice ONCE per session.
 *
 * In dev :
 * - Emits a `console.warn` with `[DEPRECATED]` prefix
 * - If `options.toast` is provided, calls it (consumer wires `toast.warning`
 *   from `sonner` so the dev sees a visible toast on navigation)
 *
 * In production : silent no-op (zero runtime cost — the early NODE_ENV check
 * is statically dead-code-eliminated by modern bundlers).
 *
 * @param name        Component / API path being deprecated (e.g. `'ClientLayout'`)
 * @param replacement Optional. The replacement to point at (e.g. `'AppShell from @ezstart/ui'`)
 * @param options     `{ toast }` lets the caller route the message through any
 *                    user-facing toast library without coupling the logger to it.
 *
 * @example In a deprecated component
 * ```ts
 * import { warnDeprecation } from '@ezstart/logger'
 * import { toast } from 'sonner'
 *
 * export function ClientLayout(props) {
 *   if (typeof window !== 'undefined') {
 *     warnDeprecation('ClientLayout', 'AppShell from @ezstart/ui', {
 *       toast: (msg) => toast.warning(msg),
 *     })
 *   }
 *   // ...
 * }
 * ```
 *
 * @public
 */
export function warnDeprecation(
  name: string,
  replacement?: string,
  options?: { toast?: (message: string) => void }
): void {
  if (!isDev) return
  if (warnedDeprecations.has(name)) return
  warnedDeprecations.add(name)

  const message = replacement
    ? `[${name}] is deprecated. Use \`${replacement}\` instead.`
    : `[${name}] is deprecated.`

  // Direct console.warn (not logger.warn) so the prefix is `[DEPRECATED]`
  // instead of `[WARN]` — easier to filter in DevTools.
  if (typeof console.warn === 'function') {
    console.warn(`[DEPRECATED] ${message}`)
  }

  options?.toast?.(message)
}
